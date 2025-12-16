<?php

namespace App\Models\Concerns;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\Auth;

trait OrganisationScoped
{
    public function scopeForCurrentOrganisation(Builder $query): Builder
    {
        $user = Auth::user();

        if (! $user) {
            return $query;
        }

        if ($user->hasRole('platform_admin')) {
            return $query;
        }

        // Prioriteit 1: Request context organisatie (van subdomein)
        $organisation = request()->attributes->get('organisation');
        if ($organisation) {
            $column = $query->qualifyColumn('organisation_id');
            return $query->where($column, $organisation->id);
        }

        // Fallback: user organisation_id (voor backwards compatibility)
        $column = $query->qualifyColumn('organisation_id');

        if (is_null($user->organisation_id)) {
            return $query->whereNull($column);
        }

        return $query->where($column, $user->organisation_id);
    }
}

