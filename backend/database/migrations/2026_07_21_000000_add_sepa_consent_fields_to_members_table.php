<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Legt vast wanneer en vanaf welk IP-adres een lid akkoord ging met de SEPA-
     * machtiging. Voor incasso is aantoonbaar bewijs van de machtiging vereist
     * (o.a. bij een terugboeking/dispuut).
     */
    public function up(): void
    {
        Schema::table('members', function (Blueprint $table) {
            $table->timestamp('sepa_consent_at')->nullable()->after('sepa_subscription_setup_by');
            $table->string('sepa_consent_ip', 45)->nullable()->after('sepa_consent_at');
        });
    }

    public function down(): void
    {
        Schema::table('members', function (Blueprint $table) {
            $table->dropColumn(['sepa_consent_at', 'sepa_consent_ip']);
        });
    }
};
