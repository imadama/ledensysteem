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
            $secret = config('stripe.secret');
            // Zorg ervoor dat het een string is en haal witruimtes weg. 
            // Als het leeg is, gebruik de dummy key.
            if (!is_string($secret) || trim($secret) === '') {
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
        // Dynamisch subdomeinen van aidatim.nl toevoegen aan Sanctum stateful domains
        // Dit voorkomt dat we handmatig elk subdomein moeten configureren
        if (!app()->runningInConsole()) {
            try {
                $domainsToAdd = [];

                // Check host
                $host = request()->getHost();
                if (str_ends_with($host, '.aidatim.nl')) {
                    $domainsToAdd[] = $host;
                }

                // Check Origin header (belangrijk voor CORS/Sanctum van frontend op ander subdomein)
                $origin = request()->header('Origin');
                if ($origin) {
                    $parsed = parse_url($origin);
                    if (isset($parsed['host']) && str_ends_with($parsed['host'], '.aidatim.nl')) {
                        $domainsToAdd[] = $parsed['host'];
                    }
                }

                // Check Referer header
                $referer = request()->header('Referer');
                if ($referer) {
                    $parsed = parse_url($referer);
                    if (isset($parsed['host']) && str_ends_with($parsed['host'], '.aidatim.nl')) {
                        $domainsToAdd[] = $parsed['host'];
                    }
                }

                if (!empty($domainsToAdd)) {
                    $stateful = config('sanctum.stateful', []);
                    $newStateful = array_unique(array_merge($stateful, $domainsToAdd));
                    config(['sanctum.stateful' => $newStateful]);
                }
            } catch (\Throwable $e) {
                // Malformed host in non-HTTP context (e.g. cli-server without valid request)
            }
        }
    }
}
