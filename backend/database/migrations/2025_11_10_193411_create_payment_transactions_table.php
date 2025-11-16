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
        Schema::create('payment_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organisation_id')
                ->nullable()
                ->constrained('organisations')
                ->nullOnDelete();
            $table->foreignId('member_id')
                ->nullable()
                ->constrained('members')
                ->nullOnDelete();
            $table->string('type');
            $table->decimal('amount', 10, 2);
            $table->string('currency')->default('EUR');
            $table->string('status')->default('created');
            $table->string('stripe_payment_intent_id')->nullable();
            $table->string('stripe_checkout_session_id')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamp('occurred_at')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('payment_transactions');
    }
};
