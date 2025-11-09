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
        Schema::create('members', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organisation_id')->constrained('organisations')->cascadeOnDelete();
            $table->string('member_number')->nullable();
            $table->string('first_name');
            $table->string('last_name');
            $table->string('gender', 1);
            $table->date('birth_date')->nullable();
            $table->string('email')->nullable();
            $table->string('phone')->nullable();
            $table->string('street_address')->nullable();
            $table->string('postal_code')->nullable();
            $table->string('city')->nullable();
            $table->string('iban')->nullable();
            $table->string('status')->default('active');
            $table->decimal('contribution_amount', 10, 2)->nullable();
            $table->string('contribution_frequency')->nullable();
            $table->date('contribution_start_date')->nullable();
            $table->text('contribution_note')->nullable();
            $table->timestamps();

            $table->index(['organisation_id', 'member_number']);
            $table->index('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('members');
    }
};


