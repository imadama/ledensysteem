<?php

namespace Database\Seeders;

use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class RolesAndAdminSeeder extends Seeder
{
    public function run(): void
    {
        $roles = [
            ['name' => 'platform_admin', 'description' => 'Beheerder van het platform'],
            ['name' => 'org_admin', 'description' => 'Beheerder van een organisatie'],
            ['name' => 'member', 'description' => 'Lid met een persoonlijk account'],
            ['name' => 'monitor', 'description' => 'Monitor rol voor TV scherm weergave'],
        ];

        foreach ($roles as $roleData) {
            Role::firstOrCreate(
                ['name' => $roleData['name']],
                ['description' => $roleData['description']]
            );
        }

        $adminEmail = env('PLATFORM_ADMIN_EMAIL', 'admin@ledenportaal.test');

        $existingAdmin = User::where('email', $adminEmail)->first();

        // Bestaande admin: wachtwoord NIET overschrijven — anders reset elke deploy
        // (die de seeder draait) het wachtwoord van de beheerder.
        if ($existingAdmin) {
            if (! $existingAdmin->hasRole('platform_admin')) {
                $existingAdmin->assignRole('platform_admin');
            }

            return;
        }

        // Nieuwe admin: gebruik PLATFORM_ADMIN_PASSWORD, of genereer een sterk
        // willekeurig wachtwoord en toon het één keer. Nooit een zwakke default.
        $adminPassword = env('PLATFORM_ADMIN_PASSWORD');
        $generated = false;

        if (! is_string($adminPassword) || $adminPassword === '') {
            $adminPassword = Str::password(20);
            $generated = true;
        }

        $adminUser = User::create([
            'email' => $adminEmail,
            'name' => 'Platform Admin',
            'first_name' => 'Platform',
            'last_name' => 'Admin',
            'password' => Hash::make($adminPassword),
            'status' => 'active',
            'organisation_id' => null,
        ]);

        $adminUser->assignRole('platform_admin');

        if ($generated) {
            $this->command?->warn(
                "Platform admin aangemaakt ({$adminEmail}). Gegenereerd wachtwoord ".
                "(nu noteren, wordt niet opnieuw getoond): {$adminPassword}"
            );
        }
    }
}
