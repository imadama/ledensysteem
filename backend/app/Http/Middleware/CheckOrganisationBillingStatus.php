<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckOrganisationBillingStatus
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next)
    {
        $user = $request->user();

        if (! $user) {
            return $next($request);
        }

        $organisation = $user->organisation ?? $user->member?->organisation;

        if (! $organisation || ! method_exists($organisation, 'isBillingRestricted')) {
            return $next($request);
        }

        if (! $this->shouldBlockAccess($organisation)) {
            return $next($request);
        }

        if ($this->shouldAllowRestrictedRequest($request)) {
            return $next($request);
        }

        $message = match ($organisation->billing_status) {
            'pending_payment' => __('Payment required. Please select and pay for a subscription plan to access the platform.'),
            'restricted' => __('Your subscription has payment issues. Please update your payment method.'),
            default => __('Your subscription has payment issues. Please update your payment method.'),
        };

        return new JsonResponse([
            'message' => $message,
            'billing_status' => $organisation->billing_status,
            'billing_note' => $organisation->billing_note,
        ], Response::HTTP_PAYMENT_REQUIRED);
    }

    private function shouldBlockAccess($organisation): bool
    {
        // Als er geen subscription is, blokkeer dan alleen als billing_status = 'restricted'
        // Dit geeft organisaties zonder plan de mogelijkheid om het systeem te gebruiken
        if (! $organisation->currentSubscription) {
            return $organisation->billing_status === 'restricted';
        }

        // Als er wel een subscription is, blokkeer bij pending_payment of restricted
        return in_array($organisation->billing_status, ['pending_payment', 'restricted'], true);
    }

    private function shouldAllowRestrictedRequest(Request $request): bool
    {
        // OPTIONS requests altijd toestaan voor CORS
        if ($request->method() === 'OPTIONS') {
            return true;
        }

        $route = $request->route();
        $uri = $route?->uri();
        $path = $request->path(); // Volledige path inclusief api/ prefix

        // Toestaan: subscription en payment gerelateerde endpoints
        // Check zowel URI (zonder prefix) als volledige path (met api/)
        $allowedPatterns = [
            'organisation/subscription',
            'organisation/subscription/start',
            'organisation/subscription/history',
            'organisation/subscription/cancel',
            'organisation/subscription/upgrade',
            'organisation/subscription/downgrade',
            'organisation/payments/connection',
            'organisation/monitor', // Monitor pagina altijd toegankelijk
            'auth/me',
            'plans',
        ];

        // Check of URI of path match met een van de toegestane patronen
        foreach ($allowedPatterns as $pattern) {
            // Check URI (zonder api/ prefix)
            if ($uri && (str_starts_with($uri, $pattern) || $uri === $pattern)) {
                return true;
            }
            // Check volledige path (met api/ prefix)
            if ($path && (str_starts_with($path, "api/{$pattern}") || $path === "api/{$pattern}")) {
                return true;
            }
        }

        // Alle andere requests (inclusief GET) worden geblokkeerd als billing_status = pending_payment of restricted
        return false;
    }
}
