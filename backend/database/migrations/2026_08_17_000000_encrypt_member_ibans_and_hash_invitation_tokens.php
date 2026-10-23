<?php

use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * AUDIT-61 — versleutelt bestaande IBAN's in members.
 * AUDIT-60 — hasht bestaande uitnodigingstokens in member_invitations.
 *
 * Beide kolommen worden gelezen en geschreven via de query builder, niet via Eloquent:
 * de modellen hebben inmiddels een 'encrypted' cast, en die zou hier dubbel versleutelen
 * bij het schrijven en struikelen over plaintext bij het lezen.
 *
 * De stappen zijn idempotent, zodat een halverwege afgebroken migratie opnieuw kan draaien.
 * Dat is hier geen luxe: MySQL kent geen transactionele DDL, dus een migratie die na de
 * kolomwijziging klapt laat die wijziging staan.
 */
return new class extends Migration
{
    public function up(): void
    {
        // Eerst verbreden, dan pas vullen. Een versleuteld IBAN is 228 tekens, en 256 bij de
        // ISO 13616-maximumlengte van 34 — dat laatste past niet in varchar(255), en met
        // strict mode aan is dat een harde fout 1406 in plaats van stille afkapping.
        //
        // De foreign keys gaan er bewust even uit. Productie draait MySQL, waar dit een
        // in-place MODIFY COLUMN is en er niets aan de hand is. Maar SQLite kent geen
        // ALTER COLUMN: Laravel herbouwt daar de hele tabel (kopiëren, droppen, hernoemen),
        // en dat droppen triggert de cascadeOnDelete van member_subscriptions,
        // member_contribution_records, member_contribution_histories en member_invitations.
        // Zonder deze wrapper wist een lokale run op SQLite dus de complete contributie- en
        // betaalhistorie. Geverifieerd: uitnodigingen gingen van 1 naar 0.
        $needsWidening = array_filter(
            ['iban', 'sepa_subscription_iban'],
            fn (string $column) => Schema::getColumnType('members', $column) !== 'text'
        );

        if ($needsWidening !== []) {
            Schema::withoutForeignKeyConstraints(function () use ($needsWidening): void {
                Schema::table('members', function (Blueprint $table) use ($needsWidening): void {
                    foreach ($needsWidening as $column) {
                        $table->text($column)->nullable()->change();
                    }
                });
            });
        }

        $this->encryptColumn('members', 'iban');
        $this->encryptColumn('members', 'sepa_subscription_iban');

        $this->hashInvitationTokens();
    }

    public function down(): void
    {
        $this->decryptColumn('members', 'iban');
        $this->decryptColumn('members', 'sepa_subscription_iban');

        // Zelfde reden als in up(): zonder dit sloopt een rollback op SQLite de kindtabellen.
        Schema::withoutForeignKeyConstraints(function (): void {
            Schema::table('members', function (Blueprint $table): void {
                $table->string('iban')->nullable()->change();
                $table->string('sepa_subscription_iban')->nullable()->change();
            });
        });

        // Uitnodigingstokens zijn bewust niet terug te draaien: een hash is eenrichtingsverkeer.
        // Bestaande activatielinks blijven na een rollback werken, want de lookup hasht het
        // aangeboden token — maar alleen zolang de bijbehorende code ook wordt teruggerold.
    }

    private function encryptColumn(string $table, string $column): void
    {
        DB::table($table)
            ->select('id', $column)
            ->whereNotNull($column)
            ->orderBy('id')
            ->chunkById(200, function ($rows) use ($table, $column): void {
                foreach ($rows as $row) {
                    $value = $row->{$column};

                    if ($value === null || $value === '' || $this->isEncrypted($value)) {
                        continue;
                    }

                    DB::table($table)
                        ->where('id', $row->id)
                        ->update([$column => Crypt::encryptString($value)]);
                }
            });
    }

    private function decryptColumn(string $table, string $column): void
    {
        DB::table($table)
            ->select('id', $column)
            ->whereNotNull($column)
            ->orderBy('id')
            ->chunkById(200, function ($rows) use ($table, $column): void {
                foreach ($rows as $row) {
                    $value = $row->{$column};

                    if ($value === null || $value === '' || ! $this->isEncrypted($value)) {
                        continue;
                    }

                    DB::table($table)
                        ->where('id', $row->id)
                        ->update([$column => Crypt::decryptString($value)]);
                }
            });
    }

    /**
     * Een waarde is al versleuteld als hij te ontsleutelen valt. Dat is meteen de
     * idempotentie-check: plaintext gooit een DecryptException.
     */
    private function isEncrypted(string $value): bool
    {
        try {
            Crypt::decryptString($value);

            return true;
        } catch (DecryptException) {
            return false;
        }
    }

    private function hashInvitationTokens(): void
    {
        DB::table('member_invitations')
            ->select('id', 'token')
            ->whereNotNull('token')
            ->orderBy('id')
            ->chunkById(200, function ($rows): void {
                foreach ($rows as $row) {
                    $token = (string) $row->token;

                    // Al gehasht? Een sha256 is 64 hex-tekens. Str::random(64) levert
                    // alfanumeriek, dus de kans dat een ongehasht token toevallig volledig
                    // uit hex-tekens bestaat is (16/62)^64 — verwaarloosbaar.
                    if ($token === '' || preg_match('/^[0-9a-f]{64}$/', $token) === 1) {
                        continue;
                    }

                    DB::table('member_invitations')
                        ->where('id', $row->id)
                        ->update(['token' => hash('sha256', $token)]);
                }
            });
    }
};
