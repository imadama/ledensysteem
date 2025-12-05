<?php

namespace App\Console\Commands;

use App\Models\MemberSubscription;
use App\Models\OrganisationStripeConnection;
use Illuminate\Console\Command;
use Stripe\Exception\ApiErrorException;
use Stripe\StripeClient;

class SyncAllMemberSubscriptions extends Command
{
    protected $signature = 'stripe:sync-all-member-subscriptions';

    protected $description = 'Synchroniseer alle incomplete member subscriptions met Stripe';

    public function __construct(private readonly StripeClient $stripe)
    {
        parent::__construct();
    }

    public function handle(): int
    {
        $this->info("Synchroniseren van alle incomplete member subscriptions...");

        $subscriptions = MemberSubscription::query()
            ->whereIn('status', ['incomplete', 'active'])
            ->whereNotNull('latest_checkout_session_id')
            ->with('member.organisation.stripeConnection')
            ->get();

        if ($subscriptions->isEmpty()) {
            $this->info("Geen subscriptions gevonden om te synchroniseren.");
            return Command::SUCCESS;
        }

        $this->info("Gevonden {$subscriptions->count()} subscription(s) om te synchroniseren\n");

        $synced = 0;
        $errors = 0;

        foreach ($subscriptions as $subscription) {
            try {
                $organisation = $subscription->member->organisation;
                $connection = $organisation->stripeConnection;

                if (!$connection || $connection->status !== 'active' || !$connection->stripe_account_id) {
                    $this->warn("  Subscription {$subscription->id}: Geen actieve Connect account");
                    continue;
                }

                // Haal checkout session op
                $session = $this->stripe->checkout->sessions->retrieve(
                    $subscription->latest_checkout_session_id,
                    [],
                    ['stripe_account' => $connection->stripe_account_id]
                );

                if ($session->status === 'complete' && $session->payment_status === 'paid' && $session->subscription) {
                    // Haal Stripe subscription op
                    $stripeSubscription = $this->stripe->subscriptions->retrieve(
                        $session->subscription,
                        [],
                        ['stripe_account' => $connection->stripe_account_id]
                    );

                    // Update subscription
                    $subscription->stripe_subscription_id = $stripeSubscription->id;
                    if (!$subscription->stripe_customer_id && $stripeSubscription->customer) {
                        $subscription->stripe_customer_id = $stripeSubscription->customer;
                    }
                    
                    $periodStart = data_get($stripeSubscription, 'current_period_start');
                    $periodEnd = data_get($stripeSubscription, 'current_period_end');
                    
                    if ($periodStart) {
                        $subscription->current_period_start = \Carbon\Carbon::createFromTimestamp($periodStart);
                    }
                    if ($periodEnd) {
                        $subscription->current_period_end = \Carbon\Carbon::createFromTimestamp($periodEnd);
                    }

                    $statusMap = [
                        'active' => 'active',
                        'trialing' => 'trial',
                        'past_due' => 'past_due',
                        'canceled' => 'canceled',
                        'unpaid' => 'unpaid',
                        'incomplete' => 'incomplete',
                        'incomplete_expired' => 'incomplete_expired',
                    ];
                    
                    $subscription->status = $statusMap[$stripeSubscription->status] ?? $stripeSubscription->status;
                    $subscription->save();

                    $this->info("  ✓ Subscription {$subscription->id} gesynchroniseerd: {$subscription->status}");
                    $synced++;

                    // Controleer op invoices en maak contribution records aan
                    $invoices = $this->stripe->invoices->all([
                        'subscription' => $stripeSubscription->id,
                        'limit' => 10,
                    ], ['stripe_account' => $connection->stripe_account_id]);

                    foreach ($invoices->data as $invoice) {
                        if ($invoice->status === 'paid' && $invoice->amount_paid > 0) {
                            $fullInvoice = $this->stripe->invoices->retrieve($invoice->id, [], ['stripe_account' => $connection->stripe_account_id]);
                            $paymentIntentId = data_get($fullInvoice, 'payment_intent');

                            if ($paymentIntentId) {
                                $existingTransaction = \App\Models\PaymentTransaction::query()
                                    ->where('stripe_payment_intent_id', $paymentIntentId)
                                    ->first();
                                
                                // Check ook op invoice ID in metadata
                                if (!$existingTransaction) {
                                    $existingTransaction = \App\Models\PaymentTransaction::query()
                                        ->whereJsonContains('metadata->stripe_invoice_id', $fullInvoice->id)
                                        ->first();
                                }

                                if (!$existingTransaction) {
                                    $periodStart = data_get($fullInvoice, 'lines.data.0.period.start')
                                        ? \Carbon\Carbon::createFromTimestamp(data_get($fullInvoice, 'lines.data.0.period.start'))->startOfMonth()
                                        : now()->startOfMonth();

                                    $contribution = \App\Models\MemberContributionRecord::create([
                                        'member_id' => $subscription->member_id,
                                        'amount' => round($fullInvoice->amount_paid / 100, 2),
                                        'status' => 'paid',
                                        'period' => $periodStart,
                                        'note' => 'Automatische incasso via subscription',
                                    ]);

                                    $transaction = \App\Models\PaymentTransaction::create([
                                        'organisation_id' => $subscription->member->organisation_id,
                                        'member_id' => $subscription->member_id,
                                        'type' => 'contribution',
                                        'amount' => round($fullInvoice->amount_paid / 100, 2),
                                        'currency' => strtoupper($fullInvoice->currency),
                                        'status' => 'succeeded',
                                        'stripe_payment_intent_id' => $paymentIntentId,
                                        'metadata' => [
                                            'stripe_invoice_id' => $fullInvoice->id,
                                            'stripe_invoice_number' => $fullInvoice->number,
                                            'member_subscription_id' => (string) $subscription->id,
                                            'member_contribution_id' => (string) $contribution->id,
                                        ],
                                        'occurred_at' => data_get($fullInvoice, 'status_transitions.paid_at')
                                            ? \Carbon\Carbon::createFromTimestamp(data_get($fullInvoice, 'status_transitions.paid_at'))
                                            : now(),
                                    ]);

                                    $contribution->update([
                                        'payment_transaction_id' => $transaction->id,
                                    ]);

                                    $this->line("    → Contribution record aangemaakt: €{$contribution->amount}");
                                }
                            }
                        }
                    }
                }
            } catch (ApiErrorException $e) {
                $this->error("  Subscription {$subscription->id}: {$e->getMessage()}");
                $errors++;
            }
        }

        $this->info("\nKlaar! {$synced} subscription(s) gesynchroniseerd, {$errors} fout(en).");

        return Command::SUCCESS;
    }
}
