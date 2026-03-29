<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Organisation;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OrganisationProfileController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        /** @var Organisation $organisation */
        $organisation = $request->user()->organisation;

        return response()->json([
            'data' => $this->transformOrganisation($organisation),
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        /** @var Organisation $organisation */
        $organisation = $request->user()->organisation;

        $data = $request->validate([
            'name'                      => ['required', 'string', 'max:255'],
            'type'                      => ['nullable', 'string', 'max:100'],
            'city'                      => ['nullable', 'string', 'max:100'],
            'country'                   => ['nullable', 'string', 'max:100'],
            'contact_email'             => ['nullable', 'email', 'max:255'],
            'pass_stripe_fee_to_member' => ['sometimes', 'boolean'],
            'billing_cycle_day'         => ['sometimes', 'integer', 'between:1,28'],
        ]);

        $organisation->update($data);

        return response()->json([
            'data' => $this->transformOrganisation($organisation),
        ]);
    }

    protected function transformOrganisation(Organisation $organisation): array
    {
        return [
            'name'                      => $organisation->name,
            'type'                      => $organisation->type,
            'city'                      => $organisation->city,
            'country'                   => $organisation->country,
            'contact_email'             => $organisation->contact_email,
            'pass_stripe_fee_to_member' => (bool) $organisation->pass_stripe_fee_to_member,
            'billing_cycle_day'         => (int) ($organisation->billing_cycle_day ?? 1),
        ];
    }
}
