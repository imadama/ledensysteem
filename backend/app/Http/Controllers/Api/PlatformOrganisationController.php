<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Organisation;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

class PlatformOrganisationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $organisations = Organisation::query()
            ->with(['users' => fn ($query) => $query->with('roles')->orderBy('created_at')->limit(1)])
            ->orderByDesc('created_at')
            ->paginate($request->integer('per_page', 15));

        $data = $organisations->getCollection()
            ->map(fn (Organisation $organisation) => $this->transformOrganisationSummary($organisation))
            ->values()
            ->all();

        return response()->json([
            'data' => $data,
            'meta' => [
                'current_page' => $organisations->currentPage(),
                'last_page' => $organisations->lastPage(),
                'per_page' => $organisations->perPage(),
                'total' => $organisations->total(),
            ],
        ]);
    }

    public function show(int $id): JsonResponse
    {
        $organisation = Organisation::query()
            ->with([
                'users' => fn ($query) => $query
                    ->with('roles')
                    ->orderBy('last_name')
                    ->orderBy('first_name'),
            ])
            ->findOrFail($id);

        return response()->json($this->transformOrganisationDetail($organisation));
    }

    public function activate(int $id): JsonResponse
    {
        $organisation = $this->updateStatus($id, 'active');

        return response()->json($this->transformOrganisationSummary($organisation));
    }

    public function block(int $id): JsonResponse
    {
        $organisation = $this->updateStatus($id, 'blocked');

        return response()->json($this->transformOrganisationSummary($organisation));
    }

    protected function updateStatus(int $id, string $status): Organisation
    {
        $organisation = Organisation::findOrFail($id);

        $organisation->update(['status' => $status]);

        return $organisation->fresh();
    }

    protected function transformOrganisationSummary(Organisation $organisation): array
    {
        $primaryContact = $organisation->users->first();

        return [
            'id' => $organisation->id,
            'name' => $organisation->name,
            'type' => $organisation->type,
            'city' => $organisation->city,
            'country' => $organisation->country,
            'contact_email' => $organisation->contact_email,
            'status' => $organisation->status,
            'created_at' => $organisation->created_at?->toIso8601String(),
            'primary_contact' => $primaryContact ? [
                'id' => $primaryContact->id,
                'first_name' => $primaryContact->first_name,
                'last_name' => $primaryContact->last_name,
                'email' => $primaryContact->email,
                'status' => $primaryContact->status,
            ] : null,
        ];
    }

    protected function transformOrganisationDetail(Organisation $organisation): array
    {
        return [
            'organisation' => $this->transformOrganisationSummary($organisation),
            'users' => $organisation->users
                ->map(fn ($user) => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'status' => $user->status,
                    'roles' => $user->roles->pluck('name')->values()->all(),
                ])->values()->all(),
        ];
    }
}

