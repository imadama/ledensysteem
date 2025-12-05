<?php

namespace App\Console\Commands;

use App\Models\OrganisationStripeConnection;
use Illuminate\Console\Command;
use Stripe\Exception\ApiErrorException;
use Stripe\StripeClient;

class FindStripePayments extends Command
{
    protected $signature = 'stripe:find-payments {--days=7 : Aantal dagen terug te kijken}';

    protected $description = 'Zoek recente betalingen in Stripe Connect accounts';

    public function __construct(private readonly StripeClient $stripe)
    {
        parent::__construct();
    }

    public function handle(): int
    {
        $days = (int) $this->option('days');
        $this->info("Zoeken naar betalingen van de laatste {$days} dagen...");

        $connections = OrganisationStripeConnection::query()
            ->where('status', 'active')
            ->whereNotNull('stripe_account_id')
            ->with('organisation')
            ->get();

        if ($connections->isEmpty()) {
            $this->warn("Geen actieve Connect accounts gevonden.");
            return Command::SUCCESS;
        }

        $this->info("Gevonden {$connections->count()} actieve Connect account(s)\n");

        foreach ($connections as $connection) {
            $this->line("=== Connect Account: {$connection->stripe_account_id} ===");
            $this->line("Organisatie: {$connection->organisation->name} (ID: {$connection->organisation->id})\n");

            try {
                // Haal checkout sessions op
                $sessions = $this->stripe->checkout->sessions->all([
                    'limit' => 100,
                    'created' => ['gte' => now()->subDays($days)->timestamp],
                ], ['stripe_account' => $connection->stripe_account_id]);

                $this->line("Checkout Sessions (" . count($sessions->data) . "):");
                foreach ($sessions->data as $session) {
                    $this->line("  - Session: {$session->id}");
                    $this->line("    Mode: {$session->mode}, Status: {$session->status}, Payment: {$session->payment_status}");
                    $this->line("    Client Ref: {$session->client_reference_id}");
                    $this->line("    Payment Intent: {$session->payment_intent}");
                    $this->line("    Amount: " . ($session->amount_total ? '€' . ($session->amount_total / 100) : 'N/A'));
                    $this->line("    Created: " . date('Y-m-d H:i:s', $session->created));
                    $this->line("");
                }

                // Haal payment intents op
                $paymentIntents = $this->stripe->paymentIntents->all([
                    'limit' => 100,
                    'created' => ['gte' => now()->subDays($days)->timestamp],
                ], ['stripe_account' => $connection->stripe_account_id]);

                $this->line("Payment Intents (" . count($paymentIntents->data) . "):");
                foreach ($paymentIntents->data as $pi) {
                    $this->line("  - Payment Intent: {$pi->id}");
                    $this->line("    Status: {$pi->status}");
                    $this->line("    Amount: €" . ($pi->amount / 100));
                    $this->line("    Metadata: " . json_encode($pi->metadata ?? [], JSON_PRETTY_PRINT));
                    $this->line("    Created: " . date('Y-m-d H:i:s', $pi->created));
                    $this->line("");
                }

            } catch (ApiErrorException $e) {
                $this->error("Fout: {$e->getMessage()}");
            }

            $this->line("");
        }

        return Command::SUCCESS;
    }
}
