<?php

namespace App\Services;

use App\Models\Member;
use App\Models\MemberSubscription;
use App\Models\Organisation;
use App\Models\User;
use App\Services\OrganisationStripeService;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Stripe\Exception\ApiErrorException;
use Stripe\PaymentMethod;
use Stripe\SetupIntent;
use Stripe\StripeClient;

class MemberSepaSubscriptionService
{
    public function __construct(
        private readonly StripeClient $stripe,
        private readonly OrganisationStripeService $stripeService
    ) {
    }

    /**
     * @throws ApiErrorException
     * @throws ValidationException
     */
    public function setupSepaSubscription(
        User $admin,
        Member $member,
        float $amount,
        ?string $iban = null,
        ?string $description = null,
        ?string $notes = null
    ): MemberSubscription {
        $organisation = $member->organisation;

        if (! $organisation) {
            throw ValidationException::withMessages([
                'organisation' => __('Lid heeft geen organisatie.'),
            ]);
        }

        // Check of lid al een actieve subscription heeft
        if ($member->activeSubscription) {
            throw ValidationException::withMessages([
                'subscription' => __('Lid heeft al een actieve automatische incasso.'),
            ]);
        }

        // Check of lid IBAN heeft
        $memberIban = $iban ?? $member->iban;
        if (empty($memberIban)) {
            throw ValidationException::withMessages([
                'iban' => __('Lid heeft geen IBAN. Voeg een IBAN toe aan het lid of geef een IBAN op.'),
            ]);
        }

        // Valideer IBAN format (basis validatie)
        $memberIban = str_replace(' ', '', strtoupper($memberIban));
        if (strlen($memberIban) < 15 || strlen($memberIban) > 34) {
            throw ValidationException::withMessages([
                'iban' => __('Ongeldig IBAN formaat.'),
            ]);
        }

        // Check of organisatie actief Stripe account heeft
        $connection = $this->stripeService->getConnectionForOrganisation($organisation);
        if ($connection->status !== 'active' || ! $connection->stripe_account_id) {
            throw ValidationException::withMessages([
                'stripe' => __('Organisatie heeft geen actief Stripe account. Koppel eerst een Stripe account.'),
            ]);
        }

        $stripeAccountId = $connection->stripe_account_id;

        return DB::transaction(function () use (
            $admin,
            $member,
            $organisation,
            $amount,
            $memberIban,
            $description,
            $notes,
            $stripeAccountId
        ) {
            // 1. Maak Stripe customer aan op connected account
            $customerEmail = $member->email;
            if (empty($customerEmail)) {
                // Gebruik generieke email als lid geen email heeft
                $customerEmail = "member-{$member->id}@organisation-{$organisation->id}.local";
            }

            $customer = $this->stripe->customers->create([
                'email' => $customerEmail,
                'name' => $member->full_name,
                'metadata' => [
                    'member_id' => (string) $member->id,
                    'organisation_id' => (string) $organisation->id,
                ],
            ], ['stripe_account' => $stripeAccountId]);

            // 2. Maak SEPA payment method aan
            $paymentMethod = $this->stripe->paymentMethods->create([
                'type' => 'sepa_debit',
                'sepa_debit' => [
                    'iban' => $memberIban,
                ],
                'billing_details' => [
                    'name' => $member->full_name,
                    'email' => $customerEmail,
                ],
            ], ['stripe_account' => $stripeAccountId]);

            // 3. Koppel payment method aan customer
            $this->stripe->paymentMethods->attach(
                $paymentMethod->id,
                ['customer' => $customer->id],
                ['stripe_account' => $stripeAccountId]
            );

            // 4. Maak Setup Intent aan om SEPA mandate te bevestigen
            // Voor SEPA moet de mandate bevestigd zijn voordat we een subscription kunnen aanmaken
            // We hebben een collectieve machtiging, dus we kunnen de mandate direct bevestigen
            $setupIntent = $this->stripe->setupIntents->create([
                'customer' => $customer->id,
                'payment_method' => $paymentMethod->id,
                'payment_method_types' => ['sepa_debit'],
                'usage' => 'off_session',
                'confirm' => true, // Bevestig direct (we hebben collectieve machtiging)
                'mandate_data' => [
                    'customer_acceptance' => [
                        'type' => 'offline', // Offline omdat we collectieve machtiging hebben
                    ],
                ],
            ], ['stripe_account' => $stripeAccountId]);

            // 5. Haal mandate ID op uit payment method na setup intent
            $mandateId = null;
            if ($setupIntent->status === 'succeeded' && $setupIntent->payment_method) {
                try {
                    $paymentMethodDetails = $this->stripe->paymentMethods->retrieve(
                        $setupIntent->payment_method,
                        [],
                        ['stripe_account' => $stripeAccountId]
                    );
                    $mandateId = $paymentMethodDetails->sepa_debit->mandate ?? null;
                } catch (\Exception $e) {
                    // Mandate kan nog niet beschikbaar zijn
                }
            }

            // 6. Maak eerst een product aan
            $subscriptionDescription = $description ?? "Maandelijkse contributie voor {$member->full_name}";
            
            $product = $this->stripe->products->create([
                'name' => $subscriptionDescription,
                'metadata' => [
                    'member_id' => (string) $member->id,
                    'organisation_id' => (string) $organisation->id,
                ],
            ], ['stripe_account' => $stripeAccountId]);

            // 7. Maak een price aan voor het product
            $stripeAmount = (int) round($amount * 100); // Convert to cents

            $price = $this->stripe->prices->create([
                'currency' => 'eur',
                'unit_amount' => $stripeAmount,
                'recurring' => [
                    'interval' => 'month',
                ],
                'product' => $product->id,
            ], ['stripe_account' => $stripeAccountId]);

            // 8. Maak Stripe subscription aan
            // Nu de mandate is bevestigd via setup intent, kunnen we de subscription aanmaken
            $stripeSubscription = $this->stripe->subscriptions->create([
                'customer' => $customer->id,
                'items' => [[
                    'price' => $price->id,
                ]],
                'default_payment_method' => $paymentMethod->id,
                'metadata' => [
                    'member_id' => (string) $member->id,
                    'organisation_id' => (string) $organisation->id,
                    'setup_by_admin' => (string) $admin->id,
                ],
            ], ['stripe_account' => $stripeAccountId]);

            // 9. Maak MemberSubscription aan
            $memberSubscription = MemberSubscription::create([
                'member_id' => $member->id,
                'amount' => $amount,
                'currency' => 'EUR',
                'stripe_customer_id' => $customer->id,
                'stripe_subscription_id' => $stripeSubscription->id,
                'status' => 'incomplete', // Wordt 'active' via webhook
                'metadata' => [
                    'setup_by_admin' => (string) $admin->id,
                    'description' => $description,
                    'notes' => $notes,
                ],
            ]);

            // 10. Probeer mandate ID op te halen na subscription aanmaken
            // Voor SEPA wordt de mandate vaak pas aangemaakt bij eerste betaling
            // Maar we proberen het nu al op te halen
            if (! $mandateId) {
                try {
                    $updatedPaymentMethod = $this->stripe->paymentMethods->retrieve(
                        $paymentMethod->id,
                        [],
                        ['stripe_account' => $stripeAccountId]
                    );
                    $mandateId = $updatedPaymentMethod->sepa_debit->mandate ?? null;
                } catch (\Exception $e) {
                    // Mandate kan nog niet bestaan, wordt later opgehaald via webhook
                }
            }

            // 11. Update member record
            $member->update([
                'sepa_subscription_enabled' => true,
                'sepa_subscription_iban' => $memberIban,
                'sepa_mandate_stripe_id' => $mandateId, // Kan null zijn, wordt later bijgewerkt
                'sepa_subscription_notes' => $notes,
                'sepa_subscription_setup_at' => now(),
                'sepa_subscription_setup_by' => $admin->id,
            ]);

            return $memberSubscription;
        });
    }

    /**
     * @throws ApiErrorException
     * @throws ValidationException
     */
    public function disableSepaSubscription(User $admin, Member $member, ?string $reason = null): void
    {
        $subscription = $member->activeSubscription;

        if (! $subscription || ! $subscription->stripe_subscription_id) {
            throw ValidationException::withMessages([
                'subscription' => __('Lid heeft geen actieve automatische incasso.'),
            ]);
        }

        $organisation = $member->organisation;
        if (! $organisation) {
            throw ValidationException::withMessages([
                'organisation' => __('Lid heeft geen organisatie.'),
            ]);
        }

        $connection = $this->stripeService->getConnectionForOrganisation($organisation);
        if (! $connection->stripe_account_id) {
            throw ValidationException::withMessages([
                'stripe' => __('Organisatie heeft geen Stripe account.'),
            ]);
        }

        DB::transaction(function () use ($subscription, $member, $connection, $reason) {
            // Cancel Stripe subscription
            $this->stripe->subscriptions->cancel(
                $subscription->stripe_subscription_id,
                [],
                ['stripe_account' => $connection->stripe_account_id]
            );

            // Update MemberSubscription
            $subscription->update([
                'status' => 'canceled',
                'canceled_at' => now(),
            ]);

            // Update member record
            $member->update([
                'sepa_subscription_enabled' => false,
            ]);
        });
    }

    /**
     * @throws ApiErrorException
     * @throws ValidationException
     */
    public function updateSepaSubscriptionAmount(Member $member, float $newAmount): MemberSubscription
    {
        $subscription = $member->activeSubscription;

        if (! $subscription || ! $subscription->stripe_subscription_id) {
            throw ValidationException::withMessages([
                'subscription' => __('Lid heeft geen actieve automatische incasso.'),
            ]);
        }

        if ($newAmount <= 0) {
            throw ValidationException::withMessages([
                'amount' => __('Bedrag moet groter zijn dan 0.'),
            ]);
        }

        $organisation = $member->organisation;
        if (! $organisation) {
            throw ValidationException::withMessages([
                'organisation' => __('Lid heeft geen organisatie.'),
            ]);
        }

        $connection = $this->stripeService->getConnectionForOrganisation($organisation);
        if (! $connection->stripe_account_id) {
            throw ValidationException::withMessages([
                'stripe' => __('Organisatie heeft geen Stripe account.'),
            ]);
        }

        // Haal Stripe subscription op
        $stripeSubscription = $this->stripe->subscriptions->retrieve(
            $subscription->stripe_subscription_id,
            [],
            ['stripe_account' => $connection->stripe_account_id]
        );

        $subscriptionItemId = $stripeSubscription->items->data[0]->id ?? null;
        if (! $subscriptionItemId) {
            throw ValidationException::withMessages([
                'subscription' => __('Kon subscription item niet vinden.'),
            ]);
        }

        $stripeAmount = (int) round($newAmount * 100); // Convert to cents

        // Haal product op van bestaande subscription item
        $subscriptionItem = $stripeSubscription->items->data[0] ?? null;
        $existingProductId = $subscriptionItem->price->product ?? null;

        // Maak nieuwe price aan met het nieuwe bedrag
        $newPrice = $this->stripe->prices->create([
            'currency' => 'eur',
            'unit_amount' => $stripeAmount,
            'recurring' => [
                'interval' => 'month',
            ],
            'product' => $existingProductId ?? $this->stripe->products->create([
                'name' => "Maandelijkse contributie voor {$member->full_name}",
                'metadata' => [
                    'member_id' => (string) $member->id,
                    'organisation_id' => (string) $organisation->id,
                ],
            ], ['stripe_account' => $connection->stripe_account_id])->id,
        ], ['stripe_account' => $connection->stripe_account_id]);

        // Update Stripe subscription met nieuwe price
        $this->stripe->subscriptions->update(
            $subscription->stripe_subscription_id,
            [
                'items' => [[
                    'id' => $subscriptionItemId,
                    'price' => $newPrice->id,
                ]],
                'proration_behavior' => 'always_invoice',
            ],
            ['stripe_account' => $connection->stripe_account_id]
        );

        // Update MemberSubscription
        $subscription->update([
            'amount' => $newAmount,
        ]);

        return $subscription->fresh();
    }
}
