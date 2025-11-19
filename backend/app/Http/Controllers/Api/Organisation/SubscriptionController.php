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

    public function show(Request $request): JsonResponse
    {
        $admin = $request->user()->loadMissing('organisation');
        $organisation = $admin->organisation;

        if (! $organisation) {
            return response()->json([
                'message' => __('Geen organisatie gekoppeld aan deze gebruiker.'),
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $subscription = $organisation->currentSubscription;

        if (! $subscription) {
            return response()->json([
                'subscription' => null,
            ]);
        }

        $subscription->loadMissing('plan');

        return response()->json([
            'subscription' => [
                'plan' => $subscription->plan ? [
                    'id' => $subscription->plan->id,
                    'name' => $subscription->plan->name,
                ] : null,
                'status' => $subscription->status,
                'current_period_start' => $subscription->current_period_start?->toIso8601String(),
                'current_period_end' => $subscription->current_period_end?->toIso8601String(),
                'stripe_subscription_id' => $subscription->stripe_subscription_id,
            ],
        ]);
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
            // Stripe vereist hier vaak een placeholder {CHECKOUT_SESSION_ID}, wat niet door Laravel's "url"-rule komt.
            // Daarom staan we hier een generieke string toe en gaan we ervan uit dat de frontend een volledige URL aanlevert.
            'success_url' => ['required', 'string', 'max:2048'],
            'cancel_url' => ['required', 'string', 'max:2048'],
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
            $errorMessage = $exception->getMessage();
            
            // Probeer Stripe error details te krijgen als beschikbaar
            $stripeErrorType = null;
            $stripeErrorCode = null;
            $stripeDeclineCode = null;
            
            if (method_exists($exception, 'getStripeError')) {
                $stripeError = $exception->getStripeError();
                $stripeErrorType = $stripeError?->type ?? null;
                $stripeErrorCode = $stripeError?->code ?? null;
                $stripeDeclineCode = $stripeError?->decline_code ?? null;
            }
            
            // Als er geen getStripeError() is, probeer dan via getJsonBody()
            if (!$stripeErrorType && method_exists($exception, 'getJsonBody')) {
                $jsonBody = $exception->getJsonBody();
                $stripeErrorType = $jsonBody['error']['type'] ?? null;
                $stripeErrorCode = $jsonBody['error']['code'] ?? null;
                $stripeDeclineCode = $jsonBody['error']['decline_code'] ?? null;
            }
            
            Log::error('Stripe subscription checkout creation failed', [
                'organisation_id' => $organisation->id,
                'plan_id' => $plan->id,
                'plan_stripe_price_id' => $plan->stripe_price_id,
                'error' => $errorMessage,
                'stripe_error_type' => $stripeErrorType,
                'stripe_error_code' => $stripeErrorCode,
                'stripe_decline_code' => $stripeDeclineCode,
                'exception_class' => get_class($exception),
            ]);

            return response()->json([
                'message' => __('Het opstarten van de abonnement-checkout is mislukt. Probeer het later opnieuw.'),
                'errors' => [
                    'stripe' => [$errorMessage],
                ],
            ], Response::HTTP_BAD_GATEWAY);
        }

        return response()->json([
            'checkout_url' => $session->url,
        ]);
    }
}
