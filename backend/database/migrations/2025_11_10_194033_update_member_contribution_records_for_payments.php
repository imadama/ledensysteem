<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('member_contribution_records', function (Blueprint $table) {
            $table->foreignId('payment_transaction_id')
                ->nullable()
                ->after('status')
                ->constrained('payment_transactions')
                ->nullOnDelete();
        });

        DB::table('member_contribution_records')
            ->where('status', 'unknown')
            ->update(['status' => 'open']);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('member_contribution_records', function (Blueprint $table) {
            $table->dropConstrainedForeignId('payment_transaction_id');
        });

        DB::table('member_contribution_records')
            ->where('status', 'open')
            ->update(['status' => 'unknown']);
    }
};
