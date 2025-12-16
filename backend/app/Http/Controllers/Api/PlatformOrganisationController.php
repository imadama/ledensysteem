<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Organisation;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
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

