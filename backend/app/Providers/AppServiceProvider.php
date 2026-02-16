<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->singleton(\Stripe\StripeClient::class, function () {
            return new \Stripe\StripeClient(
                config('stripe.secret')
            );
        });
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Dynamisch subdomeinen van aidatim.nl toevoegen aan Sanctum stateful domains
        // Dit voorkomt dat we handmatig elk subdomein moeten configureren
        if (!app()->runningInConsole() && request()->getHost()) {
            $host = request()->getHost();
            if (str_ends_with($host, '.aidatim.nl')) {
                $stateful = config('sanctum.stateful', []);
                if (!in_array($host, $stateful)) {
                    config(['sanctum.stateful' => array_merge($stateful, [$host])]);
                }
            }
        }
    }
}
