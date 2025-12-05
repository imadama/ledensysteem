<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            RolesAndAdminSeeder::class,
            PlanSeeder::class,
            PlatformSettingsSeeder::class,
        ]);
    }
}
