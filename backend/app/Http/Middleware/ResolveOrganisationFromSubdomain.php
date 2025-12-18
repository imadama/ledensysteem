<?php

namespace App\Http\Middleware;

use App\Models\Organisation;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ResolveOrganisationFromSubdomain
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $subdomain = $this->extractSubdomain($request);

        // Platform admin subdomein - controleer toegang
        if ($subdomain === 'portal') {
            // Voor geauthenticeerde requests: alleen platform admins toegestaan
            if ($request->user() && ! $request->user()->hasRole('platform_admin')) {
                return response()->json([
                    'message' => 'Alleen platform beheerders hebben toegang tot portal.aidatim.nl',
                ], 403);
            }

            return $next($request);
        }

        // Backend zelf - geen organisatie context
        if ($subdomain === 'app' || $subdomain === null) {
            // Voor app.aidatim.nl of hoofddomein: alleen toegestaan voor platform admin routes
            // of publieke routes (login, register, etc.)
            return $next($request);
        }

        // Zoek organisatie op basis van subdomein
        $organisation = Organisation::where('subdomain', $subdomain)->first();

        if (! $organisation) {
            return response()->json([
                'message' => 'Organisatie niet gevonden voor dit subdomein.',
            ], 404);
        }

        // Controleer of organisatie geblokkeerd is
        if ($organisation->status === 'blocked') {
            return response()->json([
                'message' => 'Deze organisatie is geblokkeerd.',
            ], 403);
        }

        // Sla organisatie op in request context
        $request->attributes->set('organisation', $organisation);

        return $next($request);
    }

    /**
     * Extraheert subdomein uit request headers.
     */
    private function extractSubdomain(Request $request): ?string
    {
        // Prioriteit 1: Custom header (aanbevolen voor cross-domain requests)
        $subdomainHeader = $request->header('X-Organisation-Subdomain');
        if ($subdomainHeader) {
            return $this->normalizeSubdomain($subdomainHeader);
        }

        // Prioriteit 2: Origin header
        $origin = $request->header('Origin');
        if ($origin) {
            $subdomain = $this->extractSubdomainFromUrl($origin);
            if ($subdomain) {
                return $subdomain;
            }
        }

        // Prioriteit 3: Referer header
        $referer = $request->header('Referer');
        if ($referer) {
            $subdomain = $this->extractSubdomainFromUrl($referer);
            if ($subdomain) {
                return $subdomain;
            }
        }

        // Prioriteit 4: Host header (voor directe backend requests)
        $host = $request->header('Host');
        if ($host) {
            $subdomain = $this->extractSubdomainFromHost($host);
            if ($subdomain) {
                return $subdomain;
            }
        }

        return null;
    }

    /**
     * Extraheert subdomein uit URL (Origin/Referer).
     */
    private function extractSubdomainFromUrl(string $url): ?string
    {
        try {
            $parsed = parse_url($url);
            if (! isset($parsed['host'])) {
                return null;
            }

            return $this->extractSubdomainFromHost($parsed['host']);
        } catch (\Exception $e) {
            return null;
        }
    }

    /**
     * Extraheert subdomein uit hostname.
     */
    private function extractSubdomainFromHost(string $host): ?string
    {
        // Verwijder poort als aanwezig
        $host = explode(':', $host)[0];

        // Check voor .aidatim.nl
        if (! str_ends_with($host, '.aidatim.nl')) {
            return null;
        }

        // Extract subdomein (alles voor .aidatim.nl)
        $parts = explode('.', $host);
        if (count($parts) >= 3) {
            return $this->normalizeSubdomain($parts[0]);
        }

        return null;
    }

    /**
     * Normaliseert subdomein (lowercase, trim).
     */
    private function normalizeSubdomain(string $subdomain): string
    {
        return strtolower(trim($subdomain));
    }
}
