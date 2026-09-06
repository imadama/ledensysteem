<?php

namespace Tests\Feature;

use App\Mail\MemberInvitationMailable;
use App\Models\Member;
use App\Models\MemberInvitation;
use App\Models\Organisation;
use App\Models\Role;
use App\Models\User;
use App\Services\MemberAccountService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

/**
 * Covers the invitation token flow: the database only holds a hash, the e-mail
 * carries the plaintext token, and activation matches the two.
 */
class MemberActivationTest extends TestCase
{
    use RefreshDatabase;

    private const PLAIN_TOKEN = 'plain-activation-token-for-tests';

    private Member $member;

    protected function setUp(): void
    {
        parent::setUp();

        Role::firstOrCreate(['name' => 'member']);

        $organisation = Organisation::create([
            'name' => 'Test Org',
            'type' => 'vereniging',
            'contact_email' => 'info@testorg.nl',
            'subdomain' => 'testorg',
            'status' => 'active',
            'billing_status' => 'ok',
        ]);

        $this->member = Member::create([
            'organisation_id' => $organisation->id,
            'first_name' => 'Mo',
            'last_name' => 'Lid',
            'gender' => 'm',
            'email' => 'mo@testorg.nl',
            'status' => 'active',
        ]);
    }

    private function pendingInvitation(): MemberInvitation
    {
        return MemberInvitation::create([
            'member_id' => $this->member->id,
            'email' => $this->member->email,
            'token' => MemberInvitation::hashToken(self::PLAIN_TOKEN),
            'status' => 'pending',
            'expires_at' => now()->addDays(7),
        ]);
    }

    public function test_invitation_stores_only_a_hash_and_mails_the_plain_token(): void
    {
        Mail::fake();

        $invitation = app(MemberAccountService::class)->sendInvitationToNewMember($this->member);

        Mail::assertSent(MemberInvitationMailable::class, function (MemberInvitationMailable $mail) use ($invitation): bool {
            return $mail->invitation->is($invitation)
                && $mail->plainToken !== $invitation->token
                && MemberInvitation::hashToken($mail->plainToken) === $invitation->token;
        });
    }

    public function test_plain_token_from_the_link_resolves_the_invitation(): void
    {
        $this->pendingInvitation();

        $this->getJson('/api/member-activation/'.self::PLAIN_TOKEN)
            ->assertOk()
            ->assertJsonPath('can_activate', true)
            ->assertJsonPath('data.email', 'mo@testorg.nl');
    }

    public function test_hash_stored_in_the_database_cannot_be_used_as_a_token(): void
    {
        $invitation = $this->pendingInvitation();

        $this->getJson('/api/member-activation/'.$invitation->token)
            ->assertNotFound()
            ->assertJsonPath('can_activate', false);
    }

    public function test_activation_creates_member_account_and_consumes_invitation(): void
    {
        $invitation = $this->pendingInvitation();

        $payload = [
            'password' => 'Wachtwoord123',
            'password_confirmation' => 'Wachtwoord123',
        ];

        $this->postJson('/api/member-activation/'.self::PLAIN_TOKEN, $payload)
            ->assertOk()
            ->assertJsonPath('data.user.email', 'mo@testorg.nl')
            ->assertJsonPath('data.token_type', 'Bearer');

        $user = User::where('email', 'mo@testorg.nl')->firstOrFail();
        $this->assertSame($this->member->id, $user->member_id);
        $this->assertTrue($user->hasRole('member'));
        $this->assertSame('used', $invitation->fresh()->status);

        $this->postJson('/api/member-activation/'.self::PLAIN_TOKEN, $payload)
            ->assertStatus(400)
            ->assertJsonPath('reason', 'not_pending');
    }
}
