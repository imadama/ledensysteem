<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\OrganisationUserService;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\Response;

class OrganisationUserController extends Controller
{
    public function __construct(private OrganisationUserService $service)
    {
    }

    public function index(Request $request): JsonResponse
    {
        /** @var User $admin */
        $admin = $request->user()->load('roles');

        $users = $this->service->listUsersFor($admin);
        $data = collect($users->items())
            ->map(fn (User $user) => $this->transformUser($user))
            ->values()
            ->all();

        return response()->json([
            'data' => $data,
            'meta' => [
                'current_page' => $users->currentPage(),
                'last_page' => $users->lastPage(),
                'per_page' => $users->perPage(),
                'total' => $users->total(),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        /** @var User $admin */
        $admin = $request->user();

        $data = $request->validate([
            'first_name' => ['required', 'string', 'max:255'],
            'last_name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')],
            'status' => ['sometimes', 'string', Rule::in(['pending', 'active'])],
            'role' => ['sometimes', 'string', Rule::in(['org_admin', 'monitor'])],
        ]);

        $user = $this->service->createUser($admin, $data);

        return response()->json($this->transformUser($user), Response::HTTP_CREATED);
    }

    public function block(Request $request, int $id): JsonResponse
    {
        return $this->updateStatus($request, $id, fn (User $target) => $this->service->blockUser($request->user(), $target));
    }

    public function unblock(Request $request, int $id): JsonResponse
    {
        return $this->updateStatus($request, $id, fn (User $target) => $this->service->unblockUser($request->user(), $target));
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $target = $this->findTargetUser($request->user(), $id);

        $this->service->deleteUser($request->user(), $target);

        return response()->json(status: Response::HTTP_NO_CONTENT);
    }

    protected function updateStatus(Request $request, int $id, callable $callback): JsonResponse
    {
        /** @var User $admin */
        $admin = $request->user();
        $target = $this->findTargetUser($admin, $id);

        $updated = $callback($target);

        return response()->json($this->transformUser($updated));
    }

    protected function findTargetUser(User $admin, int $id): User
    {
        $user = User::query()
            ->with('roles')
            ->whereKey($id)
            ->first();

        if (! $user) {
            abort(Response::HTTP_NOT_FOUND);
        }

        if ($user->organisation_id !== $admin->organisation_id) {
            throw new AuthorizationException(__('You cannot manage users from another organisation.'));
        }

        return $user;
    }

    protected function transformUser(User $user): array
    {
        $user->loadMissing('roles');

        return [
            'id' => $user->id,
            'first_name' => $user->first_name,
            'last_name' => $user->last_name,
            'email' => $user->email,
            'status' => $user->status,
            'roles' => $user->roles->pluck('name')->values()->all(),
        ];
    }
}

