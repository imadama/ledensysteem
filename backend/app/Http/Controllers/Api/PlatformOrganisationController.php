<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\OrganisationSubdomainInvitationMailable;
use App\Models\Member;
use App\Models\MemberContributionHistory;
use App\Models\MemberInvitation;
use App\Models\MemberSubscription;
use App\Models\Organisation;
use App\Models\OrganisationStripeConnection;
use App\Models\OrganisationSubscription;
use App\Models\PaymentTransaction;
use App\Models\SubscriptionAuditLog;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Symfony\Component\HttpFoundation\Response;

class PlatformOrganisationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $organisations = Organisation::query()
            ->with([
                'users' => fn ($query) => $query->with('roles')->orderBy('created_at')->limit(1),
                'currentSubscription.plan',
            ])
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

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'type' => ['required', 'string', 'max:255'],
            'city' => ['nullable', 'string', 'max:255'],
            'country' => ['nullable', 'string', 'max:255'],
            'contact_email' => ['required', 'email', 'max:255'],
            'subdomain' => ['nullable', 'string', 'max:255', 'unique:organisations,subdomain'],
            'status' => ['sometimes', 'string', 'in:new,active,blocked'],
            'billing_status' => ['sometimes', 'string', 'in:ok,pending_payment,restricted'],
            'billing_note' => ['nullable', 'string', 'max:1000'],
        ]);

        // Genereer subdomein als niet opgegeven
        if (empty($validated['subdomain'])) {
            $validated['subdomain'] = Organisation::generateSubdomainFromName($validated['name']);
        }

        // Stel standaardwaarden in als niet opgegeven
        $validated['status'] = $validated['status'] ?? 'new';
        $validated['billing_status'] = $validated['billing_status'] ?? 'pending_payment';

        $organisation = Organisation::create($validated);
        $organisation->load([
            'users' => fn ($query) => $query->with('roles')->orderBy('created_at')->limit(1),
            'currentSubscription.plan',
        ]);

        return response()->json($this->transformOrganisationSummary($organisation), Response::HTTP_CREATED);
    }

    public function show(int $id): JsonResponse
    {
        $organisation = Organisation::query()
            ->with([
                'users' => fn ($query) => $query
                    ->with('roles')
                    ->orderBy('last_name')
                    ->orderBy('first_name'),
                'currentSubscription.plan',
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

    public function updateBillingStatus(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'billing_status' => ['required', 'string', 'in:ok,pending_payment,restricted'],
            'billing_note' => ['nullable', 'string', 'max:1000'],
        ]);

        $organisation = Organisation::findOrFail($id);
        $organisation->update($validated);

        return response()->json($this->transformOrganisationSummary($organisation->fresh()));
    }

    public function sendSubdomainInvitation(int $id): JsonResponse
    {
        $organisation = Organisation::findOrFail($id);

        if (! $organisation->subdomain) {
            return response()->json([
                'message' => 'Deze organisatie heeft geen subdomein.',
            ], Response::HTTP_BAD_REQUEST);
        }

        if (! $organisation->contact_email) {
            return response()->json([
                'message' => 'Deze organisatie heeft geen contact e-mailadres.',
            ], Response::HTTP_BAD_REQUEST);
        }

        try {
            Mail::to($organisation->contact_email)->send(new OrganisationSubdomainInvitationMailable($organisation));

            return response()->json([
                'message' => 'Uitnodiging is verstuurd naar '.$organisation->contact_email,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Kon uitnodiging niet versturen: '.$e->getMessage(),
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    public function destroy(int $id): JsonResponse
    {
        $organisation = Organisation::findOrFail($id);

        DB::transaction(function () use ($organisation): void {
            // Verwijder alle member subscriptions
            MemberSubscription::whereHas('member', function ($query) use ($organisation) {
                $query->where('organisation_id', $organisation->id);
            })->delete();

            // Verwijder alle member contribution histories
            MemberContributionHistory::whereHas('member', function ($query) use ($organisation) {
                $query->where('organisation_id', $organisation->id);
            })->delete();

            // Verwijder alle member invitations
            MemberInvitation::whereHas('member', function ($query) use ($organisation) {
                $query->where('organisation_id', $organisation->id);
            })->delete();

            // Verwijder alle members (cascade delete verwijdert automatisch contribution records)
            // Maar we doen het expliciet voor duidelijkheid
            $memberIds = Member::where('organisation_id', $organisation->id)->pluck('id');
            
            // Verwijder member contribution records
            DB::table('member_contribution_records')
                ->whereIn('member_id', $memberIds)
                ->delete();

            // Verwijder members
            Member::where('organisation_id', $organisation->id)->delete();

            // Verwijder alle payment transactions
            PaymentTransaction::where('organisation_id', $organisation->id)->delete();

            // Verwijder stripe connection
            OrganisationStripeConnection::where('organisation_id', $organisation->id)->delete();

            // Verwijder alle subscriptions
            OrganisationSubscription::where('organisation_id', $organisation->id)->delete();

            // Verwijder subscription audit logs
            SubscriptionAuditLog::where('organisation_id', $organisation->id)->delete();

            // Verwijder alle users van deze organisatie
            // Eerst roles loskoppelen
            $userIds = User::where('organisation_id', $organisation->id)->pluck('id');
            DB::table('role_user')
                ->whereIn('user_id', $userIds)
                ->delete();

            // Verwijder users
            User::where('organisation_id', $organisation->id)->delete();

            // Verwijder de organisatie zelf
            $organisation->delete();
        });

        return response()->json([
            'message' => 'Organisatie en alle gerelateerde data zijn verwijderd.',
        ]);
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
            'subdomain' => $organisation->subdomain,
            'city' => $organisation->city,
            'country' => $organisation->country,
            'contact_email' => $organisation->contact_email,
            'status' => $organisation->status,
            'billing_status' => $organisation->billing_status,
            'billing_note' => $organisation->billing_note,
            'created_at' => $organisation->created_at?->toIso8601String(),
            'subscription' => $this->transformSubscriptionSummary($organisation),
            'has_payment_issues' => $this->organisationHasPaymentIssues($organisation),
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

    protected function transformSubscriptionSummary(Organisation $organisation): ?array
    {
        $subscription = $organisation->currentSubscription;

        if (! $subscription) {
            return null;
        }

        $plan = $subscription->plan;

        return [
            'plan_name' => $plan?->name,
            'status' => $subscription->status,
            'current_period_end' => $subscription->current_period_end?->toIso8601String(),
        ];
    }

    public function auditLogs(int $id): JsonResponse
    {
        $organisation = Organisation::findOrFail($id);

        $logs = $organisation->subscriptionAuditLogs()
            ->with('user:id,name,email')
            ->orderByDesc('created_at')
            ->paginate(50);

        $data = $logs->getCollection()
            ->map(fn ($log) => [
                'id' => $log->id,
                'action_type' => $log->action_type,
                'description' => $log->description,
                'old_value' => $log->old_value,
                'new_value' => $log->new_value,
                'metadata' => $log->metadata,
                'user' => $log->user ? [
                    'id' => $log->user->id,
                    'name' => $log->user->name,
                    'email' => $log->user->email,
                ] : null,
                'created_at' => $log->created_at?->toIso8601String(),
            ])
            ->values()
            ->all();

        return response()->json([
            'data' => $data,
            'meta' => [
                'current_page' => $logs->currentPage(),
                'last_page' => $logs->lastPage(),
                'per_page' => $logs->perPage(),
                'total' => $logs->total(),
            ],
        ]);
    }

    protected function organisationHasPaymentIssues(Organisation $organisation): bool
    {
        $subscription = $organisation->currentSubscription;

        if (! $subscription) {
            return false;
        }

        if (in_array($subscription->status, ['past_due', 'unpaid'], true)) {
            return true;
        }

        return $organisation->billing_status === 'restricted';
    }
}

