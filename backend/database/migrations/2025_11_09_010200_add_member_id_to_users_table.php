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
        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('member_id')
                ->nullable()
                ->after('organisation_id')
                ->constrained('members')
                ->nullOnDelete();
        });

        Schema::table('users', function (Blueprint $table) {
            $table->unique('member_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropUnique('users_member_id_unique');
            $table->dropConstrainedForeignId('member_id');
        });
    }
};


