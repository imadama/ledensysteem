<?php

namespace App\Console\Commands;

use App\Models\MemberContributionRecord;
use App\Models\MemberSubscription;
use App\Models\OrganisationStripeConnection;
use App\Models\PaymentTransaction;
use Illuminate\Console\Command;
use Stripe\Exception\ApiErrorException;
use Stripe\StripeClient;

class SyncMemberSubscription extends Command
{
    protected $signature = 'stripe:sync-member-subscription {subscription_id : Member subscription ID}';

    protected $description = 'Synchroniseer een member subscription met Stripe';

    public function __construct(private readonly StripeClient $stripe)
    {
        parent::__construct();
    }

    public function handle(): int
    {
        $subscriptionId = (int) $this->argument('subscription_id');

        $subscription = MemberSubscription::find($subscriptionId);

        if (!$subscription) {
            $this->error("Member subscription {$subscriptionId} niet gevonden.");
            return Command::FAILURE;
        }

        $this->info("Member Subscription: ID {$subscription->id}, Status: {$subscription->status}");
        $this->info("Checkout Session: {$subscription->latest_checkout_session_id}");
        $stripeSubId = $subscription->stripe_subscription_id ?? 'Geen';
        $this->info("Stripe Subscription: {$stripeSubId}");

        if (!$subscription->latest_checkout_session_id) {
            $this->error("Geen checkout session ID gevonden.");
            return Command::FAILURE;
        }

        try {
            // Haal Connect account ID op via member -> organisation
            $subscription->loadMissing('member.organisation.stripeConnection');
            $organisation = $subscription->member->organisation;
            $connection = $organisation->stripeConnection;
            
            if (!$connection || $connection->status !== 'active' || !$connection->stripe_account_id) {
                $this->error("Geen actieve Stripe Connect account gevonden voor deze organisatie.");
                return Command::FAILURE;
            }
            
            $this->info("Connect Account: {$connection->stripe_account_id}\n");
            
            // Haal checkout session op via Connect account
            $session = $this->stripe->checkout->sessions->retrieve(
                $subscription->latest_checkout_session_id,
                [],
                ['stripe_account' => $connection->stripe_account_id]
            );
            
            $this->info("\nCheckout Session Status:");
            $this->line("  Status: {$session->status}");
            $this->line("  Payment Status: {$session->payment_status}");
            $subId = $session->subscription ?? 'Geen';
            $this->line("  Subscription ID: {$subId}");
            $custId = $session->customer ?? 'Geen';
            $this->line("  Customer ID: {$custId}");

            if ($session->subscription) {
                // Haal Stripe subscription op via Connect account
                $stripeSubscription = $this->stripe->subscriptions->retrieve(
                    $session->subscription,
                    [],
                    ['stripe_account' => $connection->stripe_account_id]
                );
                
                $this->info("\nStripe Subscription Status:");
                $this->line("  Status: {$stripeSubscription->status}");
                
                $periodStart = data_get($stripeSubscription, 'current_period_start');
                $periodEnd = data_get($stripeSubscription, 'current_period_end');
                
                if ($periodStart) {
                    $this->line("  Current Period Start: " . date('Y-m-d H:i:s', $periodStart));
                }
                if ($periodEnd) {
                    $this->line("  Current Period End: " . date('Y-m-d H:i:s', $periodEnd));
                }

                // Update de subscription
                $subscription->stripe_subscription_id = $stripeSubscription->id;
                if (!$subscription->stripe_customer_id && $stripeSubscription->customer) {
                    $subscription->stripe_customer_id = $stripeSubscription->customer;
                }
                
                if ($periodStart) {
                    $subscription->current_period_start = \Carbon\Carbon::createFromTimestamp($periodStart);
                }
                if ($periodEnd) {
                    $subscription->current_period_end = \Carbon\Carbon::createFromTimestamp($periodEnd);
                }
                
                // Map status
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

                $this->info("\n✓ Subscription geüpdatet:");
                $this->line("  Nieuwe status: {$subscription->status}");
                $this->line("  Stripe Subscription ID: {$subscription->stripe_subscription_id}");
                $this->line("  Stripe Customer ID: {$subscription->stripe_customer_id}");
                
                // Haal de eerste invoice op en maak contribution record aan
                $this->info("\nControleren op invoices...");
                $invoices = $this->stripe->invoices->all([
                    'subscription' => $stripeSubscription->id,
                    'limit' => 10,
                ], ['stripe_account' => $connection->stripe_account_id]);
                
                foreach ($invoices->data as $invoice) {
                    if ($invoice->status === 'paid' && $invoice->amount_paid > 0) {
                        $this->line("  Invoice gevonden: {$invoice->id}, Status: {$invoice->status}, Amount: €" . ($invoice->amount_paid / 100));
                        
                        // Haal payment intent ID op - haal invoice volledig op
                        $fullInvoice = $this->stripe->invoices->retrieve($invoice->id, [], ['stripe_account' => $connection->stripe_account_id]);
                        $paymentIntentId = data_get($fullInvoice, 'payment_intent');
                        
                        // Check of er al een contribution record is voor deze invoice
                        $existingContribution = null;
                        if ($paymentIntentId) {
                            $existingTransaction = PaymentTransaction::query()
                                ->where('stripe_payment_intent_id', $paymentIntentId)
                                ->first();
                            
                            if ($existingTransaction) {
                                $existingContribution = MemberContributionRecord::query()
                                    ->where('payment_transaction_id', $existingTransaction->id)
                                    ->first();
                            }
                        }
                        
                        // Check ook op invoice ID in metadata
                        if (!$existingContribution) {
                            $existingTransaction = PaymentTransaction::query()
                                ->whereJsonContains('metadata->stripe_invoice_id', $fullInvoice->id)
                                ->first();
                            
                            if ($existingTransaction) {
                                $existingContribution = MemberContributionRecord::query()
                                    ->where('payment_transaction_id', $existingTransaction->id)
                                    ->first();
                            }
                        }
                        
                        if (!$existingContribution) {
                            $this->info("  → Maak contribution record aan...");
                            
                            $periodStart = $invoice->lines->data[0]->period->start 
                                ? \Carbon\Carbon::createFromTimestamp($invoice->lines->data[0]->period->start)->startOfMonth()
                                : now()->startOfMonth();
                            
                            $contribution = MemberContributionRecord::create([
                                'member_id' => $subscription->member_id,
                                'amount' => round($invoice->amount_paid / 100, 2),
                                'status' => 'paid',
                                'period' => $periodStart,
                                'note' => 'Automatische incasso via subscription',
                            ]);
                            
                            // Maak payment transaction
                            $transaction = PaymentTransaction::create([
                                'organisation_id' => $subscription->member->organisation_id,
                                'member_id' => $subscription->member_id,
                                'type' => 'contribution',
                                'amount' => round($invoice->amount_paid / 100, 2),
                                'currency' => strtoupper($invoice->currency),
                                'status' => 'succeeded',
                                'stripe_payment_intent_id' => $paymentIntentId,
                                'metadata' => [
                                    'stripe_invoice_id' => $invoice->id,
                                    'stripe_invoice_number' => $invoice->number,
                                    'member_subscription_id' => (string) $subscription->id,
                                    'member_contribution_id' => (string) $contribution->id,
                                ],
                                'occurred_at' => $invoice->status_transitions->paid_at 
                                    ? \Carbon\Carbon::createFromTimestamp($invoice->status_transitions->paid_at)
                                    : now(),
                            ]);
                            
                            $contribution->update([
                                'payment_transaction_id' => $transaction->id,
                            ]);
                            
                            $this->info("  ✓ Contribution record aangemaakt: ID {$contribution->id}");
                        } else {
                            $this->line("  → Contribution record bestaat al: ID {$existingContribution->id}");
                        }
                    }
                }
            }

            return Command::SUCCESS;
        } catch (ApiErrorException $e) {
            $this->error("Fout: {$e->getMessage()}");
            return Command::FAILURE;
        }
    }
}
