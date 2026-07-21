<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->singleton(\Stripe\StripeClient::class, function () {
            $secret = config('stripe.secret');
            // Zorg ervoor dat het een string is en haal witruimtes weg.
            // Als het leeg is, gebruik de dummy key.
            if (! is_string($secret) || trim($secret) === '') {
                $secret = 'sk_dummy_not_set_in_env';
            }

            return new \Stripe\StripeClient($secret);
        });
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Centraal wachtwoordbeleid voor álle wachtwoord-invoer (registratie, activatie,
        // reset). Min. 10 tekens, hoofd-/kleine letters en cijfers. Verwijst één plek
        // zodat het beleid overal consistent is.
        Password::defaults(fn () => Password::min(10)->mixedCase()->numbers());
    }
}
