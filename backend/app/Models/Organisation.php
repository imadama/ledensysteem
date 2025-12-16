<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Organisation extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'type',
        'city',
        'country',
        'contact_email',
        'status',
        'billing_status',
        'billing_note',
        'subdomain',
    ];

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    public function members(): HasMany
    {
        return $this->hasMany(Member::class);
    }

    public function stripeConnection(): HasOne
    {
        return $this->hasOne(OrganisationStripeConnection::class);
    }

    public function paymentTransactions(): HasMany
    {
        return $this->hasMany(PaymentTransaction::class);
    }

    public function subscriptions(): HasMany
    {
        return $this->hasMany(OrganisationSubscription::class);
    }

    public function currentSubscription(): HasOne
    {
        return $this->hasOne(OrganisationSubscription::class)->latestOfMany();
    }

    public function subscriptionAuditLogs(): HasMany
    {
        return $this->hasMany(SubscriptionAuditLog::class);
    }

    public function isBillingRestricted(): bool
    {
        return $this->billing_status === 'restricted';
    }

    /**
     * Genereert een uniek subdomein op basis van de organisatienaam.
     */
    public static function generateSubdomainFromName(string $name): string
    {
        // Converteer naar slug-formaat
        $subdomain = \Illuminate\Support\Str::slug($name);

        // Verwijder speciale karakters en maak lowercase
        $subdomain = strtolower($subdomain);

        // Verwijder leidende/afsluitende streepjes
        $subdomain = trim($subdomain, '-');

        // Zorg dat subdomein niet leeg is
        if (empty($subdomain)) {
            $subdomain = 'organisatie-'.uniqid();
        }

        // Controleer uniekheid en voeg nummer toe indien nodig
        $baseSubdomain = $subdomain;
        $counter = 1;

        while (self::where('subdomain', $subdomain)->exists()) {
            $subdomain = $baseSubdomain.'-'.$counter;
            $counter++;
        }

        return $subdomain;
    }
}
