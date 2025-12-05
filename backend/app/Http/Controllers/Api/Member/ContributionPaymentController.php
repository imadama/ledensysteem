<?php

namespace App\Http\Controllers\Api\Member;

use App\Http\Controllers\Controller;
use App\Models\MemberContributionRecord;
use App\Models\MemberSubscription;
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

    public function payManual(Request $request): JsonResponse
    {
        $member = $this->resolveMember($request);

        $validated = $request->validate([
            'amount' => ['required', 'numeric', 'min:0.01'],
            'note' => ['nullable', 'string', 'max:1000'],
            'setup_recurring' => ['nullable', 'boolean'],
            'payment_method' => ['nullable', 'string', 'in:card,sepa'],
            'success_url' => ['required', 'url'],
            'cancel_url' => ['required', 'url'],
        ]);

        $amount = (float) $validated['amount'];

        if ($amount <= 0) {
            return response()->json([
                'message' => __('Het bedrag moet groter zijn dan 0.'),
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

        $setupRecurring = $validated['setup_recurring'] ?? false;

        // Als automatische incasso, maak een subscription
        if ($setupRecurring) {
            $paymentMethod = $validated['payment_method'] ?? 'card';
            return $this->setupSubscription($member, $organisation, $connection, $amount, $validated['note'] ?? null, $validated['success_url'], $validated['cancel_url'], $request->user()->email ?? null, $paymentMethod);
        }

        // Anders, normale eenmalige betaling
        // Gebruik huidige maand als period voor vrije contributies
        $contribution = MemberContributionRecord::create([
            'member_id' => $member->id,
            'amount' => $amount,
            'status' => 'open',
            'note' => $validated['note'] ?? null,
            'period' => now()->startOfMonth(),
        ]);

        $transaction = PaymentTransaction::create([
            'organisation_id' => $organisation->id,
            'member_id' => $member->id,
            'type' => 'contribution',
            'amount' => $amount,
            'currency' => 'EUR',
            'status' => 'created',
            'metadata' => [
                'member_contribution_id' => $contribution->id,
                'member_id' => $member->id,
                'manual' => true,
            ],
        ]);

        $successUrl = $this->appendSessionPlaceholder($validated['success_url']);
        $cancelUrl = $this->appendSessionPlaceholder($validated['cancel_url']);

        $description = __('Vrije contributie');
        $organisationName = $organisation->name;
        if ($organisationName) {
            $description = $organisationName.' – '.$description;
        }

        $stripeAmount = $this->toStripeAmount($amount);

        try {
            $session = $this->createCheckoutSession($transaction, $organisationName ?? 'Contributie', $description, $stripeAmount, $successUrl, $cancelUrl, $connection->stripe_account_id, $request->user()->email ?? null);
        } catch (ApiErrorException $exception) {
            $transaction->delete();
            $contribution->delete();
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

    private function setupSubscription(
        $member,
        $organisation,
        $connection,
        float $amount,
        ?string $note,
        string $successUrl,
        string $cancelUrl,
        ?string $customerEmail,
        string $paymentMethod = 'card'
    ): JsonResponse {
        $subscription = MemberSubscription::create([
            'member_id' => $member->id,
            'amount' => $amount,
            'currency' => 'EUR',
            'status' => 'incomplete',
        ]);

        $successUrl = $this->appendSessionPlaceholder($successUrl);
        $cancelUrl = $this->appendSessionPlaceholder($cancelUrl);

        $description = __('Maandelijkse contributie');
        $organisationName = $organisation->name;
        if ($organisationName) {
            $description = $organisationName.' – '.$description;
        }

        $stripeAmount = $this->toStripeAmount($amount);

        try {
            // Voor SEPA hebben we email nodig, voor card kunnen we customer ID gebruiken
            $customerId = null;
            if ($paymentMethod === 'sepa') {
                // Voor SEPA gebruiken we customer_email in plaats van customer ID
                if (!$customerEmail) {
                    return response()->json([
                        'message' => __('Voor SEPA incasso is een e-mailadres vereist.'),
                    ], Response::HTTP_UNPROCESSABLE_ENTITY);
                }
            } else {
                // Voor card kunnen we een customer ID gebruiken
                $customerId = $customerEmail
                    ? $this->getOrCreateCustomer($member, $connection->stripe_account_id, $customerEmail)
                    : null;
            }

            $session = $this->createSubscriptionCheckoutSession(
                $subscription,
                $organisationName ?? 'Contributie',
                $description,
                $stripeAmount,
                $successUrl,
                $cancelUrl,
                $connection->stripe_account_id,
                $customerId,
                $customerEmail,
                $note,
                $paymentMethod
            );

            $subscription->update([
                'latest_checkout_session_id' => $session->id,
                'stripe_customer_id' => $customerId,
            ]);
        } catch (ApiErrorException $exception) {
            $subscription->delete();
            
            // Log meer details over de error
            $errorMessage = $exception->getMessage();
            $stripeError = null;
            
            if (method_exists($exception, 'getStripeError')) {
                $stripeError = $exception->getStripeError();
            } elseif (method_exists($exception, 'getJsonBody')) {
                $stripeError = $exception->getJsonBody()['error'] ?? null;
            }
            
            \Log::error('SEPA subscription checkout creation failed', [
                'member_id' => $member->id,
                'organisation_id' => $organisation->id,
                'payment_method' => $paymentMethod,
                'error' => $errorMessage,
                'stripe_error' => $stripeError,
            ]);
            
            report($exception);

            return response()->json([
                'message' => __('Er kon geen betaalpagina worden aangemaakt. Probeer het later opnieuw.'),
                'errors' => [
                    'stripe' => [$errorMessage],
                ],
                'debug' => config('app.debug') ? [
                    'stripe_error' => $stripeError,
                ] : null,
            ], Response::HTTP_BAD_GATEWAY);
        }

        return response()->json([
            'checkout_url' => $session->url,
            'subscription_id' => $subscription->id,
        ]);
    }

    private function getOrCreateCustomer($member, string $stripeAccountId, string $email): ?string
    {
        // Zoek bestaande customer
        $customers = $this->stripe->customers->all([
            'email' => $email,
            'limit' => 1,
        ], ['stripe_account' => $stripeAccountId]);

        if (count($customers->data) > 0) {
            return $customers->data[0]->id;
        }

        // Maak nieuwe customer
        $customer = $this->stripe->customers->create([
            'email' => $email,
            'name' => $member->full_name,
            'metadata' => [
                'member_id' => (string) $member->id,
                'organisation_id' => (string) $member->organisation_id,
            ],
        ], ['stripe_account' => $stripeAccountId]);

        return $customer->id;
    }

    private function createSubscriptionCheckoutSession(
        MemberSubscription $subscription,
        ?string $organisationName,
        string $description,
        int $amount,
        string $successUrl,
        string $cancelUrl,
        string $stripeAccountId,
        ?string $customerId,
        ?string $customerEmail,
        ?string $note,
        string $paymentMethod = 'card'
    ): Session {
        // Bepaal payment method types - gebruik geconfigureerde methodes of fallback
        $availableMethods = \App\Models\PlatformSetting::getPaymentMethods();
        
        // Als er een specifieke payment method is gekozen, filter de beschikbare methodes
        $paymentMethodTypes = match ($paymentMethod) {
            'sepa' => in_array('sepa_debit', $availableMethods) ? ['sepa_debit'] : $availableMethods,
            'card' => in_array('card', $availableMethods) ? ['card'] : $availableMethods,
            default => $availableMethods,
        };
        
        // Zorg dat er altijd minstens één payment method is
        if (empty($paymentMethodTypes)) {
            $paymentMethodTypes = ['card'];
        }

        $params = [
            'mode' => 'subscription',
            'success_url' => $successUrl,
            'cancel_url' => $cancelUrl,
            'client_reference_id' => 'member_sub:'.$subscription->id,
            'payment_method_types' => $paymentMethodTypes,
            'metadata' => [
                'member_subscription_id' => (string) $subscription->id,
                'member_id' => (string) $subscription->member_id,
            ],
            'line_items' => [[
                'quantity' => 1,
                'price_data' => [
                    'currency' => 'eur',
                    'unit_amount' => $amount,
                    'recurring' => [
                        'interval' => 'month',
                    ],
                    'product_data' => [
                        'name' => $organisationName ? ($organisationName.' – '.$description) : $description,
                    ],
                ],
            ]],
            'subscription_data' => [
                'metadata' => [
                    'member_subscription_id' => (string) $subscription->id,
                    'member_id' => (string) $subscription->member_id,
                    'organisation_id' => (string) $subscription->member->organisation_id,
                    'payment_method_type' => $paymentMethod,
                ],
            ],
        ];

        // Voor SEPA gebruik customer_email, voor card gebruik customer ID
        if ($paymentMethod === 'sepa' && $customerEmail) {
            $params['customer_email'] = $customerEmail;
        } elseif ($customerId) {
            $params['customer'] = $customerId;
        }

        if ($note) {
            $params['subscription_data']['description'] = $note;
        }

        // Voor SEPA: Stripe regelt de mandate automatisch in Checkout Sessions
        // We hoeven geen payment_method_options toe te voegen

        return $this->stripe->checkout->sessions->create(
            $params,
            ['stripe_account' => $stripeAccountId]
        );
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
        
        // Gebruik geconfigureerde betaalmethodes
        $paymentMethodTypes = \App\Models\PlatformSetting::getPaymentMethods();
        if (empty($paymentMethodTypes)) {
            $paymentMethodTypes = ['card'];
        }

        $params = [
            'mode' => 'payment',
            'success_url' => $successUrl,
            'cancel_url' => $cancelUrl,
            'client_reference_id' => (string) $transaction->id,
            'payment_method_types' => $paymentMethodTypes,
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
