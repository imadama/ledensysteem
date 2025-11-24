<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MemberContributionRecord;
use App\Models\MemberSubscription;
use App\Models\OrganisationSubscription;
use App\Models\Plan;
use App\Models\PaymentTransaction;
use App\Models\StripeEvent;
use App\Services\OrganisationStripeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Stripe\Event as StripeEventObject;
use Stripe\Exception\ApiErrorException;
use Stripe\Exception\SignatureVerificationException;
use Stripe\Webhook;
use Symfony\Component\HttpFoundation\Response;
use UnexpectedValueException;

class StripeWebhookController extends Controller
{
    public function __construct(
        private readonly OrganisationStripeService $stripeService,
    ) {
    }

    public function __invoke(Request $request): JsonResponse
    {
        $secret = config('stripe.webhook_secret');

        if (! $secret) {
            return response()->json([
                'message' => __('Stripe webhook secret ontbreekt in de configuratie.'),
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }

        $payload = $request->getContent();
        $signature = (string) $request->headers->get('Stripe-Signature', '');

        try {
            $event = Webhook::constructEvent($payload, $signature, $secret);
        } catch (UnexpectedValueException|SignatureVerificationException $exception) {
            report($exception);

            return response()->json([
                'message' => __('Ongeldige Stripe webhook-handtekening.'),
            ], Response::HTTP_BAD_REQUEST);
        }

        $eventArray = $event->toArray();
        $eventId = $event->id;
        $alreadyProcessed = false;

        try {
            DB::transaction(function () use ($event, $eventArray, $eventId, &$alreadyProcessed): void {
                $record = StripeEvent::query()
                    ->where('event_id', $eventId)
                    ->lockForUpdate()
                    ->first();

                if ($record && $record->processed_at) {
                    $alreadyProcessed = true;

                    return;
                }

                if (! $record) {
                    $record = StripeEvent::create([
                        'event_id' => $eventId,
                        'type' => $event->type,
                        'payload' => $eventArray,
                    ]);
                } else {
                    $record->type = $event->type;
                    $record->payload = $eventArray;
                    $record->save();
                }

                $this->processEvent($event);

                $record->processed_at = now();
                $record->save();
            }, attempts: 1);
        } catch (ApiErrorException $exception) {
            report($exception);

            return response()->json([
                'message' => __('Stripe API kon niet worden bereikt tijdens webhookverwerking.'),
            ], Response::HTTP_BAD_GATEWAY);
        } catch (\Throwable $exception) {
            report($exception);

            return response()->json([
                'message' => __('Verwerking van de Stripe webhook is mislukt.'),
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }

        if ($alreadyProcessed) {
            return response()->json(['received' => true, 'duplicate' => true]);
        }

        return response()->json(['received' => true]);
    }

    private function processEvent(StripeEventObject $event): void
    {
        $object = $event->data->object ?? null;
        $type = $event->type;

        if ($object && data_get($object, 'object') === 'account') {
            $this->handleAccountEvent($type, $object);

            return;
        }

        if ($type === 'checkout.session.completed') {
            $mode = data_get($object, 'mode');

            if ($mode === 'subscription') {
                $this->handleSubscriptionCheckoutSession($object);
            } else {
                $this->handleContributionCheckoutSession($object);
            }

            return;
        }

        if (in_array($type, ['payment_intent.succeeded', 'payment_intent.payment_failed'], true)) {
            $type === 'payment_intent.succeeded'
                ? $this->handlePaymentIntentSucceeded($object)
                : $this->handlePaymentIntentFailed($object);

            return;
        }

        if (str_starts_with($type, 'customer.subscription.')) {
            $this->handleCustomerSubscriptionEvent($type, $object);

            return;
        }

        if (in_array($type, ['invoice.payment_succeeded', 'invoice.payment_failed'], true)) {
            $this->handleInvoiceEvent($type, $object);
        }
    }

    private function handleAccountEvent(string $type, $object): void
    {
        if (! in_array($type, ['account.updated', 'account.application.authorized', 'account.external_account.updated', 'account.capability.updated'], true)) {
            return;
        }

        $accountId = data_get($object, 'id');

        if (! $accountId) {
            return;
        }

        $this->stripeService->syncConnectionByAccountId($accountId);
    }

    private function handleContributionCheckoutSession($object): void
    {
        $transaction = $this->locateTransaction(
            data_get($object, 'client_reference_id'),
            data_get($object, 'id'),
            data_get($object, 'payment_intent')
        );

        if (! $transaction) {
            return;
        }

        $paymentIntentId = data_get($object, 'payment_intent');
        $sessionId = data_get($object, 'id');

        $this->markTransactionSucceeded($transaction, $paymentIntentId, $sessionId);
    }

    private function handleSubscriptionCheckoutSession($object): void
    {
        $reference = data_get($object, 'client_reference_id');
        if (! $reference) {
            return;
        }

        // Handle member subscriptions
        if (str_starts_with($reference, 'member_sub:')) {
            $subscriptionId = (int) str_replace('member_sub:', '', $reference);

            $subscription = MemberSubscription::query()
                ->find($subscriptionId);

            if (! $subscription) {
                return;
            }

            $subscription->latest_checkout_session_id = data_get($object, 'id');
            $subscription->stripe_subscription_id = data_get($object, 'subscription', $subscription->stripe_subscription_id);

            if (! $subscription->stripe_customer_id) {
                $subscription->stripe_customer_id = data_get($object, 'customer', $subscription->stripe_customer_id);
            }

            $subscription->status = 'incomplete';
            $subscription->save();

            return;
        }

        // Handle organisation subscriptions
        if (! str_starts_with($reference, 'org_sub:')) {
            return;
        }

        $subscriptionId = (int) str_replace('org_sub:', '', $reference);

        $subscription = OrganisationSubscription::query()
            ->with('plan')
            ->find($subscriptionId);

        if (! $subscription) {
            return;
        }

        $subscription->latest_checkout_session_id = data_get($object, 'id');
        $subscription->stripe_subscription_id = data_get($object, 'subscription', $subscription->stripe_subscription_id);

        if (! $subscription->stripe_customer_id) {
            $subscription->stripe_customer_id = data_get($object, 'customer', $subscription->stripe_customer_id);
        }

        $subscription->status = $subscription->status === 'active'
            ? $subscription->status
            : 'incomplete';

        $subscription->save();
    }

    private function handlePaymentIntentSucceeded($object): void
    {
        $transaction = $this->locateTransaction(
            data_get($object->metadata ?? [], 'payment_transaction_id'),
            null,
            $object->id ?? null
        );

        if (! $transaction) {
            return;
        }

        $this->markTransactionSucceeded($transaction, $object->id ?? null, null);
    }

    private function handlePaymentIntentFailed($object): void
    {
        $transaction = $this->locateTransaction(
            data_get($object->metadata ?? [], 'payment_transaction_id'),
            null,
            $object->id ?? null
        );

        if (! $transaction) {
            return;
        }

        $errorMessage = data_get($object, 'last_payment_error.message');
        $this->markTransactionFailed($transaction, $object->id ?? null, null, $errorMessage);
    }

    private function handleCustomerSubscriptionEvent(string $type, $object): void
    {
        $stripeSubscriptionId = data_get($object, 'id');
        $customerId = data_get($object, 'customer');

        if (! $stripeSubscriptionId && ! $customerId) {
            return;
        }

        // Try member subscription first
        $memberSubscription = MemberSubscription::query()
            ->when($stripeSubscriptionId, fn ($query) => $query->where('stripe_subscription_id', $stripeSubscriptionId))
            ->when(! $stripeSubscriptionId && $customerId, fn ($query) => $query->where('stripe_customer_id', $customerId))
            ->orderByDesc('created_at')
            ->first();

        if ($memberSubscription) {
            $this->handleMemberSubscriptionEvent($type, $object, $memberSubscription);
            return;
        }

        // Fall back to organisation subscription
        $subscription = OrganisationSubscription::query()
            ->with('plan')
            ->when($stripeSubscriptionId, fn ($query) => $query->where('stripe_subscription_id', $stripeSubscriptionId))
            ->when(! $stripeSubscriptionId, fn ($query) => $query->whereNull('stripe_subscription_id'))
            ->when($customerId, fn ($query) => $query->where('stripe_customer_id', $customerId))
            ->orderByDesc('created_at')
            ->first();

        if (! $subscription) {
            return;
        }

        if (! $subscription->stripe_subscription_id && $stripeSubscriptionId) {
            $subscription->stripe_subscription_id = $stripeSubscriptionId;
        }

        $stripeStatus = data_get($object, 'status');
        $subscription->status = $this->mapStripeSubscriptionStatus($stripeStatus);

        $subscription->current_period_start = $this->timestampToDateTime(data_get($object, 'current_period_start'));
        $subscription->current_period_end = $this->timestampToDateTime(data_get($object, 'current_period_end'));
        $subscription->cancel_at = $this->timestampToDateTime(data_get($object, 'cancel_at'));
        $subscription->canceled_at = $this->timestampToDateTime(data_get($object, 'canceled_at'));

        $priceId = data_get($object, 'items.data.0.price.id');
        if ($priceId) {
            $plan = Plan::query()->where('stripe_price_id', $priceId)->first();
            if ($plan && $subscription->plan_id !== $plan->id) {
                $subscription->plan_id = $plan->id;
            }
        }

        $metadata = $subscription->metadata ?? [];
        $metadata['stripe_subscription_status'] = $stripeStatus;
        $subscription->metadata = $metadata;

        $subscription->save();

        [$billingStatus, $billingNote] = $this->determineBillingStatusFromSubscription($subscription->status, $stripeStatus);
        $this->updateOrganisationBillingStatus($subscription, $billingStatus, $billingNote);
    }

    private function handleMemberSubscriptionEvent(string $type, $object, MemberSubscription $subscription): void
    {
        if (! $subscription->stripe_subscription_id && data_get($object, 'id')) {
            $subscription->stripe_subscription_id = data_get($object, 'id');
        }

        $stripeStatus = data_get($object, 'status');
        $subscription->status = $this->mapStripeSubscriptionStatus($stripeStatus);

        $subscription->current_period_start = $this->timestampToDateTime(data_get($object, 'current_period_start'));
        $subscription->current_period_end = $this->timestampToDateTime(data_get($object, 'current_period_end'));
        $subscription->cancel_at = $this->timestampToDateTime(data_get($object, 'cancel_at'));
        $subscription->canceled_at = $this->timestampToDateTime(data_get($object, 'canceled_at'));

        $metadata = $subscription->metadata ?? [];
        $metadata['stripe_subscription_status'] = $stripeStatus;
        $subscription->metadata = $metadata;

        $subscription->save();
    }

    private function handleInvoiceEvent(string $type, $object): void
    {
        $customerId = data_get($object, 'customer');
        $stripeSubscriptionId = data_get($object, 'subscription');

        if (! $customerId && ! $stripeSubscriptionId) {
            return;
        }

        // Try member subscription first
        $memberSubscription = MemberSubscription::query()
            ->when($stripeSubscriptionId, fn ($query) => $query->where('stripe_subscription_id', $stripeSubscriptionId))
            ->when(! $stripeSubscriptionId && $customerId, fn ($query) => $query->where('stripe_customer_id', $customerId))
            ->orderByDesc('created_at')
            ->first();

        if ($memberSubscription) {
            $this->handleMemberSubscriptionInvoice($type, $object, $memberSubscription);
            return;
        }

        // Fall back to organisation subscription
        $subscription = OrganisationSubscription::query()
            ->when($stripeSubscriptionId, fn ($query) => $query->where('stripe_subscription_id', $stripeSubscriptionId))
            ->when(! $stripeSubscriptionId && $customerId, fn ($query) => $query->where('stripe_customer_id', $customerId))
            ->orderByDesc('created_at')
            ->first();

        if (! $subscription) {
            return;
        }

        if ($type === 'invoice.payment_failed') {
            $subscription->status = 'past_due';
            $metadata = $subscription->metadata ?? [];
            $metadata['last_invoice_failure'] = [
                'invoice_id' => data_get($object, 'id'),
                'created_at' => $this->timestampToDateTime(data_get($object, 'created'))?->toIso8601String(),
            ];
            $subscription->metadata = $metadata;
            $subscription->save();

            $note = __('Latest invoice :invoice failed.', ['invoice' => data_get($object, 'number') ?? data_get($object, 'id')]);
            $this->updateOrganisationBillingStatus($subscription, 'warning', $note);

            return;
        }

        // invoice.payment_succeeded
        $subscription->status = 'active';
        $subscription->current_period_end = $this->timestampToDateTime(data_get($object, 'lines.data.0.period.end')) ?? $subscription->current_period_end;
        $subscription->save();

        $this->updateOrganisationBillingStatus($subscription, 'ok', null);

        $paymentIntentId = data_get($object, 'payment_intent');
        $invoiceId = data_get($object, 'id');
        $amountPaid = (int) data_get($object, 'amount_paid', 0);
        $currency = strtolower((string) data_get($object, 'currency', config('stripe.default_currency', 'eur')));

        if ($amountPaid <= 0 || ! $paymentIntentId) {
            return;
        }

        $transaction = PaymentTransaction::query()
            ->where('stripe_payment_intent_id', $paymentIntentId)
            ->first();

        $occurredAt = $this->timestampToDateTime(data_get($object, 'status_transitions.paid_at')) ?? now();

        $metadata = [
            'stripe_invoice_id' => $invoiceId,
            'stripe_invoice_number' => data_get($object, 'number'),
        ];

        if (! $transaction) {
            PaymentTransaction::create([
                'organisation_id' => $subscription->organisation_id,
                'type' => 'saas',
                'amount' => round($amountPaid / 100, 2),
                'currency' => strtoupper($currency),
                'status' => 'succeeded',
                'stripe_payment_intent_id' => $paymentIntentId,
                'metadata' => $metadata,
                'occurred_at' => $occurredAt,
            ]);

            return;
        }

        $transaction->update([
            'organisation_id' => $subscription->organisation_id,
            'type' => 'saas',
            'amount' => round($amountPaid / 100, 2),
            'currency' => strtoupper($currency),
            'status' => 'succeeded',
            'metadata' => array_merge($transaction->metadata ?? [], $metadata),
            'occurred_at' => $occurredAt,
        ]);
    }

    private function handleMemberSubscriptionInvoice(string $type, $object, MemberSubscription $subscription): void
    {
        if ($type === 'invoice.payment_failed') {
            $subscription->status = 'past_due';
            $metadata = $subscription->metadata ?? [];
            $metadata['last_invoice_failure'] = [
                'invoice_id' => data_get($object, 'id'),
                'created_at' => $this->timestampToDateTime(data_get($object, 'created'))?->toIso8601String(),
            ];
            $subscription->metadata = $metadata;
            $subscription->save();

            return;
        }

        // invoice.payment_succeeded - maak contribution record aan
        $subscription->status = 'active';
        $subscription->current_period_end = $this->timestampToDateTime(data_get($object, 'lines.data.0.period.end')) ?? $subscription->current_period_end;
        $subscription->save();

        $amountPaid = (int) data_get($object, 'amount_paid', 0);
        $paymentIntentId = data_get($object, 'payment_intent');

        if ($amountPaid <= 0 || ! $paymentIntentId) {
            return;
        }

        $periodStart = $this->timestampToDateTime(data_get($object, 'lines.data.0.period.start'));
        $periodEnd = $this->timestampToDateTime(data_get($object, 'lines.data.0.period.end'));

        // Maak een contribution record aan voor deze maand
        $contribution = MemberContributionRecord::create([
            'member_id' => $subscription->member_id,
            'amount' => round($amountPaid / 100, 2),
            'status' => 'paid',
            'period' => $periodStart,
            'note' => __('Automatische incasso via subscription'),
        ]);

        // Maak of update payment transaction
        $occurredAt = $this->timestampToDateTime(data_get($object, 'status_transitions.paid_at')) ?? now();

        $transaction = PaymentTransaction::query()
            ->where('stripe_payment_intent_id', $paymentIntentId)
            ->first();

        $metadata = [
            'stripe_invoice_id' => data_get($object, 'id'),
            'stripe_invoice_number' => data_get($object, 'number'),
            'member_subscription_id' => (string) $subscription->id,
            'member_contribution_id' => (string) $contribution->id,
        ];

        if (! $transaction) {
            $transaction = PaymentTransaction::create([
                'organisation_id' => $subscription->member->organisation_id,
                'member_id' => $subscription->member_id,
                'type' => 'contribution',
                'amount' => round($amountPaid / 100, 2),
                'currency' => strtoupper(strtolower((string) data_get($object, 'currency', 'eur'))),
                'status' => 'succeeded',
                'stripe_payment_intent_id' => $paymentIntentId,
                'metadata' => $metadata,
                'occurred_at' => $occurredAt,
            ]);
        } else {
            $transaction->update([
                'status' => 'succeeded',
                'metadata' => array_merge($transaction->metadata ?? [], $metadata),
                'occurred_at' => $occurredAt,
            ]);
        }

        $contribution->update([
            'payment_transaction_id' => $transaction->id,
        ]);
    }

    private function locateTransaction($clientReferenceId, ?string $sessionId, ?string $paymentIntentId): ?PaymentTransaction
    {
        if ($clientReferenceId !== null && is_numeric($clientReferenceId)) {
            $transaction = PaymentTransaction::query()
                ->lockForUpdate()
                ->find((int) $clientReferenceId);
            if ($transaction) {
                return $transaction;
            }
        }

        if ($sessionId) {
            $transaction = PaymentTransaction::query()
                ->lockForUpdate()
                ->where('stripe_checkout_session_id', $sessionId)
                ->first();

            if ($transaction) {
                return $transaction;
            }
        }

        if ($paymentIntentId) {
            return PaymentTransaction::query()
                ->lockForUpdate()
                ->where('stripe_payment_intent_id', $paymentIntentId)
                ->first();
        }

        return null;
    }

    private function markTransactionSucceeded(PaymentTransaction $transaction, ?string $paymentIntentId, ?string $sessionId): void
    {
        $transaction->refresh();

        $updates = [];

        if ($paymentIntentId && $transaction->stripe_payment_intent_id !== $paymentIntentId) {
            $updates['stripe_payment_intent_id'] = $paymentIntentId;
        }

        if ($sessionId && $transaction->stripe_checkout_session_id !== $sessionId) {
            $updates['stripe_checkout_session_id'] = $sessionId;
        }

        $updates['status'] = 'succeeded';
        $updates['occurred_at'] = now();

        if (! empty($updates)) {
            $transaction->fill($updates);
        }

        $transaction->save();

        $transaction->loadMissing('memberContributionRecords');

        foreach ($transaction->memberContributionRecords as $record) {
            $updates = [
                'status' => 'paid',
                'payment_transaction_id' => $transaction->id,
            ];

            // Als er geen period is ingesteld (bijv. vrije contributie), gebruik de betalingsdatum
            if (! $record->period && $transaction->occurred_at) {
                $updates['period'] = $transaction->occurred_at->startOfMonth();
            } elseif (! $record->period) {
                // Fallback naar huidige maand als occurred_at ook niet beschikbaar is
                $updates['period'] = now()->startOfMonth();
            }

            $record->update($updates);
        }
    }

    private function markTransactionFailed(PaymentTransaction $transaction, ?string $paymentIntentId, ?string $sessionId, ?string $reason): void
    {
        $transaction->refresh();

        $updates = [
            'status' => 'failed',
            'occurred_at' => now(),
        ];

        if ($paymentIntentId && $transaction->stripe_payment_intent_id !== $paymentIntentId) {
            $updates['stripe_payment_intent_id'] = $paymentIntentId;
        }

        if ($sessionId && $transaction->stripe_checkout_session_id !== $sessionId) {
            $updates['stripe_checkout_session_id'] = $sessionId;
        }

        $metadata = $transaction->metadata ?? [];
        if ($reason) {
            $metadata['last_failure_reason'] = $reason;
            $updates['metadata'] = $metadata;
        }

        $transaction->fill($updates)->save();

        $transaction->loadMissing('memberContributionRecords');

        foreach ($transaction->memberContributionRecords as $record) {
            $record->update([
                'status' => 'open',
            ]);
        }
    }

    private function mapStripeSubscriptionStatus(?string $status): string
    {
        return match ($status) {
            'trialing' => 'trial',
            'active' => 'active',
            'past_due' => 'past_due',
            'canceled' => 'canceled',
            'unpaid' => 'past_due',
            'incomplete' => 'incomplete',
            'incomplete_expired' => 'incomplete',
            'paused' => 'paused',
            default => $status ?? 'incomplete',
        };
    }

    private function timestampToDateTime($timestamp): ?Carbon
    {
        if (! $timestamp) {
            return null;
        }

        return Carbon::createFromTimestamp((int) $timestamp);
    }

    /**
     * @return array{0: string, 1: ?string}
     */
    private function determineBillingStatusFromSubscription(?string $internalStatus, ?string $stripeStatus): array
    {
        $status = $internalStatus ?? $stripeStatus ?? 'unknown';

        return match ($status) {
            'active', 'trial' => ['ok', null],
            'past_due', 'unpaid', 'incomplete' => [
                'warning',
                __('Stripe subscription status: :status', ['status' => $stripeStatus ?? $status]),
            ],
            'canceled', 'incomplete_expired', 'paused', 'restricted' => [
                'restricted',
                __('Stripe subscription status: :status', ['status' => $stripeStatus ?? $status]),
            ],
            default => [
                'warning',
                __('Stripe subscription status: :status', ['status' => $stripeStatus ?? $status]),
            ],
        };
    }

    private function updateOrganisationBillingStatus(OrganisationSubscription $subscription, string $billingStatus, ?string $note): void
    {
        $organisation = $subscription->relationLoaded('organisation')
            ? $subscription->organisation
            : $subscription->organisation()->first();

        if (! $organisation) {
            return;
        }

        $updates = [];

        if ($organisation->billing_status !== $billingStatus) {
            $updates['billing_status'] = $billingStatus;
        }

        if ($organisation->billing_note !== $note) {
            $updates['billing_note'] = $note;
        }

        if (! empty($updates)) {
            $organisation->fill($updates)->save();
        }
    }
}
