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
                'name' => 'Basis',
                'stripe_price_id' => $plansConfig['basic_price_id'] ?? null,
                'monthly_price' => 29.00,
                'currency' => strtoupper(config('stripe.default_currency', 'EUR')),
                'description' => 'Voor kleine verenigingen die hun ledenbeheer willen automatiseren.',
            ],
            [
                'name' => 'Plus',
                'stripe_price_id' => $plansConfig['plus_price_id'] ?? null,
                'monthly_price' => 59.00,
                'currency' => strtoupper(config('stripe.default_currency', 'EUR')),
                'description' => 'Inclusief geavanceerde rapportages en integraties.',
            ],
        ];

        foreach ($plans as $planData) {
            if (! $planData['stripe_price_id']) {
                continue;
            }

            Plan::updateOrCreate(
                ['stripe_price_id' => $planData['stripe_price_id']],
                [
                    'name' => $planData['name'],
                    'monthly_price' => $planData['monthly_price'],
                    'currency' => $planData['currency'],
                    'description' => $planData['description'],
                    'is_active' => true,
                ]
            );
        }
    }
}
