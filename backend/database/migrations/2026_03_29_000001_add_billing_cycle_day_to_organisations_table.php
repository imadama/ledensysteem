<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('organisations', function (Blueprint $table) {
            $table->tinyInteger('billing_cycle_day')->unsigned()->default(1)->after('pass_stripe_fee_to_member')
                ->comment('Dag van de maand waarop SEPA-incasso plaatsvindt (1-31)');
        });
    }

    public function down(): void
    {
        Schema::table('organisations', function (Blueprint $table) {
            $table->dropColumn('billing_cycle_day');
        });
    }
};
