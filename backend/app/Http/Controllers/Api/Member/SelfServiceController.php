<?php

namespace App\Http\Controllers\Api\Member;

use App\Http\Controllers\Controller;
use App\Http\Requests\Member\UpdateProfileRequest;
use App\Models\MemberContributionRecord;
use App\Models\MemberSubscription;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SelfServiceController extends Controller
{
    public function profile(Request $request): JsonResponse
    {
        [$user, $member] = $this->resolveContext($request);
        $member->loadMissing('organisation');

        return response()->json([
            'data' => $this->transformProfile($user, $member),
        ]);
    }

    public function updateProfile(UpdateProfileRequest $request): JsonResponse
    {
        [$user, $member] = $this->resolveContext($request);

        $data = $request->validated();

        if (isset($data['email']) && $data['email'] !== $user->email) {
            $user->email = $data['email'];
        }

        $user->save();

        $member->fill([
            'street_address' => $data['street_address'] ?? $member->street_address,
            'postal_code' => $data['postal_code'] ?? $member->postal_code,
            'city' => $data['city'] ?? $member->city,
            'phone' => $data['phone'] ?? $member->phone,
            'iban' => $data['iban'] ?? $member->iban,
        ]);

        $member->save();

        $member->refresh()->loadMissing('organisation');

        return response()->json([
            'data' => $this->transformProfile($user->refresh(), $member),
        ]);
    }

    public function contribution(Request $request): JsonResponse
    {
        [, $member] = $this->resolveContext($request);

        // Check voor actieve subscription eerst
        $activeSubscription = MemberSubscription::query()
            ->where('member_id', $member->id)
            ->where('status', 'active')
            ->latest()
            ->first();

        // Als er een actieve subscription is, gebruik die gegevens
        if ($activeSubscription) {
            $startDate = $activeSubscription->current_period_start 
                ?? $activeSubscription->created_at 
                ?? now();
            
            return response()->json([
                'data' => [
                    'contribution_amount' => $activeSubscription->amount,
                    'contribution_frequency' => 'Maandelijks',
                    'contribution_start_date' => $startDate->toDateString(),
                    'contribution_note' => 'Automatische incasso via Stripe',
                    'has_subscription' => true,
                ],
            ]);
        }

        // Anders gebruik de handmatig ingevulde contributieafspraak
        return response()->json([
            'data' => [
                'contribution_amount' => $member->contribution_amount,
                'contribution_frequency' => $member->contribution_frequency,
                'contribution_start_date' => $member->contribution_start_date?->toDateString(),
                'contribution_note' => $member->contribution_note,
                'has_subscription' => false,
            ],
        ]);
    }

    public function contributionHistory(Request $request): JsonResponse
    {
        [, $member] = $this->resolveContext($request);

        $records = MemberContributionRecord::query()
            ->where('member_id', $member->id)
            ->orderByDesc('period')
            ->orderByDesc('created_at')
            ->get();

        return response()->json([
            'data' => $records->map(function (MemberContributionRecord $record) {
                return [
                    'id' => $record->id,
                    'period' => $record->period?->translatedFormat('F Y'),
                    'period_iso' => $record->period?->toDateString(),
                    'amount' => $record->amount,
                    'status' => $record->status,
                    'note' => $record->note,
                    'created_at' => $record->created_at?->toIso8601String(),
                    'updated_at' => $record->updated_at?->toIso8601String(),
                ];
            }),
        ]);
    }

    public function subscription(Request $request): JsonResponse
    {
        [, $member] = $this->resolveContext($request);

        $subscription = MemberSubscription::query()
            ->where('member_id', $member->id)
            ->where('status', 'active')
            ->latest()
            ->first();

        if (! $subscription) {
            return response()->json([
                'data' => null,
            ]);
        }

        return response()->json([
            'data' => [
                'amount' => $subscription->amount,
                'currency' => $subscription->currency,
                'status' => $subscription->status,
            ],
        ]);
    }

    /**
     * @return array{0:\App\Models\User,1:\App\Models\Member}
     */
    private function resolveContext(Request $request): array
    {
        $user = $request->user();

        if (! $user) {
            abort(403, 'Gebruiker niet geauthenticeerd.');
        }

        if (! $user->member_id) {
            abort(403, 'Geen lid gevonden voor deze gebruiker.');
        }

        // Laad de member relatie expliciet
        $user->loadMissing('member');
        $member = $user->member;

        if (! $member) {
            abort(404, 'Lid niet gevonden voor deze gebruiker.');
        }

        return [$user, $member];
    }

    private function transformProfile($user, $member): array
    {
        return [
            'user' => [
                'id' => $user->id,
                'email' => $user->email,
                'status' => $user->status,
            ],
            'member' => [
                'id' => $member->id,
                'first_name' => $member->first_name,
                'last_name' => $member->last_name,
                'birth_date' => $member->birth_date?->toDateString(),
                'street_address' => $member->street_address,
                'postal_code' => $member->postal_code,
                'city' => $member->city,
                'phone' => $member->phone,
                'iban' => $member->iban,
                'email' => $user->email,
            ],
            'organisation' => [
                'id' => $member->organisation?->id,
                'name' => $member->organisation?->name,
            ],
        ];
    }
}


