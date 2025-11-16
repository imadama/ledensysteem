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
        Schema::table('organisation_subscriptions', function (Blueprint $table) {
            $table->string('latest_checkout_session_id')->nullable()->after('stripe_subscription_id');
            $table->json('metadata')->nullable()->after('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('organisation_subscriptions', function (Blueprint $table) {
            $table->dropColumn('metadata');
            $table->dropColumn('latest_checkout_session_id');
        });
    }
};
