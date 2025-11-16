<?php

namespace App\Http\Controllers\Api\Organisation;

use App\Http\Controllers\Controller;
use App\Models\OrganisationSubscription;
use App\Models\Plan;
use App\Services\OrganisationSaasSubscriptionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Stripe\Exception\ApiErrorException;
use Symfony\Component\HttpFoundation\Response;

class SubscriptionController extends Controller
{
    public function __construct(private readonly OrganisationSaasSubscriptionService $subscriptionService)
    {
    }

    public function start(Request $request): JsonResponse
    {
        $admin = $request->user()->loadMissing('organisation');
        $organisation = $admin->organisation;

        if (! $organisation) {
            return response()->json([
                'message' => __('Geen organisatie gekoppeld aan deze gebruiker.'),
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $validated = $request->validate([
            'plan_id' => ['required', 'integer', 'exists:plans,id'],
            'success_url' => ['required', 'url'],
            'cancel_url' => ['required', 'url'],
        ]);

        $plan = Plan::query()
            ->whereKey($validated['plan_id'])
            ->where('is_active', true)
            ->firstOrFail();

        if (! $plan->stripe_price_id) {
            return response()->json([
                'message' => __('Het geselecteerde abonnement heeft geen Stripe prijs-ID.'),
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        /** @var OrganisationSubscription $subscription */
        $subscription = OrganisationSubscription::query()
            ->where('organisation_id', $organisation->id)
            ->latest('created_at')
            ->first();

        if (! $subscription) {
            $subscription = new OrganisationSubscription([
                'organisation_id' => $organisation->id,
            ]);
        }

        try {
            $session = $this->subscriptionService->startCheckoutSession(
                $subscription,
                $organisation,
                $plan,
                $validated['success_url'],
                $validated['cancel_url']
            );
        } catch (ApiErrorException $exception) {
            Log::error('Stripe subscription checkout creation failed', [
                'organisation_id' => $organisation->id,
                'plan_id' => $plan->id,
                'error' => $exception->getMessage(),
            ]);

            return response()->json([
                'message' => __('Het opstarten van de abonnement-checkout is mislukt. Probeer het later opnieuw.'),
                'errors' => [
                    'stripe' => [$exception->getMessage()],
                ],
            ], Response::HTTP_BAD_GATEWAY);
        }

        return response()->json([
            'checkout_url' => $session->url,
        ]);
    }
}
