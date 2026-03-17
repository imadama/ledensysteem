<?php

namespace App\Console\Commands;

use App\Models\Organisation;
use Illuminate\Console\Command;
use Stripe\Exception\ApiErrorException;
use Stripe\StripeClient;

class SyncOrganisationBillingStatus extends Command
{
    protected $signature = 'org:sync-billing-status {--dry-run : Laat zien wat er zou veranderen zonder het op te slaan}';

    protected $description = 'Synchroniseer billing_status voor organisaties die vastzitten op pending_payment';

    public function __construct(private readonly StripeClient $stripe)
    {
        parent::__construct();
    }

    public function handle(): int
    {
        $dryRun = $this->option('dry-run');

        if ($dryRun) {
            $this->warn('DRY-RUN modus: er worden geen wijzigingen opgeslagen.');
        }

        $organisations = Organisation::query()
            ->where('billing_status', 'pending_payment')
            ->with('currentSubscription')
            ->get();

        if ($organisations->isEmpty()) {
            $this->info('Geen organisaties gevonden met billing_status = pending_payment.');
            return Command::SUCCESS;
        }

        $this->info("Gevonden {$organisations->count()} organisatie(s) met pending_payment status.");

        $activated = 0;
        $skipped = 0;
        $failed = 0;

        foreach ($organisations as $organisation) {
            $this->line('');
            $this->line("Organisatie #{$organisation->id}: {$organisation->name}");

            $subscription = $organisation->currentSubscription;

            if (! $subscription) {
                $this->warn("  Geen subscription gevonden — overgeslagen.");
                $skipped++;
                continue;
            }

            $sessionId = $subscription->latest_checkout_session_id;
            $stripeSubscriptionId = $subscription->stripe_subscription_id;

            if (! $sessionId && ! $stripeSubscriptionId) {
                $this->warn("  Subscription #{$subscription->id} heeft geen Stripe checkout session of subscription ID — overgeslagen.");
                $skipped++;
                continue;
            }

            $shouldActivate = false;
            $resolvedVia = null;

            // Check via checkout session first
            if ($sessionId && ! $shouldActivate) {
                try {
                    $this->line("  Ophalen checkout session: {$sessionId}");
                    $session = $this->stripe->checkout->sessions->retrieve($sessionId);

                    $this->line("  Session status: {$session->status}, payment_status: {$session->payment_status}");

                    if ($session->status === 'complete' && $session->payment_status === 'paid') {
                        $shouldActivate = true;
                        $resolvedVia = "checkout session {$sessionId} (complete/paid)";
                    }
                } catch (ApiErrorException $e) {
                    $this->warn("  Fout bij ophalen checkout session {$sessionId}: {$e->getMessage()}");
                }
            }

            // Check via subscription if session check was inconclusive
            if ($stripeSubscriptionId && ! $shouldActivate) {
                try {
                    $this->line("  Ophalen subscription: {$stripeSubscriptionId}");
                    $stripeSub = $this->stripe->subscriptions->retrieve($stripeSubscriptionId);

                    $this->line("  Subscription status: {$stripeSub->status}");

                    if (in_array($stripeSub->status, ['active', 'trialing'], true)) {
                        $shouldActivate = true;
                        $resolvedVia = "subscription {$stripeSubscriptionId} (status: {$stripeSub->status})";
                    }
                } catch (ApiErrorException $e) {
                    $this->warn("  Fout bij ophalen subscription {$stripeSubscriptionId}: {$e->getMessage()}");
                    $failed++;
                    continue;
                }
            }

            if ($shouldActivate) {
                $this->info("  Activeren via {$resolvedVia}");

                if (! $dryRun) {
                    $organisation->billing_status = 'active';
                    $organisation->billing_note = null;
                    $organisation->save();
                } else {
                    $this->warn("  [DRY-RUN] billing_status zou worden bijgewerkt naar 'active', billing_note naar null.");
                }

                $activated++;
            } else {
                $this->warn("  Geen actieve betaling gevonden in Stripe — status ongewijzigd.");
                $skipped++;
            }
        }

        $this->line('');
        $this->info("Klaar! {$activated} geactiveerd, {$skipped} overgeslagen, {$failed} gefaald.");

        return Command::SUCCESS;
    }
}
