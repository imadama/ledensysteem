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
        Schema::table('payment_transactions', function (Blueprint $table) {
            $table->string('failure_reason')->nullable()->after('status');
            $table->integer('retry_count')->default(0)->after('failure_reason');
            $table->timestamp('last_retry_at')->nullable()->after('retry_count');
            $table->json('failure_metadata')->nullable()->after('last_retry_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('payment_transactions', function (Blueprint $table) {
            $table->dropColumn(['failure_reason', 'retry_count', 'last_retry_at', 'failure_metadata']);
        });
    }
};
