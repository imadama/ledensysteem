<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('organisations', function (Blueprint $table) {
            $table->boolean('pass_stripe_fee_to_member')->default(false)->after('billing_note');
        });
    }

    public function down(): void
    {
        Schema::table('organisations', function (Blueprint $table) {
            $table->dropColumn('pass_stripe_fee_to_member');
        });
    }
};
