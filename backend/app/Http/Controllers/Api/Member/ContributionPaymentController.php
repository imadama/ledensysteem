<?php

namespace App\Http\Controllers\Api\Member;

use App\Http\Controllers\Controller;
use App\Models\MemberContributionRecord;
use App\Models\PaymentTransaction;
use App\Services\OrganisationStripeService;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Stripe\Checkout\Session;
use Stripe\Exception\ApiErrorException;
use Stripe\StripeClient;
use Symfony\Component\HttpFoundation\Response;

class ContributionPaymentController extends Controller
{
    public function __construct(
        private readonly StripeClient $stripe,
        private readonly OrganisationStripeService $stripeService,
    ) {
    }

    public function index(Request $request): JsonResponse
    {
        $member = $this->resolveMember($request);

        /** @var Collection<int, MemberContributionRecord> $records */
        $records = MemberContributionRecord::query()
            ->where('member_id', $member->id)
            ->whereIn('status', ['open', 'failed'])
            ->orderByDesc('period')
            ->orderByDesc('created_at')
            ->get();

        $data = $records->map(fn (MemberContributionRecord $record) => [
            'id' => $record->id,
            'period' => $record->period?->toDateString(),
            'amount' => $record->amount,
            'status' => $record->status,
        ])->values();

        return response()->json(['data' => $data]);
    }

    public function store(Request $request): JsonResponse
    {
        $member = $this->resolveMember($request);

        $validated = $request->validate([
            'contribution_id' => ['required', 'integer', 'exists:member_contribution_records,id'],
            'success_url' => ['required', 'url'],
            'cancel_url' => ['required', 'url'],
        ]);

        /** @var MemberContributionRecord $contribution */
        $contribution = MemberContributionRecord::query()
            ->whereKey($validated['contribution_id'])
            ->firstOrFail();

        if ((int) $contribution->member_id !== (int) $member->id) {
            abort(Response::HTTP_FORBIDDEN, __('This contribution does not belong to you.'));
        }

        if (! in_array($contribution->status, ['open', 'failed'], true)) {
            return response()->json([
                'message' => __('Deze contributie kan niet (opnieuw) betaald worden.')
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        if ($contribution->amount === null || (float) $contribution->amount <= 0) {
            return response()->json([
                'message' => __('Deze contributie heeft geen bedrag en kan niet online betaald worden.'),
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $organisation = $member->organisation;

        if (! $organisation) {
            return response()->json([
                'message' => __('Geen organisatie gevonden voor dit lid.'),
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $connection = $organisation->stripeConnection
            ?? $this->stripeService->getConnectionForOrganisation($organisation);

        if ($connection->status !== 'active' || ! $connection->stripe_account_id) {
            return response()->json([
                'message' => __('Online betalen is niet beschikbaar voor jouw organisatie.'),
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $transaction = PaymentTransaction::create([
            'organisation_id' => $organisation->id,
            'member_id' => $member->id,
            'type' => 'contribution',
            'amount' => $contribution->amount,
            'currency' => 'EUR',
            'status' => 'created',
            'metadata' => [
                'member_contribution_id' => $contribution->id,
                'member_id' => $member->id,
                'period' => $contribution->period?->toDateString(),
            ],
        ]);

        $successUrl = $this->appendSessionPlaceholder($validated['success_url']);
        $cancelUrl = $this->appendSessionPlaceholder($validated['cancel_url']);

        $description = $this->buildDescription($contribution);
        $amount = $this->toStripeAmount($contribution->amount);

        try {
            $session = $this->createCheckoutSession($transaction, $organisation->name ?? 'Contributie', $description, $amount, $successUrl, $cancelUrl, $connection->stripe_account_id, $request->user()->email ?? null);
        } catch (ApiErrorException $exception) {
            $transaction->delete();
            report($exception);

            return response()->json([
                'message' => __('Er kon geen betaalpagina worden aangemaakt. Probeer het later opnieuw.'),
                'errors' => [
                    'stripe' => [$exception->getMessage()],
                ],
            ], Response::HTTP_BAD_GATEWAY);
        }

        DB::transaction(function () use ($transaction, $session, $contribution): void {
            $transaction->update([
                'status' => 'processing',
                'stripe_checkout_session_id' => $session->id,
                'stripe_payment_intent_id' => $session->payment_intent ?? null,
            ]);

            $contribution->update([
                'status' => 'processing',
                'payment_transaction_id' => $transaction->id,
            ]);
        });

        return response()->json([
            'checkout_url' => $session->url,
            'transaction_id' => $transaction->id,
            'contribution_id' => $contribution->id,
        ]);
    }

    private function resolveMember(Request $request)
    {
        $user = $request->user()->loadMissing('member.organisation');

        if (! $user->member) {
            abort(Response::HTTP_FORBIDDEN, __('Alleen leden kunnen contributies betalen.'));
        }

        return $user->member;
    }

    private function appendSessionPlaceholder(string $url): string
    {
        if (Str::contains($url, '{CHECKOUT_SESSION_ID}')) {
            return $url;
        }

        $separator = str_contains($url, '?') ? '&' : '?';

        return $url.$separator.'session_id={CHECKOUT_SESSION_ID}';
    }

    private function buildDescription(MemberContributionRecord $contribution): string
    {
        $period = $contribution->period?->translatedFormat('F Y') ?? ($contribution->period?->format('Y-m') ?? __('onbekende periode'));
        $organisationName = $contribution->member?->organisation?->name;

        return trim(__('Contributie :period', ['period' => $period]).($organisationName ? ' – '.$organisationName : ''));
    }

    private function toStripeAmount(mixed $amount): int
    {
        return (int) round(((float) $amount) * 100);
    }

    private function createCheckoutSession(
        PaymentTransaction $transaction,
        ?string $organisationName,
        string $description,
        int $amount,
        string $successUrl,
        string $cancelUrl,
        string $stripeAccountId,
        ?string $customerEmail
    ): Session {
        $currency = strtolower($transaction->currency ?? 'eur');

        $params = [
            'mode' => 'payment',
            'success_url' => $successUrl,
            'cancel_url' => $cancelUrl,
            'client_reference_id' => (string) $transaction->id,
            'metadata' => [
                'payment_transaction_id' => (string) $transaction->id,
            ],
            'line_items' => [[
                'quantity' => 1,
                'price_data' => [
                    'currency' => $currency,
                    'unit_amount' => $amount,
                    'product_data' => [
                        'name' => $organisationName ? ($organisationName.' – '.$description) : $description,
                    ],
                ],
            ]],
        ];

        if ($customerEmail) {
            $params['customer_email'] = $customerEmail;
        }

        $paymentIntentMetadata = [
            'payment_transaction_id' => (string) $transaction->id,
            'member_id' => (string) $transaction->member_id,
            'organisation_id' => (string) $transaction->organisation_id,
        ];

        $params['payment_intent_data'] = [
            'metadata' => $paymentIntentMetadata,
        ];

        return $this->stripe->checkout->sessions->create(
            $params,
            ['stripe_account' => $stripeAccountId]
        );
    }
}
