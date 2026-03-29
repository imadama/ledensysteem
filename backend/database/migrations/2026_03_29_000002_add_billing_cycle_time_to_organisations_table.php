<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('organisations', function (Blueprint $table) {
            $table->string('billing_cycle_time', 5)->default('00:00')->after('billing_cycle_day')
                ->comment('Tijdstip van incasso op de geconfigureerde dag (HH:MM, UTC)');
        });
    }

    public function down(): void
    {
        Schema::table('organisations', function (Blueprint $table) {
            $table->dropColumn('billing_cycle_time');
        });
    }
};
