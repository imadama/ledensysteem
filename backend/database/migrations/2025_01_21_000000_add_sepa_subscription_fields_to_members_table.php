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
        Schema::table('members', function (Blueprint $table) {
            $table->boolean('sepa_subscription_enabled')->default(false)->after('contribution_note');
            $table->string('sepa_subscription_iban')->nullable()->after('sepa_subscription_enabled');
            $table->string('sepa_mandate_stripe_id')->nullable()->after('sepa_subscription_iban');
            $table->text('sepa_subscription_notes')->nullable()->after('sepa_mandate_stripe_id');
            $table->timestamp('sepa_subscription_setup_at')->nullable()->after('sepa_subscription_notes');
            $table->foreignId('sepa_subscription_setup_by')->nullable()->after('sepa_subscription_setup_at')
                ->constrained('users')
                ->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('members', function (Blueprint $table) {
            $table->dropForeign(['sepa_subscription_setup_by']);
            $table->dropColumn([
                'sepa_subscription_enabled',
                'sepa_subscription_iban',
                'sepa_mandate_stripe_id',
                'sepa_subscription_notes',
                'sepa_subscription_setup_at',
                'sepa_subscription_setup_by',
            ]);
        });
    }
};
