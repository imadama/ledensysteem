<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\MemberActivationRequest;
use App\Models\MemberInvitation;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class MemberActivationController extends Controller
{
    public function show(string $token): JsonResponse
    {
        $invitation = $this->findInvitation($token);

        if (! $invitation) {
            return $this->invalidInvitationResponse(404, __('Uitnodiging is niet gevonden.'), 'not_found');
        }

        if ($error = $this->validateInvitation($invitation)) {
            return $this->invalidInvitationResponse($error['status'], $error['message'], $error['reason']);
        }

        $member = $invitation->member;
        $organisation = $member?->organisation;

        return response()->json([
            'can_activate' => true,
            'data' => [
                'member_name' => $member?->full_name,
                'organisation_name' => $organisation?->name,
                'email' => $invitation->email ?? $member?->email,
                'expires_at' => $invitation->expires_at?->toIso8601String(),
            ],
        ]);
    }

    public function store(MemberActivationRequest $request, string $token): JsonResponse
    {
        $invitation = $this->findInvitation($token);

        if (! $invitation) {
            return $this->invalidInvitationResponse(404, __('Uitnodiging is niet gevonden.'), 'not_found');
        }

        if ($error = $this->validateInvitation($invitation)) {
            return $this->invalidInvitationResponse($error['status'], $error['message'], $error['reason']);
        }

        $member = $invitation->member;

        if (! $member) {
            return $this->invalidInvitationResponse(404, __('Lid hoort niet meer bij het systeem.'), 'member_missing');
        }

        $member->loadMissing('organisation', 'user.roles');

        if ($member->hasActiveAccount()) {
            throw ValidationException::withMessages([
                'account' => __('Dit lid heeft al een actief account.'),
            ]);
        }

        $password = $request->validated('password');
        $email = $invitation->email ?? $member->email;

        if (! $email) {
            throw ValidationException::withMessages([
                'email' => __('Er is geen e-mailadres beschikbaar voor dit lid.'),
            ]);
        }

        $existingUserWithEmail = User::where('email', $email)
            ->when($member->user, fn ($query) => $query->where('id', '!=', $member->user->id))
            ->exists();

        if ($existingUserWithEmail) {
            throw ValidationException::withMessages([
                'email' => __('Dit e-mailadres is al in gebruik.'),
            ]);
        }

        $user = DB::transaction(function () use ($member, $invitation, $password, $email) {
            $user = $member->user;

            $userData = [
                'first_name' => $member->first_name,
                'last_name' => $member->last_name,
                'name' => $member->full_name,
                'email' => $email,
                'status' => 'active',
                'organisation_id' => $member->organisation_id,
                'member_id' => $member->id,
                'password' => Hash::make($password),
                'email_verified_at' => now(),
            ];

            if ($user) {
                $user->fill(Arr::except($userData, ['password']));
                $user->password = $userData['password'];
                $user->email_verified_at = $userData['email_verified_at'];
                $user->organisation_id = $userData['organisation_id'];
                $user->member_id = $userData['member_id'];
                $user->status = 'active';
                $user->save();
            } else {
                $user = User::create($userData);
            }

            if (! $user->hasRole('member')) {
                $user->assignRole('member');
            }

            $invitation->status = 'used';
            $invitation->used_at = now();
            $invitation->save();

            return $user;
        });

        $user->loadMissing('roles', 'member.organisation');
        $member->setRelation('user', $user);

        $accessToken = $user->createToken('member-portal');

        return response()->json([
            'message' => __('Account geactiveerd.'),
            'data' => [
                'user' => [
                    'id' => $user->id,
                    'email' => $user->email,
                    'status' => $user->status,
                    'roles' => $user->roles->pluck('name'),
                ],
                'member' => [
                    'id' => $member->id,
                    'full_name' => $member->full_name,
                ],
                'organisation' => [
                    'id' => $member->organisation?->id,
                    'name' => $member->organisation?->name,
                ],
                'access_token' => $accessToken->plainTextToken,
                'token_type' => 'Bearer',
            ],
        ]);
    }

    private function findInvitation(string $token): ?MemberInvitation
    {
        return MemberInvitation::query()
            ->with('member.organisation', 'member.user.roles')
            ->where('token', $token)
            ->first();
    }

    /**
     * @return array{status:int,message:string,reason:string}|null
     */
    private function validateInvitation(MemberInvitation $invitation): ?array
    {
        if ($invitation->status !== 'pending') {
            return [
                'status' => 400,
                'message' => __('Deze uitnodiging is niet meer geldig.'),
                'reason' => 'not_pending',
            ];
        }

        if ($invitation->used_at) {
            return [
                'status' => 400,
                'message' => __('Deze uitnodiging is al gebruikt.'),
                'reason' => 'used',
            ];
        }

        if ($invitation->expires_at && $invitation->expires_at->isPast()) {
            return [
                'status' => 400,
                'message' => __('Deze uitnodiging is verlopen.'),
                'reason' => 'expired',
            ];
        }

        if (! $invitation->member) {
            return [
                'status' => 404,
                'message' => __('Het bijbehorende lid bestaat niet meer.'),
                'reason' => 'member_missing',
            ];
        }

        return null;
    }

    private function invalidInvitationResponse(int $status, string $message, ?string $reason = null): JsonResponse
    {
        return response()->json([
            'message' => $message,
            'reason' => $reason,
            'can_activate' => false,
        ], $status);
    }
}


