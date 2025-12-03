<?php

namespace App\Http\Controllers\Api\Organisation;

use App\Http\Controllers\Controller;
use App\Models\OrganisationSubscription;
use App\Models\Plan;
use App\Services\OrganisationSaasSubscriptionService;
use App\Services\SubscriptionAuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Stripe\Exception\ApiErrorException;
use Symfony\Component\HttpFoundation\Response;

class SubscriptionController extends Controller
{
    public function __construct(
        private readonly OrganisationSaasSubscriptionService $subscriptionService,
        private readonly SubscriptionAuditService $auditService
    ) {
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
                'latest_checkout_session_id' => $subscription->latest_checkout_session_id,
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

        // Log user action
        $this->auditService->logUserAction(
            $organisation,
            $admin,
            'subscription_started',
            "User started subscription checkout for plan: {$plan->name}",
            ['plan_id' => $plan->id, 'plan_name' => $plan->name]
        );

        return response()->json([
            'checkout_url' => $session->url,
        ]);
    }

    public function cancel(Request $request): JsonResponse
    {
        $admin = $request->user()->loadMissing('organisation');
        $organisation = $admin->organisation;

        if (! $organisation) {
            return response()->json([
                'message' => __('Geen organisatie gekoppeld aan deze gebruiker.'),
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $subscription = $organisation->currentSubscription;

        if (! $subscription || ! $subscription->stripe_subscription_id) {
            return response()->json([
                'message' => __('Geen actief abonnement gevonden.'),
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $oldPlan = $subscription->plan ? [
            'id' => $subscription->plan->id,
            'name' => $subscription->plan->name,
            'monthly_price' => (float) $subscription->plan->monthly_price,
        ] : null;

        try {
            $this->subscriptionService->cancelSubscription($subscription);

            // Log plan change
            $this->auditService->logPlanChange(
                $organisation,
                $admin,
                'cancel',
                $oldPlan,
                null,
                "Subscription cancelled by user {$admin->email}",
                ['stripe_subscription_id' => $subscription->stripe_subscription_id]
            );

            return response()->json([
                'message' => __('Abonnement is geannuleerd. Het blijft actief tot het einde van de huidige periode.'),
            ]);
        } catch (ApiErrorException $exception) {
            Log::error('Stripe subscription cancellation failed', [
                'organisation_id' => $organisation->id,
                'subscription_id' => $subscription->id,
                'error' => $exception->getMessage(),
            ]);

            return response()->json([
                'message' => __('Het annuleren van het abonnement is mislukt. Probeer het later opnieuw.'),
            ], Response::HTTP_BAD_GATEWAY);
        }
    }

    public function upgrade(Request $request): JsonResponse
    {
        return $this->changePlan($request, 'upgrade');
    }

    public function downgrade(Request $request): JsonResponse
    {
        return $this->changePlan($request, 'downgrade');
    }

    private function changePlan(Request $request, string $action): JsonResponse
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
        ]);

        $subscription = $organisation->currentSubscription;

        if (! $subscription || ! $subscription->stripe_subscription_id) {
            return response()->json([
                'message' => __('Geen actief abonnement gevonden.'),
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $newPlan = Plan::query()
            ->whereKey($validated['plan_id'])
            ->where('is_active', true)
            ->firstOrFail();

        if (! $newPlan->stripe_price_id) {
            return response()->json([
                'message' => __('Het geselecteerde abonnement heeft geen Stripe prijs-ID.'),
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $oldPlan = $subscription->plan ? [
            'id' => $subscription->plan->id,
            'name' => $subscription->plan->name,
            'monthly_price' => (float) $subscription->plan->monthly_price,
        ] : null;

        $newPlanData = [
            'id' => $newPlan->id,
            'name' => $newPlan->name,
            'monthly_price' => (float) $newPlan->monthly_price,
        ];

        try {
            $this->subscriptionService->changePlan($subscription, $newPlan);

            // Log plan change
            $oldPlanName = $oldPlan['name'] ?? 'Geen plan';
            $this->auditService->logPlanChange(
                $organisation,
                $admin,
                $action,
                $oldPlan,
                $newPlanData,
                "Plan {$action}d from {$oldPlanName} to {$newPlan->name} by user {$admin->email}",
                [
                    'stripe_subscription_id' => $subscription->stripe_subscription_id,
                    'old_plan_id' => $oldPlan['id'] ?? null,
                    'new_plan_id' => $newPlan->id,
                ]
            );

            return response()->json([
                'message' => __("Plan succesvol {$action}d naar {$newPlan->name}."),
            ]);
        } catch (ApiErrorException $exception) {
            Log::error("Stripe subscription plan {$action} failed", [
                'organisation_id' => $organisation->id,
                'subscription_id' => $subscription->id,
                'new_plan_id' => $newPlan->id,
                'error' => $exception->getMessage(),
            ]);

            return response()->json([
                'message' => __("Het {$action}en van het abonnement is mislukt. Probeer het later opnieuw."),
            ], Response::HTTP_BAD_GATEWAY);
        }
    }

    public function auditLogs(Request $request): JsonResponse
    {
        $admin = $request->user()->loadMissing('organisation');
        $organisation = $admin->organisation;

        if (! $organisation) {
            return response()->json([
                'message' => __('Geen organisatie gekoppeld aan deze gebruiker.'),
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $logs = $organisation->subscriptionAuditLogs()
            ->with('user:id,name,email')
            ->orderByDesc('created_at')
            ->paginate(50);

        $data = $logs->getCollection()
            ->map(fn ($log) => [
                'id' => $log->id,
                'action_type' => $log->action_type,
                'description' => $log->description,
                'old_value' => $log->old_value,
                'new_value' => $log->new_value,
                'metadata' => $log->metadata,
                'user' => $log->user ? [
                    'id' => $log->user->id,
                    'name' => $log->user->name,
                    'email' => $log->user->email,
                ] : null,
                'created_at' => $log->created_at?->toIso8601String(),
            ])
            ->values()
            ->all();

        return response()->json([
            'data' => $data,
            'meta' => [
                'current_page' => $logs->currentPage(),
                'last_page' => $logs->lastPage(),
                'per_page' => $logs->perPage(),
                'total' => $logs->total(),
            ],
        ]);
    }
}
