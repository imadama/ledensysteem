<?php

namespace App\Http\Controllers\Api\Organisation;

use App\Http\Controllers\Controller;
use App\Models\Member;
use App\Models\MemberContributionRecord;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Symfony\Component\HttpFoundation\Response;

class MonitorController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        
        if (! $user) {
            abort(Response::HTTP_UNAUTHORIZED, __('Niet geauthenticeerd.'));
        }
        
        // Check of gebruiker monitor of org_admin rol heeft
        if (! $user->hasRole('monitor') && ! $user->hasRole('org_admin')) {
            abort(Response::HTTP_FORBIDDEN, __('Geen toegang tot monitor pagina. Je hebt de monitor of org_admin rol nodig.'));
        }
        
        $organisationId = $user->organisation_id;

        if (! $organisationId) {
            abort(Response::HTTP_FORBIDDEN, __('Geen organisatiecontext beschikbaar. Je account is niet gekoppeld aan een organisatie.'));
        }

        $validated = $request->validate([
            'year' => ['sometimes', 'integer', 'min:2000', 'max:2100'],
        ]);

        $year = $validated['year'] ?? Carbon::now()->year;
        
        // Convert show_amounts to boolean (can be '1', '0', true, false, 'true', 'false')
        $showAmounts = false;
        $showAmountsParam = $request->input('show_amounts');
        if ($showAmountsParam !== null) {
            if (is_bool($showAmountsParam)) {
                $showAmounts = $showAmountsParam;
            } elseif (is_string($showAmountsParam)) {
                $showAmounts = in_array(strtolower($showAmountsParam), ['1', 'true', 'yes'], true);
            } elseif (is_numeric($showAmountsParam)) {
                $showAmounts = (bool) $showAmountsParam;
            }
        }

        // Haal alle actieve members op
        $members = Member::query()
            ->where('organisation_id', $organisationId)
            ->where('status', 'active')
            ->orderBy('last_name')
            ->orderBy('first_name')
            ->get();

        // Haal alle contributie records op voor dit jaar (inclusief contributies zonder period)
        $contributions = MemberContributionRecord::query()
            ->with(['paymentTransaction'])
            ->join('members', 'members.id', '=', 'member_contribution_records.member_id')
            ->where('members.organisation_id', $organisationId)
            ->where(function ($query) use ($year) {
                $query->whereYear('member_contribution_records.period', $year)
                    ->orWhereNull('member_contribution_records.period');
            })
            ->select('member_contribution_records.*')
            ->get()
            ->groupBy('member_id');

        // Bouw de monitor data
        $membersData = $members->map(function (Member $member) use ($contributions, $year, $showAmounts) {
            $memberContributions = $contributions->get($member->id, collect());
            $months = [];

            // Voor elke maand (1-12) bepaal de status
            for ($month = 1; $month <= 12; $month++) {
                // Zoek contributie voor deze maand
                $contribution = $memberContributions->first(function ($record) use ($year, $month) {
                    // Als er geen period is, gebruik de betalingsdatum of created_at om te bepalen in welke maand
                    if (! $record->period) {
                        $record->loadMissing('paymentTransaction');
                        $dateToUse = null;

                        // Probeer eerst de betalingsdatum
                        if ($record->paymentTransaction && $record->paymentTransaction->occurred_at) {
                            $dateToUse = $record->paymentTransaction->occurred_at;
                        } elseif ($record->created_at) {
                            // Fallback naar created_at
                            $dateToUse = $record->created_at;
                        }

                        if ($dateToUse) {
                            return $dateToUse->year === $year && $dateToUse->month === $month;
                        }

                        // Als er helemaal geen datum is, toon alleen in huidige maand
                        $currentMonth = now()->month;
                        $currentYear = now()->year;
                        return $month === $currentMonth && $year === $currentYear;
                    }

                    // $record->period is al een Carbon instance door de cast
                    return $record->period->year === $year && $record->period->month === $month;
                });

                if ($contribution) {
                    $contribution->loadMissing('paymentTransaction');
                    $monthData = [
                        'status' => $contribution->status,
                    ];

                    if ($showAmounts && $contribution->amount !== null) {
                        $monthData['amount'] = (float) $contribution->amount;
                    }

                    $months[(string) $month] = $monthData;
                } else {
                    // Geen contributie record voor deze maand
                    $months[(string) $month] = null;
                }
            }

            return [
                'id' => $member->id,
                'first_name' => $member->first_name,
                'last_name' => $member->last_name,
                'months' => $months,
            ];
        })->values();

        return response()->json([
            'year' => (int) $year,
            'members' => $membersData,
        ]);
    }
}

