<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;

use App\Models\Organisation;
use App\Models\OrganisationSubscription;
use App\Models\User;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\Response;

class AuthController extends Controller
{
    public function registerOrganisation(Request $request): JsonResponse
    {
        $validated = $request->validate(
            [
                'organisation.name' => ['required', 'string', 'max:255'],
                'organisation.type' => ['required', 'string', 'max:255'],
                'organisation.city' => ['nullable', 'string', 'max:255'],
                'organisation.country' => ['nullable', 'string', 'max:255'],
                'organisation.contact_email' => ['required', 'email', 'max:255'],
                'admin.first_name' => ['required', 'string', 'max:255'],
                'admin.last_name' => ['required', 'string', 'max:255'],
                'admin.email' => ['required', 'email', 'max:255', 'unique:users,email'],
                'admin.password' => ['required', 'string', 'min:8', 'confirmed'],
                'accept_terms' => ['accepted'],
            ],
            [
                'accept_terms.accepted' => __('You must accept the terms of service.'),
            ]
        );

        [$organisation, $user] = DB::transaction(function () use ($validated) {
            $organisationData = $validated['organisation'];

            // Genereer uniek subdomein op basis van organisatienaam
            $subdomain = Organisation::generateSubdomainFromName($organisationData['name']);

            $organisation = Organisation::create([
                'name' => $organisationData['name'],
                'type' => $organisationData['type'],
                'city' => $organisationData['city'] ?? null,
                'country' => $organisationData['country'] ?? null,
                'contact_email' => $organisationData['contact_email'],
                'status' => 'new',
                'billing_status' => 'pending_payment',
                'subdomain' => $subdomain,
            ]);

            $adminData = $validated['admin'];
            $user = User::create([
                'first_name' => $adminData['first_name'],
                'last_name' => $adminData['last_name'],
                'name' => trim($adminData['first_name'].' '.$adminData['last_name']),
                'email' => $adminData['email'],
                'password' => Hash::make($adminData['password']),
                'status' => 'active',
                'organisation_id' => $organisation->id,
            ]);

            $user->assignRole('org_admin');

            return [$organisation, $user];
        });

        $user->refresh()->load('roles', 'organisation.currentSubscription.plan');

        return response()->json(
            [
                'organisation' => $this->transformOrganisation($organisation),
                'user' => $this->transformUser($user),
            ],
            Response::HTTP_CREATED
        );
    }

    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        if (! Auth::attempt($credentials)) {
            throw ValidationException::withMessages([
                'email' => [__('auth.failed')],
            ]);
        }

        $request->session()->regenerate();

        /** @var User $user */
        $user = $request->user()->load('roles', 'organisation.currentSubscription.plan');

        if ($user->status !== 'active') {
            $this->logoutUser($request);

            throw ValidationException::withMessages([
                'email' => [__('Your account is not active.')],
            ]);
        }

        if ($user->organisation && $user->organisation->status === 'blocked') {
            $this->logoutUser($request);

            throw ValidationException::withMessages([
                'email' => [__('Uw account is geblokkeerd. Neem contact op met Aidatim voor meer informatie.')],
            ]);
        }

        return response()->json($this->transformUser($user));
    }

    public function logout(Request $request): JsonResponse
    {
        $this->logoutUser($request);

        return response()->json(['message' => 'Logged out']);
    }

    public function me(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user()->load('roles', 'organisation.currentSubscription.plan');

        return response()->json($this->transformUser($user));
    }

    public function forgotPassword(Request $request): JsonResponse
    {
        $request->validate([
            'email' => ['required', 'email'],
        ]);

        Password::sendResetLink(
            $request->only('email'),
            function ($user, string $token) use ($request): void {
                $user->sendPasswordResetNotification($token);
            }
        );

        return response()->json([
            'message' => __('If an account exists for that email, a reset link has been sent.'),
        ]);
    }

    public function resetPassword(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'token' => ['required', 'string'],
            'email' => ['required', 'email'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $status = Password::reset(
            $validated,
            function (User $user, string $password) use ($request): void {
                $user->forceFill([
                    'password' => Hash::make($password),
                    'remember_token' => Str::random(60),
                ])->save();

                event(new PasswordReset($user));

                // Optional auto-login: disabled by default. Uncomment to enable.
                // Auth::login($user);
            }
        );

        if ($status !== Password::PASSWORD_RESET) {
            throw ValidationException::withMessages([
                'email' => [__($status)],
            ]);
        }

        return response()->json([
            'message' => __('Your password has been reset.'),
        ]);
    }

    protected function logoutUser(Request $request): void
    {
        Auth::guard('web')->logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();
    }

    protected function transformUser(User $user): array
    {
        return [
            'id' => $user->id,
            'first_name' => $user->first_name,
            'last_name' => $user->last_name,
            'name' => $user->name,
            'email' => $user->email,
            'status' => $user->status,
            'roles' => $user->roles->pluck('name')->values()->all(),
            'organisation' => $user->organisation
                ? $this->transformOrganisation($user->organisation, $user)
                : null,
        ];
    }

    protected function transformOrganisation(Organisation $organisation, ?User $forUser = null): array
    {
        $subscriptionSummary = null;

        // Check of user org_admin rol heeft (gebruik geladen roles als beschikbaar)
        $isOrgAdmin = $forUser && (
            ($forUser->relationLoaded('roles') && $forUser->roles->contains(fn ($role) => $role->name === 'org_admin'))
            || $forUser->hasRole('org_admin')
        );

        if ($isOrgAdmin) {
            $organisation->loadMissing('currentSubscription.plan');
            $subscriptionSummary = $this->transformSubscription($organisation->currentSubscription);
        }

        return [
            'id' => $organisation->id,
            'name' => $organisation->name,
            'type' => $organisation->type,
            'subdomain' => $organisation->subdomain,
            'status' => $organisation->status,
            'billing_status' => $organisation->billing_status,
            'billing_note' => $organisation->billing_note,
            'city' => $organisation->city,
            'country' => $organisation->country,
            'contact_email' => $organisation->contact_email,
            'subscription' => $subscriptionSummary,
        ];
    }

    protected function transformSubscription(?OrganisationSubscription $subscription): ?array
    {
        if (! $subscription) {
            return null;
        }

        $plan = $subscription->plan;

        return [
            'plan' => $plan ? [
                'id' => $plan->id,
                'name' => $plan->name,
            ] : null,
            'status' => $subscription->status,
            'current_period_end' => $subscription->current_period_end?->toIso8601String(),
        ];
    }
}

