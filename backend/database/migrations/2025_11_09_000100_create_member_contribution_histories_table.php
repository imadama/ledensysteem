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
        Schema::create('member_contribution_histories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('member_id')->constrained('members')->cascadeOnDelete();
            $table->foreignId('changed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->decimal('old_amount', 10, 2)->nullable();
            $table->string('old_frequency')->nullable();
            $table->date('old_start_date')->nullable();
            $table->text('old_note')->nullable();
            $table->decimal('new_amount', 10, 2)->nullable();
            $table->string('new_frequency')->nullable();
            $table->date('new_start_date')->nullable();
            $table->text('new_note')->nullable();
            $table->timestamps();

            $table->index('member_id');
            $table->index('changed_by');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('member_contribution_histories');
    }
};


