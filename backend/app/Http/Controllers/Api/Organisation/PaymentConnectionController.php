<?php

namespace App\Http\Controllers\Api\Organisation;

use App\Http\Controllers\Controller;
use App\Models\Organisation;
use App\Models\OrganisationStripeConnection;
use App\Services\OrganisationStripeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Stripe\Exception\ApiErrorException;
use Symfony\Component\HttpFoundation\Response;

class PaymentConnectionController extends Controller
{
    public function __construct(private readonly OrganisationStripeService $stripeService)
    {
    }

    public function show(Request $request): JsonResponse
    {
        $organisation = $this->resolveOrganisation($request);
        $connection = $this->stripeService->getConnectionForOrganisation($organisation);

        return response()->json($this->transformConnection($connection));
    }

    public function createOnboardingLink(Request $request): JsonResponse
    {
        $organisation = $this->resolveOrganisation($request);

        try {
            $result = $this->stripeService->createOnboardingLink($organisation);
        } catch (ApiErrorException $exception) {
            report($exception);

            return response()->json([
                'message' => __('Unable to create Stripe onboarding link.'),
                'errors' => [
                    'stripe' => [$exception->getMessage()],
                ],
            ], Response::HTTP_BAD_GATEWAY);
        }

        return response()->json([
            'url' => $result['url'],
        ]);
    }

    public function refresh(Request $request): JsonResponse
    {
        $organisation = $this->resolveOrganisation($request);

        try {
            $connection = $this->stripeService->refreshConnection($organisation);
        } catch (ApiErrorException $exception) {
            report($exception);

            return response()->json([
                'message' => __('Unable to refresh Stripe connection.'),
                'errors' => [
                    'stripe' => [$exception->getMessage()],
                ],
            ], Response::HTTP_BAD_GATEWAY);
        }

        return response()->json($this->transformConnection($connection));
    }

    private function resolveOrganisation(Request $request): Organisation
    {
        $user = $request->user()->loadMissing('organisation');

        if (! $user->organisation) {
            abort(Response::HTTP_UNPROCESSABLE_ENTITY, __('Authenticated user has no organisation.'));
        }

        return $user->organisation;
    }

    private function transformConnection(OrganisationStripeConnection $connection): array
    {
        return [
            'status' => $connection->status ?? 'none',
            'stripe_account_id' => $connection->stripe_account_id,
            'activated_at' => $connection->activated_at?->toIso8601String(),
            'last_error' => $connection->last_error,
        ];
    }
}
