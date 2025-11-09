<?php

namespace App\Http\Controllers\Api\Organisation;

use App\Exports\MemberTemplateExport;
use App\Http\Controllers\Controller;
use App\Http\Requests\Organisation\StoreMemberRequest;
use App\Http\Requests\Organisation\UpdateMemberRequest;
use App\Http\Requests\Organisation\UpdateMemberStatusRequest;
use App\Http\Requests\Organisation\MemberImportPreviewRequest;
use App\Http\Requests\Organisation\MemberImportConfirmRequest;
use App\Models\Member;
use App\Services\MemberService;
use App\Services\MemberImportService;
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

    /**
     * @return array<string, mixed>
     */
    private function transformMember(Member $member, bool $includeDetails = false): array
    {
        $base = [
            'id' => $member->id,
            'member_number' => $member->member_number,
            'first_name' => $member->first_name,
            'last_name' => $member->last_name,
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
            'contribution_amount' => $member->contribution_amount,
            'contribution_frequency' => $member->contribution_frequency,
            'contribution_start_date' => $member->contribution_start_date?->toDateString(),
            'contribution_note' => $member->contribution_note,
            'created_at' => $member->created_at?->toIso8601String(),
            'updated_at' => $member->updated_at?->toIso8601String(),
        ];

        if (! $includeDetails) {
            return Arr::only($base, [
                'id',
                'member_number',
                'full_name',
                'city',
                'contribution_amount',
                'status',
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
}


