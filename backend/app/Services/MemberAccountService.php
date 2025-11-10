<?php

namespace App\Services;

use App\Mail\MemberInvitationMailable;
use App\Models\Member;
use App\Models\MemberInvitation;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class MemberAccountService
{
    public function inviteMember(User $actor, Member $member): MemberInvitation
    {
        $this->ensureSameOrganisation($actor, $member);

        if (! $member->email) {
            throw ValidationException::withMessages([
                'email' => __('Dit lid heeft geen e-mailadres en kan niet worden uitgenodigd.'),
            ]);
        }

        $member->loadMissing('user.roles');

        if ($member->hasActiveAccount()) {
            throw ValidationException::withMessages([
                'account' => __('Dit lid heeft al een actief account.'),
            ]);
        }

        $invitation = $this->findOrCreatePendingInvitation($member);

        if ($invitation->exists) {
            $invitation->created_at = Carbon::now();
        }

        $invitation->email = $member->email;
        $invitation->status = 'pending';
        $invitation->token = $this->generateUniqueToken();
        $invitation->expires_at = Carbon::now()->addDays(7);
        $invitation->used_at = null;
        $invitation->save();

        $invitation->refresh();

        $invitationForMail = $invitation->load('member.organisation');

        Mail::to($invitation->email)->send(new MemberInvitationMailable($invitationForMail));

        return $invitation;
    }

    /**
     * @param list<int> $memberIds
     *
     * @return array<string, mixed>
     */
    public function inviteMembersBulk(User $actor, array $memberIds): array
    {
        $organisationId = $this->requireOrganisationId($actor);

        $members = Member::query()
            ->whereIn('id', $memberIds)
            ->where('organisation_id', $organisationId)
            ->with('user.roles')
            ->get()
            ->keyBy('id');

        $results = [];
        $invitedCount = 0;
        $skippedCount = 0;

        foreach ($memberIds as $memberId) {
            $member = $members->get($memberId);

            if (! $member) {
                $skippedCount++;

                $results[] = [
                    'member_id' => $memberId,
                    'status' => 'skipped',
                    'reason' => 'member_not_found',
                ];

                continue;
            }

            try {
                $invitation = $this->inviteMember($actor, $member);

                $invitedCount++;

                $results[] = [
                    'member_id' => $memberId,
                    'status' => 'invited',
                    'invitation_id' => $invitation->id,
                ];
            } catch (ValidationException $exception) {
                $skippedCount++;

                $results[] = [
                    'member_id' => $memberId,
                    'status' => 'skipped',
                    'reason' => $this->flattenValidationErrors($exception),
                ];
            } catch (\Throwable $exception) {
                $skippedCount++;

                $results[] = [
                    'member_id' => $memberId,
                    'status' => 'error',
                    'reason' => $exception->getMessage(),
                ];
            }
        }

        return [
            'invited_count' => $invitedCount,
            'skipped_count' => $skippedCount,
            'results' => $results,
        ];
    }

    public function blockMemberAccount(User $actor, Member $member): User
    {
        $this->ensureSameOrganisation($actor, $member);

        $accountUser = $this->findMemberAccountUser($member);

        if (! $accountUser) {
            throw ValidationException::withMessages([
                'account' => __('Dit lid heeft geen gekoppeld account om te blokkeren.'),
            ]);
        }

        $accountUser->status = 'blocked';
        $accountUser->save();

        return $accountUser->refresh();
    }

    public function unblockMemberAccount(User $actor, Member $member): User
    {
        $this->ensureSameOrganisation($actor, $member);

        $accountUser = $this->findMemberAccountUser($member);

        if (! $accountUser) {
            throw ValidationException::withMessages([
                'account' => __('Dit lid heeft geen gekoppeld account om te deblokkeren.'),
            ]);
        }

        $accountUser->status = 'active';
        $accountUser->save();

        return $accountUser->refresh();
    }

    private function findOrCreatePendingInvitation(Member $member): MemberInvitation
    {
        $existing = $member->pendingMemberInvitation;

        if ($existing) {
            return $existing;
        }

        $invitation = new MemberInvitation();
        $invitation->member_id = $member->id;

        return $invitation;
    }

    private function findMemberAccountUser(Member $member): ?User
    {
        return $member->user()
            ->whereHas('roles', fn ($query) => $query->where('name', 'member'))
            ->first();
    }

    private function generateUniqueToken(): string
    {
        do {
            $token = Str::random(64);
        } while (MemberInvitation::where('token', $token)->exists());

        return $token;
    }

    private function ensureSameOrganisation(User $user, Member $member): void
    {
        $organisationId = $this->requireOrganisationId($user);

        if ((int) $member->organisation_id !== $organisationId) {
            abort(403, 'Lid behoort niet tot deze organisatie.');
        }
    }

    private function requireOrganisationId(User $user): int
    {
        if (! $user->organisation_id) {
            abort(403, 'Gebruiker heeft geen organisatiecontext.');
        }

        return (int) $user->organisation_id;
    }

    private function flattenValidationErrors(ValidationException $exception): string
    {
        return collect($exception->errors())
            ->flatten()
            ->implode(' ');
    }
}


