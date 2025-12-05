<?php

namespace Database\Seeders;

use App\Models\PlatformSetting;
use Illuminate\Database\Seeder;

class PlatformSettingsSeeder extends Seeder
{
    public function run(): void
    {
        // Standaard betaalmethodes: card en sepa_debit
        PlatformSetting::setPaymentMethods(['card', 'sepa_debit']);
    }
}
