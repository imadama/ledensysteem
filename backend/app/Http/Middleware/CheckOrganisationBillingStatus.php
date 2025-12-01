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
        return in_array($organisation->billing_status, ['pending_payment', 'restricted'], true);
    }

    private function shouldAllowRestrictedRequest(Request $request): bool
    {
        if (in_array($request->method(), ['GET', 'HEAD', 'OPTIONS'], true)) {
            return true;
        }

        $route = $request->route();
        $uri = $route?->uri();

        $allowedUris = [
            'organisation/subscription/start',
        ];

        $allowedPrefixes = [
            'organisation/payments/connection',
        ];

        if ($uri && in_array($uri, $allowedUris, true)) {
            return true;
        }

        if ($uri) {
            foreach ($allowedPrefixes as $prefix) {
                if (str_starts_with($uri, $prefix)) {
                    return true;
                }
            }
        }

        return false;
    }
}
