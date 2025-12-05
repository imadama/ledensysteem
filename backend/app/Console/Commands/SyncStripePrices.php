<?php

namespace App\Console\Commands;

use App\Models\Plan;
use Illuminate\Console\Command;
use Stripe\Exception\ApiErrorException;
use Stripe\StripeClient;

class SyncStripePrices extends Command
{
    protected $signature = 'stripe:sync-prices';

    protected $description = 'Synchroniseer prijzen van Stripe naar de database';

    public function __construct(private readonly StripeClient $stripe)
    {
        parent::__construct();
    }

    public function handle(): int
    {
        $this->info('Synchroniseren van Stripe prijzen...');

        $plans = Plan::all();

        foreach ($plans as $plan) {
            if (empty($plan->stripe_price_id)) {
                $this->warn("Plan {$plan->name} heeft geen Stripe price ID, overslaan...");
                continue;
            }

            try {
                $price = $this->stripe->prices->retrieve($plan->stripe_price_id);

                $amount = $price->unit_amount / 100; // Stripe prijzen zijn in centen
                $interval = $price->recurring->interval ?? 'month';

                // Voor jaarlijkse prijzen, bereken de maandelijkse equivalent
                if ($interval === 'year') {
                    $monthlyEquivalent = $amount / 12;
                } else {
                    $monthlyEquivalent = $amount;
                }

                $plan->update([
                    'monthly_price' => $monthlyEquivalent,
                    'billing_interval' => $interval,
                    'currency' => strtoupper($price->currency),
                ]);

                $this->info("✓ Plan {$plan->name} ({$interval}): €{$amount} ({$plan->currency}) - Maandelijks equivalent: €{$monthlyEquivalent}");
            } catch (ApiErrorException $e) {
                $this->error("✗ Fout bij ophalen prijs voor plan {$plan->name}: {$e->getMessage()}");
            }
        }

        $this->info('Klaar!');

        return Command::SUCCESS;
    }
}
