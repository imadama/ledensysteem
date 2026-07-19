<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Vervang de plain index op stripe_subscription_id door een unique index.
     * Stripe subscription-id's zijn globaal uniek, dus dit voorkomt dubbele
     * MemberSubscription-rijen voor dezelfde Stripe-subscription (backt de
     * duplicate-guards in de service en de member-contribution controller).
     * NULL blijft toegestaan (MySQL staat meerdere NULLs toe in een unique index).
     */
    public function up(): void
    {
        Schema::table('member_subscriptions', function (Blueprint $table) {
            $table->dropIndex(['stripe_subscription_id']);
            $table->unique('stripe_subscription_id');
        });
    }

    public function down(): void
    {
        Schema::table('member_subscriptions', function (Blueprint $table) {
            $table->dropUnique(['stripe_subscription_id']);
            $table->index('stripe_subscription_id');
        });
    }
};
