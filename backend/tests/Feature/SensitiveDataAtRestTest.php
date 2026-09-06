<?php

namespace Tests\Feature;

use App\Models\Member;
use App\Models\MemberInvitation;
use App\Models\Organisation;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * Dekt AUDIT-61 (IBAN's versleuteld opslaan) en AUDIT-60 (uitnodigingstokens hashen).
 *
 * De kern van beide is dat de databasekolom iets anders bevat dan wat de applicatie leest.
 * Deze tests kijken daarom bewust langs Eloquent heen met DB::table — via het model zou de
 * cast de encryptie onzichtbaar maken en zou de test niets bewijzen.
 */
class SensitiveDataAtRestTest extends TestCase
{
    use RefreshDatabase;

    private Organisation $organisation;

    protected function setUp(): void
    {
        parent::setUp();

        $this->organisation = Organisation::create([
            'name' => 'Test Vereniging',
            'type' => 'vereniging',
            'contact_email' => 'info@testvereniging.nl',
            'subdomain' => 'testver',
            'status' => 'active',
            'billing_status' => 'ok',
        ]);
    }

    public function test_iban_is_not_readable_in_the_database(): void
    {
        $iban = 'NL91ABNA0417164300';

        $member = $this->createMember(['iban' => $iban]);

        $stored = DB::table('members')->where('id', $member->id)->value('iban');

        $this->assertNotSame($iban, $stored, 'IBAN staat leesbaar in de database');
        $this->assertStringNotContainsString('ABNA', (string) $stored);
        $this->assertSame($iban, $member->fresh()->iban, 'IBAN komt er via het model niet correct uit');
    }

    public function test_sepa_subscription_iban_is_also_encrypted(): void
    {
        $iban = 'NL91ABNA0417164300';

        $member = $this->createMember(['sepa_subscription_iban' => $iban]);

        $stored = DB::table('members')->where('id', $member->id)->value('sepa_subscription_iban');

        $this->assertNotSame($iban, $stored);
        $this->assertSame($iban, $member->fresh()->sepa_subscription_iban);
    }

    /**
     * De kolom moest van varchar(255) naar TEXT: een IBAN van 34 tekens — de ISO 13616
     * maximumlengte, die App\Rules\ValidIban ook toelaat — versleutelt naar 256 tekens.
     * Met MySQL in strict mode zou dat een harde fout 1406 geven.
     */
    public function test_maximum_length_iban_survives_encryption(): void
    {
        $iban = str_repeat('A', 34);

        $member = $this->createMember(['iban' => $iban]);

        $stored = (string) DB::table('members')->where('id', $member->id)->value('iban');

        $this->assertGreaterThan(255, strlen($stored), 'Verwacht een versleutelde waarde langer dan varchar(255)');
        $this->assertSame($iban, $member->fresh()->iban, 'Lang IBAN is afgekapt of onleesbaar geworden');
    }

    public function test_null_iban_stays_null(): void
    {
        $member = $this->createMember(['iban' => null]);

        $this->assertNull(DB::table('members')->where('id', $member->id)->value('iban'));
        $this->assertNull($member->fresh()->iban);
    }

    public function test_invitation_token_is_stored_as_a_hash(): void
    {
        $member = $this->createMember();
        $plainToken = 'ditiseentesttokenvan64tekenslangzodathetrealistischgenoegis00000';

        $invitation = MemberInvitation::create([
            'member_id' => $member->id,
            'email' => $member->email,
            'token' => MemberInvitation::hashToken($plainToken),
            'status' => 'pending',
            'expires_at' => now()->addDays(7),
        ]);

        $stored = (string) DB::table('member_invitations')->where('id', $invitation->id)->value('token');

        $this->assertNotSame($plainToken, $stored, 'Token staat leesbaar in de database');
        $this->assertMatchesRegularExpression('/^[0-9a-f]{64}$/', $stored);
        $this->assertSame(hash('sha256', $plainToken), $stored);
    }

    public function test_activation_endpoint_accepts_the_plain_token_and_rejects_the_hash(): void
    {
        $member = $this->createMember();
        $plainToken = 'nogeentesttokenvan64tekenslangvoordeactivatieroutecheck000000000';

        MemberInvitation::create([
            'member_id' => $member->id,
            'email' => $member->email,
            'token' => MemberInvitation::hashToken($plainToken),
            'status' => 'pending',
            'expires_at' => now()->addDays(7),
        ]);

        $this->getJson('/api/member-activation/'.$plainToken)->assertOk();

        // Wie alleen de databasewaarde heeft, komt er niet in — dat is de hele winst.
        $this->getJson('/api/member-activation/'.MemberInvitation::hashToken($plainToken))
            ->assertNotFound();
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    private function createMember(array $attributes = []): Member
    {
        static $counter = 0;
        $counter++;

        return Member::create(array_merge([
            'organisation_id' => $this->organisation->id,
            'first_name' => 'Test',
            'last_name' => 'Lid',
            'email' => "lid{$counter}@testvereniging.nl",
            'gender' => 'm',
            'status' => 'active',
        ], $attributes));
    }
}
