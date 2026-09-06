<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Vervangt bestaande plaintext tokens door hun SHA-256 hash. Reeds
     * verstuurde activatielinks blijven werken: bij activatie wordt de
     * aangeboden token gehasht en met deze waarde vergeleken.
     */
    public function up(): void
    {
        DB::table('member_invitations')
            ->select(['id', 'token'])
            ->orderBy('id')
            ->chunkById(500, function ($invitations): void {
                foreach ($invitations as $invitation) {
                    DB::table('member_invitations')
                        ->where('id', $invitation->id)
                        ->update(['token' => hash('sha256', $invitation->token)]);
                }
            });
    }

    /**
     * Hashen is onomkeerbaar; openstaande uitnodigingen moeten na een rollback
     * opnieuw verstuurd worden.
     */
    public function down(): void
    {
        //
    }
};
