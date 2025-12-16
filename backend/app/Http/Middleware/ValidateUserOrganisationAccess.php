<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class ValidateUserOrganisationAccess
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = Auth::user();

        // Alleen voor geauthenticeerde requests
        if (! $user) {
            return $next($request);
        }

        // Platform admins hebben altijd toegang
        if ($user->hasRole('platform_admin')) {
            return $next($request);
        }

        // Haal organisatie uit request context
        $organisation = $request->attributes->get('organisation');

        // Als er geen organisatie context is, is het waarschijnlijk een platform admin route
        // of een publieke route - laat door
        if (! $organisation) {
            return $next($request);
        }

        // Controleer of gebruiker toegang heeft tot deze organisatie
        if ($user->organisation_id !== $organisation->id) {
            return response()->json([
                'message' => 'U heeft geen toegang tot deze organisatie.',
            ], 403);
        }

        return $next($request);
    }
}
