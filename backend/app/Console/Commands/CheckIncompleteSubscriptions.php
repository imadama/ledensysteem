<?php

namespace App\Console\Commands;

use App\Models\OrganisationSubscription;
use App\Services\SubscriptionAuditService;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;
use Stripe\Exception\ApiErrorException;
use Stripe\StripeClient;

class CheckIncompleteSubscriptions extends Command
{
    protected $signature = 'subscriptions:check-incomplete 
                            {--hours=1 : Aantal uren dat een subscription incomplete mag zijn voordat het wordt gecontroleerd}
                            {--organisation-id= : ID van specifieke organisatie om te controleren}';

    protected $description = 'Controleer incomplete subscriptions en update status op basis van Stripe checkout session status';

    public function __construct(
        private readonly StripeClient $stripe,
        private readonly SubscriptionAuditService $auditService
    ) {
        parent::__construct();
    }

    public function handle(): int
    {
        $hours = (int) $this->option('hours');
        $organisationId = $this->option('organisation-id');
        $cutoffTime = Carbon::now()->subHours($hours);

        if ($organisationId) {
            $this->info("Controleren incomplete subscriptions voor organisatie {$organisationId}...");
        } else {
            $this->info("Controleren incomplete subscriptions ouder dan {$hours} uur...");
        }

        $query = OrganisationSubscription::query()
            ->where('status', 'incomplete')
            ->with(['organisation', 'plan']);

        if ($organisationId) {
            $query->where('organisation_id', $organisationId);
        } else {
            $query->where('created_at', '<', $cutoffTime);
        }

        $incompleteSubscriptions = $query->get();

        if ($incompleteSubscriptions->isEmpty()) {
            $this->info('Geen incomplete subscriptions gevonden die gecontroleerd moeten worden.');
            return Command::SUCCESS;
        }

        $this->info("Gevonden: {$incompleteSubscriptions->count()} incomplete subscription(s)");

        $updated = 0;
        $expired = 0;
        $stillIncomplete = 0;
        $errors = 0;

        foreach ($incompleteSubscriptions as $subscription) {
            try {
                $result = $this->checkSubscription($subscription);
                
                match ($result) {
                    'expired' => $expired++,
                    'updated' => $updated++,
                    'still_incomplete' => $stillIncomplete++,
                    default => $errors++,
                };
            } catch (\Exception $e) {
                $this->error("Fout bij controleren subscription {$subscription->id}: {$e->getMessage()}");
                $errors++;
            }
        }

        $this->info("Resultaat:");
        $this->info("  - Expired/geannuleerd: {$expired}");
        $this->info("  - Bijgewerkt naar actief: {$updated}");
        $this->info("  - Nog incomplete: {$stillIncomplete}");
        $this->info("  - Fouten: {$errors}");

        return Command::SUCCESS;
    }

    private function checkSubscription(OrganisationSubscription $subscription): string
    {
        // Als er een Stripe subscription ID is, controleer direct de Stripe subscription status
        if ($subscription->stripe_subscription_id) {
            return $this->checkStripeSubscription($subscription);
        }

        // Als er geen checkout session ID is, kan de gebruiker opnieuw proberen
        if (! $subscription->latest_checkout_session_id) {
            $this->warn("  Subscription {$subscription->id}: Geen checkout session ID, kan opnieuw proberen");
            return 'still_incomplete';
        }

        try {
            // Haal checkout session op van Stripe
            $session = $this->stripe->checkout->sessions->retrieve(
                $subscription->latest_checkout_session_id
            );

            $sessionStatus = $session->status ?? 'unknown';
            $paymentStatus = $session->payment_status ?? 'unknown';

            $this->line("  Subscription {$subscription->id}: Session status = {$sessionStatus}, Payment status = {$paymentStatus}");

            // Als de session expired is of complete maar unpaid
            if ($sessionStatus === 'expired' || ($sessionStatus === 'complete' && $paymentStatus !== 'paid')) {
                $reason = $sessionStatus === 'expired' 
                    ? 'Checkout session is verlopen' 
                    : 'Betaling niet voltooid';
                
                $this->warn("  Subscription {$subscription->id}: {$reason}");
                
                // Reset subscription zodat gebruiker opnieuw kan proberen
                $subscription->status = 'incomplete';
                $subscription->latest_checkout_session_id = null;
                $subscription->save();

                // Update billing status naar pending_payment
                $organisation = $subscription->organisation;
                if ($organisation) {
                    $organisation->billing_status = 'pending_payment';
                    $organisation->billing_note = "{$reason}. Selecteer opnieuw een plan om te betalen.";
                    $organisation->save();

                    // Log in audit trail
                    $this->auditService->logSubscriptionStatusChange(
                        $organisation,
                        null,
                        'incomplete',
                        'incomplete',
                        "{$reason} - gebruiker moet opnieuw betalen",
                        [
                            'checkout_session_id' => $subscription->latest_checkout_session_id, 
                            'session_status' => $sessionStatus,
                            'payment_status' => $paymentStatus
                        ]
                    );
                }

                return 'expired';
            }

            // Als de session complete is maar payment nog niet
            if ($sessionStatus === 'complete' && $paymentStatus === 'paid') {
                // Check of er een subscription ID is
                $stripeSubscriptionId = $session->subscription ?? null;
                
                if ($stripeSubscriptionId) {
                    // Haal subscription op van Stripe
                    $stripeSubscription = $this->stripe->subscriptions->retrieve($stripeSubscriptionId);
                    
                    if ($stripeSubscription->status === 'active') {
                        $this->info("  Subscription {$subscription->id}: Betaling succesvol, activeren...");
                        
                        $subscription->status = 'active';
                        $subscription->stripe_subscription_id = $stripeSubscriptionId;
                        $subscription->current_period_start = Carbon::createFromTimestamp($stripeSubscription->current_period_start);
                        $subscription->current_period_end = Carbon::createFromTimestamp($stripeSubscription->current_period_end);
                        $subscription->save();

                        // Update billing status
                        $organisation = $subscription->organisation;
                        if ($organisation) {
                            $organisation->billing_status = 'ok';
                            $organisation->billing_note = null;
                            $organisation->save();

                            // Log in audit trail
                            $this->auditService->logSubscriptionStatusChange(
                                $organisation,
                                null,
                                'incomplete',
                                'active',
                                "Subscription geactiveerd na controle van incomplete status",
                                ['checkout_session_id' => $subscription->latest_checkout_session_id, 'stripe_subscription_id' => $stripeSubscriptionId]
                            );
                        }

                        return 'updated';
                    }
                }
            }

            // Als de session "open" is maar unpaid, check of deze te oud is
            if ($sessionStatus === 'open' && $paymentStatus === 'unpaid') {
                $sessionCreatedTimestamp = $session->created ?? null;
                
                if ($sessionCreatedTimestamp) {
                    $sessionCreated = Carbon::createFromTimestamp($sessionCreatedTimestamp);
                    $hoursOpen = $sessionCreated->diffInHours(Carbon::now(), false); // false = absolute value
                    
                    // Als de session langer dan 1 uur open is, reset het
                    if ($hoursOpen > 1) {
                        $this->warn("  Subscription {$subscription->id}: Checkout session is al {$hoursOpen} uur open en unpaid, resetten");
                        
                        // Reset subscription zodat gebruiker opnieuw kan proberen
                        $subscription->status = 'incomplete';
                        $subscription->latest_checkout_session_id = null;
                        $subscription->save();

                        // Update billing status naar pending_payment
                        $organisation = $subscription->organisation;
                        if ($organisation) {
                            $organisation->billing_status = 'pending_payment';
                            $organisation->billing_note = 'Checkout session is verlopen (te lang open zonder betaling). Selecteer opnieuw een plan om te betalen.';
                            $organisation->save();

                            // Log in audit trail
                            $this->auditService->logSubscriptionStatusChange(
                                $organisation,
                                null,
                                'incomplete',
                                'incomplete',
                                "Checkout session te lang open ({$hoursOpen} uur) zonder betaling - gebruiker moet opnieuw betalen",
                                [
                                    'checkout_session_id' => $subscription->latest_checkout_session_id, 
                                    'session_status' => $sessionStatus,
                                    'payment_status' => $paymentStatus,
                                    'hours_open' => $hoursOpen
                                ]
                            );
                        }

                        return 'expired';
                    }
                    
                    $this->line("  Subscription {$subscription->id}: Nog in behandeling (open voor {$hoursOpen} uur, unpaid)");
                    return 'still_incomplete';
                } else {
                    // Geen created timestamp, behandel als expired
                    $this->warn("  Subscription {$subscription->id}: Checkout session heeft geen created timestamp, resetten");
                    
                    $subscription->status = 'incomplete';
                    $subscription->latest_checkout_session_id = null;
                    $subscription->save();

                    $organisation = $subscription->organisation;
                    if ($organisation) {
                        $organisation->billing_status = 'pending_payment';
                        $organisation->billing_note = 'Checkout session ongeldig. Selecteer opnieuw een plan om te betalen.';
                        $organisation->save();
                    }

                    return 'expired';
                }
            }

            // Als de session complete is maar nog niet paid
            if ($sessionStatus === 'complete' && $paymentStatus !== 'paid') {
                $this->line("  Subscription {$subscription->id}: Nog in behandeling (complete maar unpaid)");
                return 'still_incomplete';
            }

            // Onbekende status - blijf incomplete
            $this->warn("  Subscription {$subscription->id}: Onbekende session status: {$sessionStatus}");
            return 'still_incomplete';

        } catch (ApiErrorException $e) {
            // Als de session niet bestaat in Stripe, reset de subscription
            if ($e->getStripeCode() === 'resource_missing') {
                $this->warn("  Subscription {$subscription->id}: Checkout session bestaat niet meer in Stripe");
                
                $subscription->latest_checkout_session_id = null;
                $subscription->save();

                // Update billing status
                $organisation = $subscription->organisation;
                if ($organisation) {
                    $organisation->billing_status = 'pending_payment';
                    $organisation->billing_note = 'Checkout session niet gevonden. Selecteer opnieuw een plan om te betalen.';
                    $organisation->save();
                }

                return 'expired';
            }

            throw $e;
        }
    }

    private function checkStripeSubscription(OrganisationSubscription $subscription): string
    {
        try {
            $this->line("  Subscription {$subscription->id}: Controleren Stripe subscription {$subscription->stripe_subscription_id}...");
            
            $stripeSubscription = $this->stripe->subscriptions->retrieve($subscription->stripe_subscription_id);
            $stripeStatus = $stripeSubscription->status ?? 'unknown';
            
            $this->line("  Subscription {$subscription->id}: Stripe status = {$stripeStatus}");
            
            // Als de Stripe subscription actief is, update de lokale subscription
            if ($stripeStatus === 'active') {
                $this->info("  Subscription {$subscription->id}: Stripe subscription is actief, updaten lokale status...");
                
                $oldStatus = $subscription->status;
                $subscription->status = 'active';
                
                if (isset($stripeSubscription->current_period_start)) {
                    $subscription->current_period_start = Carbon::createFromTimestamp($stripeSubscription->current_period_start);
                }
                if (isset($stripeSubscription->current_period_end)) {
                    $subscription->current_period_end = Carbon::createFromTimestamp($stripeSubscription->current_period_end);
                }
                
                // Update plan als nodig
                $priceId = data_get($stripeSubscription, 'items.data.0.price.id');
                if ($priceId) {
                    $plan = \App\Models\Plan::query()->where('stripe_price_id', $priceId)->first();
                    if ($plan && $subscription->plan_id !== $plan->id) {
                        $subscription->plan_id = $plan->id;
                    }
                }
                
                $subscription->save();
                
                // Update billing status
                $organisation = $subscription->organisation;
                if ($organisation) {
                    $organisation->billing_status = 'ok';
                    $organisation->billing_note = null;
                    $organisation->save();
                    
                    // Log in audit trail
                    if ($oldStatus !== 'active') {
                        $this->auditService->logSubscriptionStatusChange(
                            $organisation,
                            null,
                            $oldStatus,
                            'active',
                            "Subscription geactiveerd na controle van Stripe subscription status",
                            ['stripe_subscription_id' => $subscription->stripe_subscription_id, 'stripe_status' => $stripeStatus]
                        );
                    }
                }
                
                return 'updated';
            }
            
            // Als de Stripe subscription incomplete_expired of canceled is, reset
            if (in_array($stripeStatus, ['incomplete_expired', 'canceled'], true)) {
                $this->warn("  Subscription {$subscription->id}: Stripe subscription is {$stripeStatus}, resetten...");
                
                $subscription->status = 'incomplete';
                $subscription->stripe_subscription_id = null;
                $subscription->save();
                
                $organisation = $subscription->organisation;
                if ($organisation) {
                    $organisation->billing_status = 'pending_payment';
                    $organisation->billing_note = "Stripe subscription status: {$stripeStatus}. Selecteer opnieuw een plan om te betalen.";
                    $organisation->save();
                }
                
                return 'expired';
            }
            
            // Andere statussen (past_due, unpaid, etc.)
            $this->line("  Subscription {$subscription->id}: Stripe status is {$stripeStatus}, nog niet actief");
            return 'still_incomplete';
            
        } catch (ApiErrorException $e) {
            // Als de subscription niet bestaat in Stripe, reset
            if ($e->getStripeCode() === 'resource_missing') {
                $this->warn("  Subscription {$subscription->id}: Stripe subscription bestaat niet meer");
                
                $subscription->status = 'incomplete';
                $subscription->stripe_subscription_id = null;
                $subscription->save();
                
                $organisation = $subscription->organisation;
                if ($organisation) {
                    $organisation->billing_status = 'pending_payment';
                    $organisation->billing_note = 'Stripe subscription niet gevonden. Selecteer opnieuw een plan om te betalen.';
                    $organisation->save();
                }
                
                return 'expired';
            }
            
            throw $e;
        }
    }
}
