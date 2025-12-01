<?php

namespace Database\Seeders;

use App\Models\Plan;
use Illuminate\Database\Seeder;

class PlanSeeder extends Seeder
{
    public function run(): void
    {
        $plansConfig = config('stripe.plans');

        $plans = [
            [
                'name' => 'Basic',
                'stripe_price_id' => $plansConfig['basic_price_id'] ?? null,
                'monthly_price' => 150.00,
                'currency' => strtoupper(config('stripe.default_currency', 'EUR')),
                'description' => 'Voor kleine organisaties <150 leden.',
            ],
            [
                'name' => 'Professional',
                'stripe_price_id' => $plansConfig['plus_price_id'] ?? null,
                'monthly_price' => 250.00,
                'currency' => strtoupper(config('stripe.default_currency', 'EUR')),
                'description' => 'Voor middenbedrijven en stichtingen 150–750 leden.',
            ],
            [
                'name' => 'Enterprise',
                'stripe_price_id' => $plansConfig['enterprise_price_id'] ?? null,
                'monthly_price' => 499.00,
                'currency' => strtoupper(config('stripe.default_currency', 'EUR')),
                'description' => 'Voor organisaties >750 leden of complexe processen.',
            ],
        ];

        foreach ($plans as $planData) {
            // Maak plan aan ook als stripe_price_id niet is ingesteld (voor development)
            Plan::updateOrCreate(
                ['name' => $planData['name']],
                [
                    'stripe_price_id' => $planData['stripe_price_id'] ?? '',
                    'monthly_price' => $planData['monthly_price'],
                    'currency' => $planData['currency'],
                    'description' => $planData['description'],
                    'is_active' => true,
                ]
            );
        }
    }
}
