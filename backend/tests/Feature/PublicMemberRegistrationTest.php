<?php

namespace Tests\Feature;

use App\Models\Member;
use App\Models\Organisation;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

/**
 * Dekt de publieke ledenaanmelding: IBAN mod-97-validatie, duplicaat-preventie
 * en het vastleggen van het SEPA-akkoord (AUDIT auth-flow-gaps).
 */
class PublicMemberRegistrationTest extends TestCase
{
    use RefreshDatabase;

    private Organisation $organisation;

    protected function setUp(): void
    {
        parent::setUp();

        Mail::fake();

        $this->organisation = Organisation::create([
            'name' => 'Test Vereniging',
            'type' => 'vereniging',
            'contact_email' => 'info@testvereniging.nl',
            'subdomain' => 'testver',
            'status' => 'active',
            'billing_status' => 'ok',
        ]);
    }

    /** @return array<string, mixed> */
    private function payload(array $overrides = []): array
    {
        return array_merge([
            'org_id' => $this->organisation->id,
            'first_name' => 'Test',
            'last_name' => 'Lid',
            'gender' => 'm',
            'email' => 'nieuwlid@example.com',
            'street_address' => 'Straat 1',
            'postal_code' => '1234AB',
            'city' => 'Amsterdam',
            'iban' => 'NL91ABNA0417164300', // geldig mod-97
            'contribution_amount' => 10,
            'contribution_start_date' => now()->toDateString(),
            'sepa_consent' => true,
        ], $overrides);
    }

    public function test_valid_registration_creates_member_and_records_sepa_consent(): void
    {
        $response = $this->postJson('/api/public/member-registration', $this->payload());

        $response->assertCreated();

        $member = Member::where('organisation_id', $this->organisation->id)
            ->where('email', 'nieuwlid@example.com')
            ->first();

        $this->assertNotNull($member);
        $this->assertNotNull($member->sepa_consent_at, 'SEPA-akkoord-tijdstip moet zijn vastgelegd');
        $this->assertNotNull($member->sepa_consent_ip, 'SEPA-akkoord-IP moet zijn vastgelegd');
    }

    public function test_invalid_iban_checksum_is_rejected(): void
    {
        $response = $this->postJson('/api/public/member-registration', $this->payload([
            'iban' => 'NL91ABNA0417164301', // onjuist controlegetal
        ]));

        $response->assertStatus(422)->assertJsonValidationErrors('iban');
        $this->assertDatabaseCount('members', 0);
    }

    public function test_duplicate_email_in_same_organisation_is_rejected(): void
    {
        Member::create([
            'organisation_id' => $this->organisation->id,
            'first_name' => 'Bestaand',
            'last_name' => 'Lid',
            'gender' => 'm',
            'email' => 'nieuwlid@example.com',
            'status' => 'active',
        ]);

        $response = $this->postJson('/api/public/member-registration', $this->payload());

        $response->assertStatus(422)->assertJsonValidationErrors('email');
        // Alleen het bestaande lid, geen dubbele aanmaak.
        $this->assertDatabaseCount('members', 1);
    }
}
