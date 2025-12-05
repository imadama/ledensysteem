<?php

namespace App\Http\Controllers\Api\Organisation;

use App\Http\Controllers\Controller;
use App\Http\Requests\Organisation\SetupSepaSubscriptionRequest;
use App\Models\Member;
use App\Services\MemberSepaSubscriptionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use Stripe\Exception\ApiErrorException;
use Symfony\Component\HttpFoundation\Response;

class MemberSepaSubscriptionController extends Controller
{
    public function __construct(
        private readonly MemberSepaSubscriptionService $sepaSubscriptionService
    ) {
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $admin = $request->user();
        $member = Member::query()
            ->where('organisation_id', $admin->organisation_id)
            ->findOrFail($id);

        $subscription = $member->activeSubscription;

        $data = [
            'enabled' => $member->sepa_subscription_enabled,
            'iban' => $member->sepa_subscription_iban ?? $member->iban,
            'mandate_stripe_id' => $member->sepa_mandate_stripe_id,
            'notes' => $member->sepa_subscription_notes,
            'setup_at' => $member->sepa_subscription_setup_at?->toIso8601String(),
            'setup_by' => $member->sepaSubscriptionSetupBy ? [
                'id' => $member->sepaSubscriptionSetupBy->id,
                'name' => $member->sepaSubscriptionSetupBy->name,
            ] : null,
        ];

        if ($subscription) {
            $data['subscription'] = [
                'id' => $subscription->id,
                'amount' => (float) $subscription->amount,
                'currency' => $subscription->currency,
                'status' => $subscription->status,
                'stripe_subscription_id' => $subscription->stripe_subscription_id,
                'current_period_start' => $subscription->current_period_start?->toIso8601String(),
                'current_period_end' => $subscription->current_period_end?->toIso8601String(),
            ];
        } else {
            $data['subscription'] = null;
        }

        return response()->json($data);
    }

    public function setup(SetupSepaSubscriptionRequest $request, int $id): JsonResponse
    {
        $admin = $request->user();
        $member = Member::query()
            ->where('organisation_id', $admin->organisation_id)
            ->findOrFail($id);

        try {
            $subscription = $this->sepaSubscriptionService->setupSepaSubscription(
                $admin,
                $member,
                (float) $request->validated('amount'),
                $request->validated('iban'),
                $request->validated('description'),
                $request->validated('notes')
            );

            return response()->json([
                'message' => __('Automatische SEPA incasso succesvol opgezet.'),
                'subscription' => [
                    'id' => $subscription->id,
                    'amount' => (float) $subscription->amount,
                    'status' => $subscription->status,
                ],
            ], Response::HTTP_CREATED);
        } catch (ValidationException $e) {
            return response()->json([
                'message' => __('Kon automatische incasso niet opzetten.'),
                'errors' => $e->errors(),
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        } catch (ApiErrorException $e) {
            Log::error('Stripe SEPA subscription setup failed', [
                'member_id' => $member->id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'message' => __('Kon automatische incasso niet opzetten. Stripe fout: :error', ['error' => $e->getMessage()]),
            ], Response::HTTP_BAD_GATEWAY);
        }
    }

    public function disable(Request $request, int $id): JsonResponse
    {
        $admin = $request->user();
        $member = Member::query()
            ->where('organisation_id', $admin->organisation_id)
            ->findOrFail($id);

        $validated = $request->validate([
            'reason' => ['nullable', 'string', 'max:500'],
        ]);

        try {
            $this->sepaSubscriptionService->disableSepaSubscription(
                $admin,
                $member,
                $validated['reason'] ?? null
            );

            return response()->json([
                'message' => __('Automatische incasso is uitgeschakeld.'),
            ]);
        } catch (ValidationException $e) {
            return response()->json([
                'message' => __('Kon automatische incasso niet uitschakelen.'),
                'errors' => $e->errors(),
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        } catch (ApiErrorException $e) {
            Log::error('Stripe SEPA subscription disable failed', [
                'member_id' => $member->id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'message' => __('Kon automatische incasso niet uitschakelen. Stripe fout: :error', ['error' => $e->getMessage()]),
            ], Response::HTTP_BAD_GATEWAY);
        }
    }

    public function updateAmount(Request $request, int $id): JsonResponse
    {
        $admin = $request->user();
        $member = Member::query()
            ->where('organisation_id', $admin->organisation_id)
            ->findOrFail($id);

        $validated = $request->validate([
            'amount' => ['required', 'numeric', 'min:0.01'],
        ]);

        try {
            $subscription = $this->sepaSubscriptionService->updateSepaSubscriptionAmount(
                $member,
                (float) $validated['amount']
            );

            return response()->json([
                'message' => __('Incasso bedrag is bijgewerkt.'),
                'subscription' => [
                    'id' => $subscription->id,
                    'amount' => (float) $subscription->amount,
                ],
            ]);
        } catch (ValidationException $e) {
            return response()->json([
                'message' => __('Kon incasso bedrag niet bijwerken.'),
                'errors' => $e->errors(),
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        } catch (ApiErrorException $e) {
            Log::error('Stripe SEPA subscription amount update failed', [
                'member_id' => $member->id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'message' => __('Kon incasso bedrag niet bijwerken. Stripe fout: :error', ['error' => $e->getMessage()]),
            ], Response::HTTP_BAD_GATEWAY);
        }
    }
}
