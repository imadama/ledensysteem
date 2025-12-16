<?php

namespace App\Services\Concerns;

use App\Models\Organisation;
use Illuminate\Support\Facades\Auth;

trait ResolvesOrganisation
{
    /**
     * Haalt de huidige organisatie op uit request context of user.
     */
    protected function getCurrentOrganisation(?\App\Models\User $user = null): ?Organisation
    {
        // Prioriteit 1: Request context organisatie (van subdomein)
        $organisation = request()->attributes->get('organisation');
        if ($organisation instanceof Organisation) {
            return $organisation;
        }

        // Fallback: user organisation_id (voor backwards compatibility)
        $user = $user ?? Auth::user();
        if ($user && $user->organisation_id) {
            return Organisation::find($user->organisation_id);
        }

        return null;
    }

    /**
     * Vereist dat er een organisatie beschikbaar is en retourneert het ID.
     *
     * @throws \Symfony\Component\HttpKernel\Exception\HttpException
     */
    protected function requireOrganisationId(?\App\Models\User $user = null): int
    {
        $organisation = $this->getCurrentOrganisation($user);

        if (! $organisation) {
            abort(403, 'User has no associated organisation.');
        }

        return (int) $organisation->id;
    }
}
