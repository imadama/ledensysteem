<?php

namespace App\Services;

use App\Models\Member;
use App\Models\MemberContributionHistory;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Arr;
use Illuminate\Validation\ValidationException;

class MemberService
{
    /**
     * @param array<string, mixed> $filters
     */
    public function paginateForOrganisation(User $user, array $filters): LengthAwarePaginator
    {
        $organisationId = $this->requireOrganisationId($user);

        $query = Member::query()
            ->with([
                'user.roles',
                'latestMemberInvitation',
                'pendingMemberInvitation',
                'activeSubscription',
            ])
            ->where('organisation_id', $organisationId);

        $this->applySearchFilters($query, $filters);
        $this->applyStatusFilter($query, $filters);
        $this->applySorting($query, $filters);

        $perPage = (int) ($filters['per_page'] ?? 15);

        if ($perPage <= 0 || $perPage > 100) {
            $perPage = 15;
        }

        return $query->paginate($perPage);
    }

    /**
     * @param array<string, mixed> $data
     */
    public function createForOrganisation(User $user, array $data): Member
    {
        $organisationId = $this->requireOrganisationId($user);

        $payload = $this->preparePayload($data);
        $payload['organisation_id'] = $organisationId;

        return Member::create($payload);
    }

    /**
     * @param array<string, mixed> $data
     */
    public function updateMember(Member $member, User $user, array $data): Member
    {
        $this->guardSameOrganisation($member, $user);

        $payload = $this->preparePayload($data);

        $member->fill($payload);

        $changedContributionFields = $member->isDirty([
            'contribution_amount',
            'contribution_frequency',
            'contribution_start_date',
            'contribution_note',
        ]);

        $originalContribution = $member->getOriginal();

        $member->save();

        if ($changedContributionFields) {
            $this->storeContributionHistory($member, $user->id, $originalContribution);
        }

        return $member->refresh();
    }

    public function updateStatus(Member $member, User $user, string $status): Member
    {
        $this->guardSameOrganisation($member, $user);

        $member->status = $status;
        $member->save();

        return $member->refresh();
    }

    public function findForOrganisation(User $user, int $memberId): Member
    {
        $organisationId = $this->requireOrganisationId($user);

        /** @var Member|null $member */
        $member = Member::query()
            ->with([
                'user.roles',
                'latestMemberInvitation',
                'pendingMemberInvitation',
                'activeSubscription',
            ])
            ->where('organisation_id', $organisationId)
            ->find($memberId);

        if (! $member) {
            abort(404, 'Member not found.');
        }

        return $member;
    }

    private function requireOrganisationId(User $user): int
    {
        if (! $user->organisation_id) {
            abort(403, 'User has no associated organisation.');
        }

        return (int) $user->organisation_id;
    }

    /**
     * @param array<string, mixed> $data
     *
     * @return array<string, mixed>
     */
    private function preparePayload(array $data): array
    {
        $allowed = [
            'member_number',
            'first_name',
            'last_name',
            'gender',
            'birth_date',
            'email',
            'phone',
            'street_address',
            'postal_code',
            'city',
            'iban',
            'status',
            'contribution_amount',
            'contribution_frequency',
            'contribution_start_date',
            'contribution_note',
        ];

        $payload = Arr::only($data, $allowed);

        if (array_key_exists('contribution_amount', $payload) && $payload['contribution_amount'] !== null) {
            $payload['contribution_amount'] = $this->formatDecimal($payload['contribution_amount']);
        }

        return $payload;
    }

    /**
     * @param array<string, mixed> $filters
     */
    private function applySearchFilters(Builder $query, array $filters): void
    {
        $search = $filters['q'] ?? null;

        if (! $search || ! is_string($search)) {
            return;
        }

        $query->where(function (Builder $builder) use ($search): void {
            $builder
                ->where('member_number', 'like', '%'.$search.'%')
                ->orWhere('first_name', 'like', '%'.$search.'%')
                ->orWhere('last_name', 'like', '%'.$search.'%')
                ->orWhere('email', 'like', '%'.$search.'%');
        });
    }

    /**
     * @param array<string, mixed> $filters
     */
    private function applyStatusFilter(Builder $query, array $filters): void
    {
        $status = $filters['status'] ?? null;

        if (! $status) {
            return;
        }

        if (! in_array($status, ['active', 'inactive'], true)) {
            throw ValidationException::withMessages([
                'status' => 'Invalid status filter value.',
            ]);
        }

        $query->where('status', $status);
    }

    /**
     * @param array<string, mixed> $filters
     */
    private function applySorting(Builder $query, array $filters): void
    {
        $sortBy = $filters['sort_by'] ?? 'last_name';
        $direction = strtolower((string) ($filters['sort_direction'] ?? 'asc')) === 'desc' ? 'desc' : 'asc';

        $column = match ($sortBy) {
            'member_number' => 'member_number',
            'city' => 'city',
            'status' => 'status',
            'contribution_amount' => 'contribution_amount',
            'created_at' => 'created_at',
            'name', 'full_name' => null,
            default => 'last_name',
        };

        if ($column === null) {
            $query->orderBy('last_name', $direction)
                ->orderBy('first_name', $direction);

            return;
        }

        $query->orderBy($column, $direction);
    }

    /**
     * @param array<string, mixed> $originalContribution
     */
    private function storeContributionHistory(Member $member, int $userId, array $originalContribution): void
    {
        if (! class_exists(MemberContributionHistory::class)) {
            return;
        }

        MemberContributionHistory::create([
            'member_id' => $member->id,
            'changed_by' => $userId,
            'old_amount' => $originalContribution['contribution_amount'] ?? null,
            'old_frequency' => $originalContribution['contribution_frequency'] ?? null,
            'old_start_date' => $originalContribution['contribution_start_date'] ?? null,
            'old_note' => $originalContribution['contribution_note'] ?? null,
            'new_amount' => $member->contribution_amount,
            'new_frequency' => $member->contribution_frequency,
            'new_start_date' => $member->contribution_start_date?->toDateString(),
            'new_note' => $member->contribution_note,
        ]);
    }

    private function guardSameOrganisation(Member $member, User $user): void
    {
        $organisationId = $this->requireOrganisationId($user);

        if ((int) $member->organisation_id !== $organisationId) {
            abort(403, 'Member does not belong to this organisation.');
        }
    }

    /**
     * @param mixed $value
     */
    private function formatDecimal($value): string
    {
        return number_format((float) $value, 2, '.', '');
    }
}


