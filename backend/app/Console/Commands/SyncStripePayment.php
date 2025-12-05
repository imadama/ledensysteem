<?php

namespace App\Console\Commands;

use App\Models\OrganisationStripeConnection;
use App\Models\PaymentTransaction;
use Illuminate\Console\Command;
use Stripe\Exception\ApiErrorException;
use Stripe\StripeClient;

class SyncStripePayment extends Command
{
    protected $signature = 'stripe:sync-payment {payment_intent_id?} {--session-id=} {--all : Sync alle processing transactions} {--recent : Sync recente betalingen van alle Connect accounts}';

    protected $description = 'Synchroniseer een Stripe betaling met de database';

    public function __construct(private readonly StripeClient $stripe)
    {
        parent::__construct();
    }

    public function handle(): int
    {
        $paymentIntentId = $this->argument('payment_intent_id');
        $sessionId = $this->option('session-id');
        $syncAll = $this->option('all');
        $syncRecent = $this->option('recent');

        if ($syncRecent) {
            return $this->syncRecentPayments();
        }

        if ($syncAll) {
            return $this->syncAllProcessingTransactions();
        }

        if (!$paymentIntentId && !$sessionId) {
            $this->error('Geef een payment_intent_id of --session-id op, of gebruik --all om alle processing transactions te synchroniseren.');
            return Command::FAILURE;
        }

        if ($sessionId) {
            return $this->syncBySessionId($sessionId);
        }

        return $this->syncByPaymentIntentId($paymentIntentId);
    }

    private function syncByPaymentIntentId(string $paymentIntentId): int
    {
        $this->info("Synchroniseren van payment intent: {$paymentIntentId}");

        try {
            $paymentIntent = $this->stripe->paymentIntents->retrieve($paymentIntentId);

            $transaction = PaymentTransaction::query()
                ->where('stripe_payment_intent_id', $paymentIntentId)
                ->first();

            if (!$transaction) {
                // Probeer via metadata
                $transactionId = data_get($paymentIntent->metadata ?? [], 'payment_transaction_id');
                if ($transactionId) {
                    $transaction = PaymentTransaction::find($transactionId);
                }
            }

            if (!$transaction) {
                $this->error("Geen transaction gevonden voor payment intent: {$paymentIntentId}");
                $this->info("Payment Intent status: {$paymentIntent->status}");
                $this->info("Metadata: " . json_encode($paymentIntent->metadata ?? [], JSON_PRETTY_PRINT));
                return Command::FAILURE;
            }

            $this->info("Transaction gevonden: ID {$transaction->id}, Status: {$transaction->status}");

            if ($paymentIntent->status === 'succeeded') {
                $this->updateTransactionSucceeded($transaction, $paymentIntentId, $paymentIntent->charges->data[0]->id ?? null);
                $this->info("✓ Transaction gemarkeerd als succeeded");
            } elseif ($paymentIntent->status === 'requires_payment_method') {
                $this->warn("Payment intent vereist nog een payment method");
            } else {
                $this->warn("Payment intent status: {$paymentIntent->status}");
            }

            return Command::SUCCESS;
        } catch (ApiErrorException $e) {
            $this->error("Fout bij ophalen payment intent: {$e->getMessage()}");
            return Command::FAILURE;
        }
    }

    private function syncBySessionId(string $sessionId): int
    {
        $this->info("Synchroniseren van checkout session: {$sessionId}");

        try {
            $session = $this->stripe->checkout->sessions->retrieve($sessionId);

            $transaction = PaymentTransaction::query()
                ->where('stripe_checkout_session_id', $sessionId)
                ->first();

            if (!$transaction) {
                // Probeer via client_reference_id
                $clientRefId = $session->client_reference_id;
                if ($clientRefId && is_numeric($clientRefId)) {
                    $transaction = PaymentTransaction::find((int) $clientRefId);
                }
            }

            if (!$transaction) {
                $this->error("Geen transaction gevonden voor session: {$sessionId}");
                $this->info("Session status: {$session->status}");
                $this->info("Client reference ID: {$session->client_reference_id}");
                return Command::FAILURE;
            }

            $this->info("Transaction gevonden: ID {$transaction->id}, Status: {$transaction->status}");

            if ($session->status === 'complete' && $session->payment_status === 'paid') {
                $paymentIntentId = $session->payment_intent;
                $this->updateTransactionSucceeded($transaction, $paymentIntentId, $sessionId);
                $this->info("✓ Transaction gemarkeerd als succeeded");
            } else {
                $this->warn("Session status: {$session->status}, Payment status: {$session->payment_status}");
            }

            return Command::SUCCESS;
        } catch (ApiErrorException $e) {
            $this->error("Fout bij ophalen checkout session: {$e->getMessage()}");
            return Command::FAILURE;
        }
    }

    private function syncAllProcessingTransactions(): int
    {
        $this->info("Synchroniseren van alle processing transactions...");

        $transactions = PaymentTransaction::query()
            ->where(function ($query) {
                $query->where('status', 'processing')
                    ->where(function ($q) {
                        $q->whereNotNull('stripe_checkout_session_id')
                          ->orWhereNotNull('stripe_payment_intent_id');
                    });
            })
            ->get();

        if ($transactions->isEmpty()) {
            $this->info("Geen processing transactions gevonden.");
            
            // Probeer ook recente transactions te vinden die mogelijk niet zijn geüpdatet
            $recentTransactions = PaymentTransaction::query()
                ->where('status', '!=', 'succeeded')
                ->where('created_at', '>=', now()->subDays(7))
                ->where(function ($q) {
                    $q->whereNotNull('stripe_checkout_session_id')
                      ->orWhereNotNull('stripe_payment_intent_id');
                })
                ->get();
            
            if ($recentTransactions->isNotEmpty()) {
                $this->info("Gevonden {$recentTransactions->count()} recente transaction(s) om te controleren...");
                $transactions = $recentTransactions;
            } else {
                return Command::SUCCESS;
            }
        }

        $this->info("Gevonden {$transactions->count()} transaction(s) om te synchroniseren");

        $synced = 0;
        $failed = 0;
        
        foreach ($transactions as $transaction) {
            try {
                $updated = false;
                
                if ($transaction->stripe_checkout_session_id) {
                    // Voor Connect accounts moeten we mogelijk het account ID gebruiken
                    $session = $this->stripe->checkout->sessions->retrieve($transaction->stripe_checkout_session_id);
                    
                    $this->line("  Transaction {$transaction->id}: Session status = {$session->status}, Payment status = {$session->payment_status}");
                    
                    if ($session->status === 'complete' && $session->payment_status === 'paid') {
                        $this->updateTransactionSucceeded($transaction, $session->payment_intent, $session->id);
                        $this->info("  ✓ Transaction {$transaction->id} gemarkeerd als succeeded");
                        $synced++;
                        $updated = true;
                    }
                }
                
                if (!$updated && $transaction->stripe_payment_intent_id) {
                    $paymentIntent = $this->stripe->paymentIntents->retrieve($transaction->stripe_payment_intent_id);
                    
                    $this->line("  Transaction {$transaction->id}: Payment Intent status = {$paymentIntent->status}");
                    
                    if ($paymentIntent->status === 'succeeded') {
                        $this->updateTransactionSucceeded($transaction, $paymentIntent->id, null);
                        $this->info("  ✓ Transaction {$transaction->id} gemarkeerd als succeeded");
                        $synced++;
                        $updated = true;
                    }
                }
                
                if (!$updated) {
                    $this->warn("  Transaction {$transaction->id}: Nog niet betaald of status onbekend");
                }
            } catch (ApiErrorException $e) {
                $this->error("  Transaction {$transaction->id}: {$e->getMessage()}");
                $failed++;
            }
        }

        $this->info("Klaar! {$synced} transaction(s) gesynchroniseerd, {$failed} gefaald.");

        return Command::SUCCESS;
    }

    private function syncRecentPayments(): int
    {
        $this->info("Synchroniseren van recente betalingen van alle Connect accounts...");

        $connections = OrganisationStripeConnection::query()
            ->where('status', 'active')
            ->whereNotNull('stripe_account_id')
            ->get();

        if ($connections->isEmpty()) {
            $this->warn("Geen actieve Connect accounts gevonden.");
            return Command::SUCCESS;
        }

        $this->info("Gevonden {$connections->count()} actieve Connect account(s)");

        $synced = 0;
        $checked = 0;

        foreach ($connections as $connection) {
            $this->line("Controleren Connect account: {$connection->stripe_account_id}");

            try {
                // Haal recente checkout sessions op (laatste 7 dagen)
                $sessions = $this->stripe->checkout->sessions->all([
                    'limit' => 100,
                    'created' => ['gte' => now()->subDays(7)->timestamp],
                ], ['stripe_account' => $connection->stripe_account_id]);
                
                // Haal ook recente payment intents op
                $paymentIntents = $this->stripe->paymentIntents->all([
                    'limit' => 100,
                    'created' => ['gte' => now()->subDays(7)->timestamp],
                ], ['stripe_account' => $connection->stripe_account_id]);

                foreach ($sessions->data as $session) {
                    $checked++;
                    
                    $this->line("  Session {$session->id}: mode={$session->mode}, status={$session->status}, payment_status={$session->payment_status}");
                    
                    // Alleen payment mode sessions (niet subscription)
                    if ($session->mode !== 'payment') {
                        continue;
                    }

                    // Alleen completed en paid sessions
                    if ($session->status !== 'complete' || $session->payment_status !== 'paid') {
                        continue;
                    }

                    // Zoek transaction
                    $transaction = PaymentTransaction::query()
                        ->where('stripe_checkout_session_id', $session->id)
                        ->first();

                    if (!$transaction && $session->client_reference_id && is_numeric($session->client_reference_id)) {
                        $transaction = PaymentTransaction::find((int) $session->client_reference_id);
                    }

                    if ($transaction) {
                        if ($transaction->status !== 'succeeded') {
                            $this->updateTransactionSucceeded($transaction, $session->payment_intent, $session->id);
                            $this->info("  ✓ Transaction {$transaction->id} gesynchroniseerd (was: {$transaction->status})");
                            $synced++;
                        } else {
                            $this->line("  → Transaction {$transaction->id} is al succeeded");
                        }
                    } else {
                        $this->warn("  ⚠ Geen transaction gevonden voor session: {$session->id}");
                        $this->line("     Client reference ID: {$session->client_reference_id}");
                        $this->line("     Payment Intent: {$session->payment_intent}");
                        
                        // Probeer transaction te vinden via payment intent
                        if ($session->payment_intent) {
                            $transaction = PaymentTransaction::query()
                                ->where('stripe_payment_intent_id', $session->payment_intent)
                                ->first();
                            
                            if ($transaction) {
                                $this->info("  → Transaction gevonden via payment intent: {$transaction->id}");
                                if ($transaction->status !== 'succeeded') {
                                    $this->updateTransactionSucceeded($transaction, $session->payment_intent, $session->id);
                                    $this->info("  ✓ Transaction {$transaction->id} gesynchroniseerd");
                                    $synced++;
                                }
                            }
                        }
                    }
                }
                
                // Controleer ook payment intents
                foreach ($paymentIntents->data as $paymentIntent) {
                    if ($paymentIntent->status !== 'succeeded') {
                        continue;
                    }
                    
                    $transaction = PaymentTransaction::query()
                        ->where('stripe_payment_intent_id', $paymentIntent->id)
                        ->first();
                    
                    if (!$transaction) {
                        // Probeer via metadata
                        $transactionId = data_get($paymentIntent->metadata ?? [], 'payment_transaction_id');
                        if ($transactionId) {
                            $transaction = PaymentTransaction::find($transactionId);
                        }
                    }
                    
                    if ($transaction && $transaction->status !== 'succeeded') {
                        $this->updateTransactionSucceeded($transaction, $paymentIntent->id, null);
                        $this->info("  ✓ Transaction {$transaction->id} gesynchroniseerd via payment intent");
                        $synced++;
                    }
                }
            } catch (ApiErrorException $e) {
                $this->error("  Fout bij ophalen data voor account {$connection->stripe_account_id}: {$e->getMessage()}");
            }
        }

        $this->info("Klaar! {$checked} session(s) gecontroleerd, {$synced} transaction(s) gesynchroniseerd.");

        return Command::SUCCESS;
    }

    private function updateTransactionSucceeded(PaymentTransaction $transaction, ?string $paymentIntentId, ?string $sessionId): void
    {
        $transaction->refresh();

        $updates = [];

        if ($paymentIntentId && $transaction->stripe_payment_intent_id !== $paymentIntentId) {
            $updates['stripe_payment_intent_id'] = $paymentIntentId;
        }

        if ($sessionId && $transaction->stripe_checkout_session_id !== $sessionId) {
            $updates['stripe_checkout_session_id'] = $sessionId;
        }

        $updates['status'] = 'succeeded';
        $updates['occurred_at'] = now();

        if (!empty($updates)) {
            $transaction->fill($updates);
        }

        $transaction->save();

        // Update contribution records
        $transaction->loadMissing('memberContributionRecords');

        foreach ($transaction->memberContributionRecords as $record) {
            $record->update([
                'status' => 'paid',
                'payment_transaction_id' => $transaction->id,
                'period' => $record->period ?? $transaction->occurred_at?->startOfMonth() ?? now()->startOfMonth(),
            ]);
        }
    }
}
