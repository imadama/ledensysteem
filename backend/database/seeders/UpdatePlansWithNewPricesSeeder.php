<?php

namespace Database\Seeders;

use App\Models\Plan;
use Illuminate\Database\Seeder;

class UpdatePlansWithNewPricesSeeder extends Seeder
{
    public function run(): void
    {
        // Aidatim Basic - Maandelijks
        Plan::updateOrCreate(
            [
                'name' => 'Aidatim Basic',
                'billing_interval' => 'month',
            ],
            [
                'stripe_price_id' => 'price_1Sb1cnPC1d4KxSwyO2NZuURV',
                'monthly_price' => 150.00, // Dit moet je aanpassen aan de werkelijke prijs
                'currency' => 'EUR',
                'description' => 'Voor kleine organisaties <150 leden. Maandelijks abonnement.',
                'is_active' => true,
            ]
        );

        // Aidatim Basic - Jaarlijks
        Plan::updateOrCreate(
            [
                'name' => 'Aidatim Basic',
                'billing_interval' => 'year',
            ],
            [
                'stripe_price_id' => 'price_1Sb1cnPC1d4KxSwyeWuIoD3J',
                'monthly_price' => 150.00, // Dit moet je aanpassen aan de werkelijke maandelijkse equivalent
                'currency' => 'EUR',
                'description' => 'Voor kleine organisaties <150 leden. Jaarlijks abonnement.',
                'is_active' => true,
            ]
        );

        // Aidatim Plus - Maandelijks
        Plan::updateOrCreate(
            [
                'name' => 'Aidatim Plus',
                'billing_interval' => 'month',
            ],
            [
                'stripe_price_id' => 'price_1Sb1enPC1d4KxSwyDX3M8L2a',
                'monthly_price' => 250.00, // Dit moet je aanpassen aan de werkelijke prijs
                'currency' => 'EUR',
                'description' => 'Voor middenbedrijven en stichtingen 150–750 leden. Maandelijks abonnement.',
                'is_active' => true,
            ]
        );

        // Aidatim Plus - Jaarlijks
        Plan::updateOrCreate(
            [
                'name' => 'Aidatim Plus',
                'billing_interval' => 'year',
            ],
            [
                'stripe_price_id' => 'price_1Sb1enPC1d4KxSwyiBckLwRe',
                'monthly_price' => 250.00, // Dit moet je aanpassen aan de werkelijke maandelijkse equivalent
                'currency' => 'EUR',
                'description' => 'Voor middenbedrijven en stichtingen 150–750 leden. Jaarlijks abonnement.',
                'is_active' => true,
            ]
        );

        // Aidatim Pro - Maandelijks
        Plan::updateOrCreate(
            [
                'name' => 'Aidatim Pro',
                'billing_interval' => 'month',
            ],
            [
                'stripe_price_id' => 'price_1Sb1g6PC1d4KxSwy56pYE8aq',
                'monthly_price' => 499.00, // Dit moet je aanpassen aan de werkelijke prijs
                'currency' => 'EUR',
                'description' => 'Voor organisaties >750 leden of complexe processen. Maandelijks abonnement.',
                'is_active' => true,
            ]
        );

        // Aidatim Pro - Jaarlijks
        Plan::updateOrCreate(
            [
                'name' => 'Aidatim Pro',
                'billing_interval' => 'year',
            ],
            [
                'stripe_price_id' => 'price_1Sb1g6PC1d4KxSwy7M3r4VoK',
                'monthly_price' => 499.00, // Dit moet je aanpassen aan de werkelijke maandelijkse equivalent
                'currency' => 'EUR',
                'description' => 'Voor organisaties >750 leden of complexe processen. Jaarlijks abonnement.',
                'is_active' => true,
            ]
        );
    }
}
