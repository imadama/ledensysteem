<?php

namespace App\Http\Controllers\Api\Organisation;

use App\Http\Controllers\Controller;
use App\Models\Member;
use App\Models\MemberContributionRecord;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

class ContributionReportController extends Controller
{
    public function memberContributions(Request $request, int $memberId): JsonResponse
    {
        $admin = $request->user();
        $organisationId = $admin->organisation_id;

        if (! $organisationId) {
            abort(Response::HTTP_FORBIDDEN, __('Geen organisatiecontext beschikbaar.'));
        }

        $member = Member::query()
            ->where('organisation_id', $organisationId)
            ->findOrFail($memberId);

        $perPage = min($request->integer('per_page', 25), 100);

        /** @var LengthAwarePaginator $contributions */
        $contributions = MemberContributionRecord::query()
            ->with(['paymentTransaction'])
            ->where('member_id', $member->id)
            ->orderByDesc('period')
            ->orderByDesc('created_at')
            ->paginate($perPage);

        $data = $contributions->getCollection()->map(function (MemberContributionRecord $record) {
            $payment = $record->paymentTransaction;

            return [
                'id' => $record->id,
                'period' => $record->period?->format('Y-m'),
                'amount' => $record->amount !== null ? (float) $record->amount : null,
                'status' => $record->status,
                'payment' => $payment ? [
                    'transaction_id' => $payment->id,
                    'status' => $payment->status,
                    'type' => $payment->type,
                    'date' => $payment->occurred_at?->toIso8601String(),
                ] : null,
            ];
        })->values();

        return response()->json([
            'data' => $data,
            'meta' => [
                'current_page' => $contributions->currentPage(),
                'last_page' => $contributions->lastPage(),
                'per_page' => $contributions->perPage(),
                'total' => $contributions->total(),
            ],
        ]);
    }

    public function organisationSummary(Request $request): JsonResponse
    {
        $admin = $request->user();
        $organisationId = $admin->organisation_id;

        if (! $organisationId) {
            abort(Response::HTTP_FORBIDDEN, __('Geen organisatiecontext beschikbaar.'));
        }

        $validated = $request->validate([
            'year' => ['sometimes', 'integer', 'min:2000', 'max:2100'],
            'month' => ['sometimes', 'integer', 'between:1,12'],
        ]);

        $year = $validated['year'] ?? Carbon::now()->year;
        $month = $validated['month'] ?? null;

        $baseQuery = MemberContributionRecord::query()
            ->join('members', 'members.id', '=', 'member_contribution_records.member_id')
            ->where('members.organisation_id', $organisationId)
            ->whereNotNull('member_contribution_records.period')
            ->whereYear('member_contribution_records.period', $year);

        $select = [
            DB::raw('YEAR(member_contribution_records.period) as year'),
            DB::raw('MONTH(member_contribution_records.period) as month'),
            DB::raw('COALESCE(SUM(CASE WHEN member_contribution_records.status = "paid" THEN member_contribution_records.amount ELSE 0 END), 0) as total_received'),
            DB::raw('COUNT(DISTINCT CASE WHEN member_contribution_records.status = "paid" THEN member_contribution_records.member_id END) as paid_members'),
            DB::raw('COUNT(DISTINCT CASE WHEN member_contribution_records.status = "open" THEN member_contribution_records.member_id END) as members_with_open'),
        ];

        if ($month !== null) {
            $row = (clone $baseQuery)
                ->whereMonth('member_contribution_records.period', $month)
                ->select($select)
                ->first();

            if (! $row) {
                return response()->json([
                    'year' => (int) $year,
                    'month' => (int) $month,
                    'total_received' => 0.0,
                    'paid_members' => 0,
                    'members_with_open' => 0,
                ]);
            }

            return response()->json([
                'year' => (int) $year,
                'month' => (int) $month,
                'total_received' => (float) $row->total_received,
                'paid_members' => (int) $row->paid_members,
                'members_with_open' => (int) $row->members_with_open,
            ]);
        }

        $rows = $baseQuery
            ->select($select)
            ->groupBy(DB::raw('YEAR(member_contribution_records.period)'), DB::raw('MONTH(member_contribution_records.period)'))
            ->orderBy(DB::raw('MONTH(member_contribution_records.period)'))
            ->get();

        $months = $rows->map(function ($row) {
            return [
                'month' => (int) $row->month,
                'total_received' => (float) $row->total_received,
                'paid_members' => (int) $row->paid_members,
                'members_with_open' => (int) $row->members_with_open,
            ];
        })->values();

        return response()->json([
            'year' => (int) $year,
            'months' => $months,
        ]);
    }
}
