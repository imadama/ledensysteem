<?php

namespace App\Services;

use App\Models\User;
use App\Services\Concerns\ResolvesOrganisation;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class OrganisationUserService
{
    use ResolvesOrganisation;

    public function listUsersFor(User $admin): LengthAwarePaginator
    {
        $organisationId = $this->requireOrganisationId($admin);

        return User::query()
            ->with('roles')
            ->where('organisation_id', $organisationId)
            ->orderBy('last_name')
            ->orderBy('first_name')
            ->paginate();
    }

    public function createUser(User $admin, array $data): User
    {
        $organisationId = $this->requireOrganisationId($admin);

        return DB::transaction(function () use ($organisationId, $data) {
            $user = User::create([
                'first_name' => $data['first_name'],
                'last_name' => $data['last_name'],
                'name' => trim($data['first_name'].' '.$data['last_name']),
                'email' => $data['email'],
                'password' => bcrypt(Str::random(32)),
                'status' => $data['status'] ?? 'pending',
                'organisation_id' => $organisationId,
            ]);

            $role = $data['role'] ?? 'org_admin';
            $user->assignRole($role);

            $token = Password::createToken($user);
            $user->sendPasswordResetNotification($token);

            return $user->load('roles');
        });
    }

    public function blockUser(User $admin, User $user): User
    {
        $this->ensureSameOrganisation($admin, $user);
        $this->ensureCanModifyAdminCount($admin, $user, 'block');

        $user->update(['status' => 'blocked']);

        return $user->fresh('roles');
    }

    public function unblockUser(User $admin, User $user): User
    {
        $this->ensureSameOrganisation($admin, $user);

        $user->update(['status' => 'active']);

        return $user->fresh('roles');
    }

    public function deleteUser(User $admin, User $user): void
    {
        $this->ensureSameOrganisation($admin, $user);
        $this->ensureCanModifyAdminCount($admin, $user, 'delete');

        $user->delete();
    }

    protected function ensureSameOrganisation(User $admin, User $user): void
    {
        $organisationId = $this->requireOrganisationId($admin);

        if ($user->organisation_id !== $organisationId) {
            throw new AuthorizationException(__('You cannot manage users from another organisation.'));
        }
    }

    protected function ensureCanModifyAdminCount(User $admin, User $targetUser, string $action): void
    {
        if ($targetUser->status !== 'active' || ! $targetUser->hasRole('org_admin')) {
            return;
        }

        $organisationId = $this->requireOrganisationId($admin);

        $activeAdminCount = User::query()
            ->where('organisation_id', $organisationId)
            ->where('status', 'active')
            ->whereHas('roles', fn ($query) => $query->where('name', 'org_admin'))
            ->count();

        if ($activeAdminCount <= 1) {
            throw ValidationException::withMessages([
                'user' => [__('Cannot :action the last active admin in the organisation.', ['action' => $action])],
            ]);
        }
    }
}

