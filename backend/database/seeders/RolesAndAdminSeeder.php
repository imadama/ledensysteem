<?php

namespace Database\Seeders;

use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class RolesAndAdminSeeder extends Seeder
{
    public function run(): void
    {
        $roles = [
            ['name' => 'platform_admin', 'description' => 'Beheerder van het platform'],
            ['name' => 'org_admin', 'description' => 'Beheerder van een organisatie'],
            ['name' => 'member', 'description' => 'Lid met een persoonlijk account'],
        ];

        foreach ($roles as $roleData) {
            Role::firstOrCreate(
                ['name' => $roleData['name']],
                ['description' => $roleData['description']]
            );
        }

        $adminEmail = 'admin@ledenportaal.test';
        $adminPassword = env('PLATFORM_ADMIN_PASSWORD', 'secret123!');

        $adminUser = User::updateOrCreate(
            ['email' => $adminEmail],
            [
                'name' => 'Platform Admin',
                'first_name' => 'Platform',
                'last_name' => 'Admin',
                'password' => Hash::make($adminPassword),
                'status' => 'active',
                'organisation_id' => null,
            ]
        );

        if (! $adminUser->hasRole('platform_admin')) {
            $adminUser->assignRole('platform_admin');
        }
    }
}
