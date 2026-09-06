<?php

namespace Tests\Feature;

use App\Models\Member;
use App\Models\MemberContributionRecord;
use App\Models\Organisation;
use App\Models\PaymentTransaction;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Dekt AUDIT-71: een terugboeking moet de bijbehorende transactie terugvinden, ook als
 * `stripe_payment_intent_id` leeg is.
 *
 * Sinds Stripe API 2025-03-31 draagt een invoice geen top-level `payment_intent` meer, dus
 * contributietransacties worden met `null` in die kolom opgeslagen. De dispute-handler zocht
 * uitsluitend op dat veld, vond niets, en liet de contributie op 'paid' staan terwijl het geld
 * was teruggeboekt. Bij SEPA Core heeft een lid acht weken onvoorwaardelijk stornorecht, dus
 * dit is de normale gang van zaken en geen randgeval.
 */
class StripeWebhookDisputeLinkageTest extends TestCase
{
    use RefreshDatabase;

    private const WEBHOOK_SECRET = 'whsec_testsecret_voor_de_testsuite';

    private Organisation $organisation;

    private Member $member;

    protected function setUp(): void
    {
        parent::setUp();

        config(['stripe.webhook_secret' => self::WEBHOOK_SECRET]);

        $this->organisation = Organisation::create([
            'name' => 'Test Vereniging',
            'type' => 'vereniging',
            'contact_email' => 'info@testvereniging.nl',
            'subdomain' => 'testver',
            'status' => 'active',
            'billing_status' => 'ok',
        ]);

        $this->member = Member::create([
            'organisation_id' => $this->organisation->id,
            'first_name' => 'Test',
            'last_name' => 'Lid',
            'email' => 'lid@testvereniging.nl',
            'gender' => 'm',
            'status' => 'active',
        ]);
    }

    public function test_dispute_marks_contribution_failed_when_payment_intent_is_missing(): void
    {
        // Zoals de webhook 'm vandaag aanmaakt: geen payment intent, wél een charge-id.
        $transaction = PaymentTransaction::create([
            'organisation_id' => $this->organisation->id,
            'member_id' => $this->member->id,
            'type' => 'contribution',
            'amount' => 25.00,
            'currency' => 'EUR',
            'status' => 'succeeded',
            'stripe_payment_intent_id' => null,
            'metadata' => [
                'stripe_invoice_id' => 'in_test_123',
                'stripe_charge_id' => 'ch_test_123',
            ],
            'occurred_at' => now(),
        ]);

        $contribution = MemberContributionRecord::create([
            'member_id' => $this->member->id,
            'amount' => 25.00,
            'status' => 'paid',
            'period' => now()->startOfMonth(),
            'payment_transaction_id' => $transaction->id,
        ]);

        $response = $this->postStripeEvent('charge.dispute.created', [
            'id' => 'dp_test_123',
            'object' => 'dispute',
            'charge' => 'ch_test_123',
            'reason' => 'fraudulent',
            'status' => 'needs_response',
        ]);

        $response->assertOk();

        $this->assertSame('disputed', $transaction->fresh()->status);
        $this->assertSame('failed', $contribution->fresh()->status);
    }

    public function test_dispute_still_links_via_payment_intent_when_present(): void
    {
        $transaction = PaymentTransaction::create([
            'organisation_id' => $this->organisation->id,
            'member_id' => $this->member->id,
            'type' => 'contribution',
            'amount' => 30.00,
            'currency' => 'EUR',
            'status' => 'succeeded',
            'stripe_payment_intent_id' => 'pi_test_456',
            'metadata' => ['stripe_invoice_id' => 'in_test_456'],
            'occurred_at' => now(),
        ]);

        $contribution = MemberContributionRecord::create([
            'member_id' => $this->member->id,
            'amount' => 30.00,
            'status' => 'paid',
            'period' => now()->startOfMonth(),
            'payment_transaction_id' => $transaction->id,
        ]);

        $response = $this->postStripeEvent('charge.dispute.created', [
            'id' => 'dp_test_456',
            'object' => 'dispute',
            'payment_intent' => 'pi_test_456',
            'charge' => 'ch_test_456',
            'reason' => 'fraudulent',
            'status' => 'needs_response',
        ]);

        $response->assertOk();

        $this->assertSame('disputed', $transaction->fresh()->status);
        $this->assertSame('failed', $contribution->fresh()->status);
    }

    public function test_refund_links_via_invoice_id_when_only_invoice_is_known(): void
    {
        $transaction = PaymentTransaction::create([
            'organisation_id' => $this->organisation->id,
            'member_id' => $this->member->id,
            'type' => 'contribution',
            'amount' => 40.00,
            'currency' => 'EUR',
            'status' => 'succeeded',
            'stripe_payment_intent_id' => null,
            'metadata' => ['stripe_invoice_id' => 'in_test_789'],
            'occurred_at' => now(),
        ]);

        $response = $this->postStripeEvent('charge.refunded', [
            'id' => 'ch_unknown_789',
            'object' => 'charge',
            'invoice' => 'in_test_789',
            'amount' => 4000,
            'amount_refunded' => 4000,
            'refunded' => true,
        ]);

        $response->assertOk();

        $this->assertSame('refunded', $transaction->fresh()->status);
    }

    /**
     * Bouwt een geldig ondertekend Stripe-event en post het op de webhook-route.
     *
     * @param  array<string, mixed>  $object
     */
    private function postStripeEvent(string $type, array $object): \Illuminate\Testing\TestResponse
    {
        $payload = json_encode([
            'id' => 'evt_'.bin2hex(random_bytes(8)),
            'object' => 'event',
            'type' => $type,
            'created' => time(),
            'data' => ['object' => $object],
        ], JSON_THROW_ON_ERROR);

        $timestamp = time();
        $signature = hash_hmac('sha256', $timestamp.'.'.$payload, self::WEBHOOK_SECRET);

        return $this->call(
            'POST',
            '/api/stripe/webhook',
            [],
            [],
            [],
            [
                'CONTENT_TYPE' => 'application/json',
                'HTTP_STRIPE_SIGNATURE' => "t={$timestamp},v1={$signature}",
            ],
            $payload
        );
    }
}
