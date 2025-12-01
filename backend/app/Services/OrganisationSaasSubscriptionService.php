<?php

namespace App\Services;

use App\Models\Organisation;
use App\Models\OrganisationSubscription;
use App\Models\Plan;
use Illuminate\Support\Str;
use Stripe\Checkout\Session;
use Stripe\Exception\ApiErrorException;
use Stripe\StripeClient;

class OrganisationSaasSubscriptionService
{
    public function __construct(private readonly StripeClient $stripe)
    {
    }

    /**
     * @throws ApiErrorException
     */
    public function startCheckoutSession(
        OrganisationSubscription $subscription,
        Organisation $organisation,
        Plan $plan,
        string $successUrl,
        string $cancelUrl
    ): Session {
        $subscription->organisation_id = $organisation->id;
        $subscription->plan_id = $plan->id;

        if (! $subscription->stripe_customer_id) {
            $customer = $this->stripe->customers->create([
                'name' => $organisation->name,
                'email' => $organisation->contact_email ?: $organisation->users()->orderBy('created_at')->value('email'),
                'metadata' => [
                    'organisation_id' => (string) $organisation->id,
                ],
            ]);

            $subscription->stripe_customer_id = $customer->id;
        }

        $subscription->status = 'incomplete';
        $subscription->save();

        $successUrl = $this->appendSessionPlaceholder($successUrl);
        $cancelUrl = $this->appendSessionPlaceholder($cancelUrl);

        $clientReferenceId = 'org_sub:'.$subscription->id;

        $session = $this->stripe->checkout->sessions->create([
            'mode' => 'subscription',
            'customer' => $subscription->stripe_customer_id,
            'success_url' => $successUrl,
            'cancel_url' => $cancelUrl,
            'line_items' => [[
                'price' => $plan->stripe_price_id,
                'quantity' => 1,
            ]],
            'client_reference_id' => $clientReferenceId,
            'metadata' => [
                'organisation_id' => (string) $organisation->id,
                'organisation_subscription_id' => (string) $subscription->id,
            ],
            'subscription_data' => [
                'metadata' => [
                    'organisation_id' => (string) $organisation->id,
                    'organisation_subscription_id' => (string) $subscription->id,
                ],
            ],
        ]);

        $subscription->latest_checkout_session_id = $session->id;
        $subscription->save();

        return $session;
    }

    /**
     * @throws ApiErrorException
     */
    public function cancelSubscription(OrganisationSubscription $subscription): void
    {
        if (! $subscription->stripe_subscription_id) {
            throw new \RuntimeException('Subscription has no Stripe subscription ID');
        }

        $this->stripe->subscriptions->cancel($subscription->stripe_subscription_id);
    }

    /**
     * @throws ApiErrorException
     */
    public function changePlan(OrganisationSubscription $subscription, Plan $newPlan): void
    {
        if (! $subscription->stripe_subscription_id) {
            throw new \RuntimeException('Subscription has no Stripe subscription ID');
        }

        if (! $newPlan->stripe_price_id) {
            throw new \RuntimeException('Plan has no Stripe price ID');
        }

        $stripeSubscription = $this->stripe->subscriptions->retrieve($subscription->stripe_subscription_id);
        $subscriptionItemId = $stripeSubscription->items->data[0]->id;

        $this->stripe->subscriptions->update($subscription->stripe_subscription_id, [
            'items' => [[
                'id' => $subscriptionItemId,
                'price' => $newPlan->stripe_price_id,
            ]],
            'proration_behavior' => 'always_invoice',
        ]);
    }

    private function appendSessionPlaceholder(string $url): string
    {
        if (Str::contains($url, '{CHECKOUT_SESSION_ID}')) {
            return $url;
        }

        $separator = str_contains($url, '?') ? '&' : '?';

        return $url.$separator.'session_id={CHECKOUT_SESSION_ID}';
    }
}
