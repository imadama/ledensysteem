<?php

namespace App\Http\Controllers\Api\Organisation;

use App\Exports\MemberTemplateExport;
use App\Http\Controllers\Controller;
use App\Http\Requests\Organisation\BulkInviteMembersRequest;
use App\Http\Requests\Organisation\StoreMemberRequest;
use App\Http\Requests\Organisation\UpdateMemberRequest;
use App\Http\Requests\Organisation\UpdateMemberStatusRequest;
use App\Http\Requests\Organisation\MemberImportPreviewRequest;
use App\Http\Requests\Organisation\MemberImportConfirmRequest;
use App\Models\Member;
use App\Models\MemberInvitation;
use App\Services\MemberService;
use App\Services\MemberImportService;
use App\Services\MemberAccountService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Arr;
use Maatwebsite\Excel\Facades\Excel;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class MemberController extends Controller
{
    public function __construct(
        private readonly MemberService $memberService,
        private readonly MemberImportService $memberImportService,
        private readonly MemberAccountService $memberAccountService,
    ) {
    }

    public function previewImport(MemberImportPreviewRequest $request): JsonResponse
    {
        $user = $request->user();

        /** @var \Illuminate\Http\UploadedFile $file */
        $file = $request->file('file');

        $result = $this->memberImportService->previewImport($user, $file);

        return response()->json($result);
    }

    public function confirmImport(MemberImportConfirmRequest $request): JsonResponse
    {
        $user = $request->user();

        $result = $this->memberImportService->confirmImport($user, $request->validated('import_token'));

        return response()->json($result);
    }

    public function downloadTemplate(): BinaryFileResponse
    {
        return Excel::download(new MemberTemplateExport(), 'leden_template.xlsx');
    }

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $members = $this->memberService->paginateForOrganisation($user, $request->only([
            'q',
            'status',
            'sort_by',
            'sort_direction',
            'per_page',
        ]));

        return response()->json([
            'data' => $this->transformMemberCollection($members->getCollection()),
            'meta' => [
                'current_page' => $members->currentPage(),
                'per_page' => $members->perPage(),
                'total' => $members->total(),
                'last_page' => $members->lastPage(),
            ],
        ]);
    }

    public function store(StoreMemberRequest $request): JsonResponse
    {
        $user = $request->user();

        $member = $this->memberService->createForOrganisation($user, $request->validated());

        return response()->json([
            'data' => $this->transformMember($member, includeDetails: true),
        ], 201);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $user = $request->user();

        $member = $this->memberService->findForOrganisation($user, $id);

        return response()->json([
            'data' => $this->transformMember($member, includeDetails: true),
        ]);
    }

    public function update(UpdateMemberRequest $request, int $id): JsonResponse
    {
        $user = $request->user();

        $member = $this->memberService->findForOrganisation($user, $id);

        $updated = $this->memberService->updateMember($member, $user, $request->validated());

        return response()->json([
            'data' => $this->transformMember($updated, includeDetails: true),
        ]);
    }

    public function updateStatus(UpdateMemberStatusRequest $request, int $id): JsonResponse
    {
        $user = $request->user();

        $member = $this->memberService->findForOrganisation($user, $id);

        $updated = $this->memberService->updateStatus($member, $user, $request->validated('status'));

        return response()->json([
            'data' => $this->transformMember($updated),
        ]);
    }

    public function invite(Request $request, int $id): JsonResponse
    {
        $user = $request->user();

        $member = $this->memberService->findForOrganisation($user, $id);

        $invitation = $this->memberAccountService->inviteMember($user, $member);

        return response()->json([
            'data' => $this->transformInvitation($invitation),
        ]);
    }

    public function inviteBulk(BulkInviteMembersRequest $request): JsonResponse
    {
        $user = $request->user();

        $result = $this->memberAccountService->inviteMembersBulk($user, $request->validated('member_ids'));

        return response()->json($result);
    }

    public function blockAccount(Request $request, int $id): JsonResponse
    {
        $user = $request->user();

        $member = $this->memberService->findForOrganisation($user, $id);

        $this->memberAccountService->blockMemberAccount($user, $member);

        return response()->json([
            'data' => $this->transformMember($member->refresh(), includeDetails: true),
        ]);
    }

    public function unblockAccount(Request $request, int $id): JsonResponse
    {
        $user = $request->user();

        $member = $this->memberService->findForOrganisation($user, $id);

        $this->memberAccountService->unblockMemberAccount($user, $member);

        return response()->json([
            'data' => $this->transformMember($member->refresh(), includeDetails: true),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function transformMember(Member $member, bool $includeDetails = false): array
    {
        $member->loadMissing([
            'user.roles',
            'latestMemberInvitation',
            'pendingMemberInvitation',
            'activeSubscription',
        ]);

        $accountStatus = $member->account_status;
        $accountEmail = $member->account_email;
        $lastInvitationSentAt = $member->last_invitation_sent_at?->toIso8601String();

        // Gebruik actieve subscription amount als die bestaat, anders de member's contribution_amount
        $contributionAmount = $member->activeSubscription?->amount ?? $member->contribution_amount;

        $base = [
            'id' => $member->id,
            'member_number' => $member->member_number,
            'first_name' => $member->first_name,
            'last_name' => $member->last_name,
            'email' => $member->email,
            'full_name' => $member->full_name,
            'gender' => $member->gender,
            'birth_date' => $member->birth_date?->toDateString(),
            'email' => $member->email,
            'phone' => $member->phone,
            'street_address' => $member->street_address,
            'postal_code' => $member->postal_code,
            'city' => $member->city,
            'iban' => $member->iban,
            'status' => $member->status,
            'contribution_amount' => $contributionAmount,
            'contribution_frequency' => $member->contribution_frequency,
            'contribution_start_date' => $member->contribution_start_date?->toDateString(),
            'contribution_note' => $member->contribution_note,
            'created_at' => $member->created_at?->toIso8601String(),
            'updated_at' => $member->updated_at?->toIso8601String(),
            'account_status' => $accountStatus,
            'account_email' => $accountEmail,
            'last_invitation_sent_at' => $lastInvitationSentAt,
        ];

        if (! $includeDetails) {
            return Arr::only($base, [
                'id',
                'member_number',
                'email',
                'full_name',
                'city',
                'contribution_amount',
                'status',
                'account_status',
                'account_email',
                'last_invitation_sent_at',
            ]);
        }

        return $base;
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function transformMemberCollection(Collection $collection): array
    {
        return $collection->map(fn (Member $member) => $this->transformMember($member))->values()->all();
    }

    /**
     * @return array<string, mixed>
     */
    private function transformInvitation(MemberInvitation $invitation): array
    {
        return [
            'id' => $invitation->id,
            'member_id' => $invitation->member_id,
            'email' => $invitation->email,
            'status' => $invitation->status,
            'expires_at' => $invitation->expires_at?->toIso8601String(),
            'created_at' => $invitation->created_at?->toIso8601String(),
            'updated_at' => $invitation->updated_at?->toIso8601String(),
        ];
    }
}


