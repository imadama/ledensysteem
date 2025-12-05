<?php

namespace App\Console\Commands;

use App\Models\OrganisationSubscription;
use App\Models\Plan;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class CleanupOldPlans extends Command
{
    protected $signature = 'plans:cleanup-old';

    protected $description = 'Verwijder oude plannen en hun subscriptions';

    public function handle(): int
    {
        $this->info('Opruimen van oude plannen...');

        // Identificeer oude plannen (niet "Aidatim" en zonder billing_interval of met oude price IDs)
        $oldPlans = Plan::query()
            ->where(function ($query) {
                $query->whereNotLike('name', 'Aidatim%')
                    ->orWhereNull('billing_interval')
                    ->orWhereIn('stripe_price_id', [
                        'price_1SU8wkA46Wivqv54afbavbww', // Plan 1
                        'price_1SZXwNA46Wivqv54XB1pA7r8', // Basic
                        'price_1SZY4DA46Wivqv54lZgrmrCx', // Professional
                        'price_1SZYBhA46Wivqv548LagRuLq', // Enterprise
                    ]);
            })
            ->get();

        if ($oldPlans->isEmpty()) {
            $this->info('Geen oude plannen gevonden.');
            return Command::SUCCESS;
        }

        $this->info("Gevonden {$oldPlans->count()} oude plan(nen):");
        foreach ($oldPlans as $plan) {
            $this->line("  - {$plan->name} (ID: {$plan->id}, Stripe: {$plan->stripe_price_id})");
        }

        if (!$this->confirm('Weet je zeker dat je deze plannen en alle bijbehorende subscriptions wilt verwijderen?', true)) {
            $this->info('Geannuleerd.');
            return Command::SUCCESS;
        }

        DB::transaction(function () use ($oldPlans) {
            foreach ($oldPlans as $plan) {
                // Tel subscriptions
                $subscriptionCount = $plan->organisationSubscriptions()->count();

                if ($subscriptionCount > 0) {
                    $this->warn("  Verwijderen van {$subscriptionCount} subscription(s) voor plan: {$plan->name}");

                    // Verwijder alle subscriptions voor dit plan
                    $plan->organisationSubscriptions()->delete();
                }

                // Verwijder het plan
                $plan->delete();
                $this->info("  ✓ Plan '{$plan->name}' verwijderd");
            }
        });

        $this->info('Klaar! Alle oude plannen en subscriptions zijn verwijderd.');

        return Command::SUCCESS;
    }
}
