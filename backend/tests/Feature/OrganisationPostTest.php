<?php

namespace Tests\Feature;

use App\Models\Member;
use App\Models\Organisation;
use App\Models\OrganisationPost;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Covers the organisation posts feed + comments + likes used by the member app.
 */
class OrganisationPostTest extends TestCase
{
    use RefreshDatabase;

    private Organisation $organisation;

    /** @var array<string, string> */
    private array $headers;

    protected function setUp(): void
    {
        parent::setUp();

        $this->organisation = Organisation::create([
            'name' => 'Test Org',
            'type' => 'vereniging',
            'contact_email' => 'info@testorg.nl',
            'subdomain' => 'testorg',
            'status' => 'active',
            'billing_status' => 'ok',
        ]);

        $this->headers = ['X-Organisation-Subdomain' => 'testorg'];
    }

    private function orgAdmin(): User
    {
        $role = Role::firstOrCreate(['name' => 'org_admin']);
        $user = User::factory()->create(['organisation_id' => $this->organisation->id]);
        $user->roles()->attach($role);

        return $user;
    }

    private function member(): User
    {
        $role = Role::firstOrCreate(['name' => 'member']);
        $memberRecord = Member::create([
            'organisation_id' => $this->organisation->id,
            'first_name' => 'Mo',
            'last_name' => 'Lid',
            'gender' => 'm',
            'status' => 'active',
        ]);
        $user = User::factory()->create([
            'organisation_id' => $this->organisation->id,
            'member_id' => $memberRecord->id,
        ]);
        $user->roles()->attach($role);

        return $user;
    }

    public function test_org_admin_can_create_a_post(): void
    {
        Sanctum::actingAs($this->orgAdmin());

        $this->postJson('/api/organisation/posts', [
            'title' => 'Welkom',
            'body' => 'Eerste bericht',
        ], $this->headers)
            ->assertCreated()
            ->assertJsonPath('data.title', 'Welkom');

        $this->assertDatabaseHas('organisation_posts', [
            'organisation_id' => $this->organisation->id,
            'title' => 'Welkom',
            'status' => 'published',
        ]);
    }

    public function test_member_sees_published_posts_and_can_comment_and_like(): void
    {
        $admin = $this->orgAdmin();
        $post = OrganisationPost::create([
            'organisation_id' => $this->organisation->id,
            'created_by' => $admin->id,
            'title' => 'Nieuws',
            'body' => 'Hallo leden',
            'status' => 'published',
            'published_at' => now(),
        ]);

        Sanctum::actingAs($this->member());

        $this->getJson('/api/member/posts', $this->headers)
            ->assertOk()
            ->assertJsonPath('data.0.title', 'Nieuws')
            ->assertJsonPath('data.0.liked_by_me', false);

        $this->postJson("/api/member/posts/{$post->id}/comments", ['body' => 'Mooi!'], $this->headers)
            ->assertCreated()
            ->assertJsonPath('data.body', 'Mooi!');

        $this->postJson("/api/member/posts/{$post->id}/like", [], $this->headers)
            ->assertOk()
            ->assertJsonPath('data.liked_by_me', true)
            ->assertJsonPath('data.like_count', 1);

        $this->assertDatabaseHas('post_comments', [
            'organisation_post_id' => $post->id,
            'body' => 'Mooi!',
        ]);

        $this->deleteJson("/api/member/posts/{$post->id}/like", [], $this->headers)
            ->assertOk()
            ->assertJsonPath('data.liked_by_me', false);

        $this->assertDatabaseMissing('post_likes', [
            'organisation_post_id' => $post->id,
        ]);
    }

    public function test_member_can_register_and_unregister_a_device_token(): void
    {
        Sanctum::actingAs($this->member());

        $this->postJson('/api/member/device-tokens', ['token' => 'fcm-abc-123'], $this->headers)
            ->assertNoContent();

        $this->assertDatabaseHas('device_tokens', [
            'token' => 'fcm-abc-123',
            'organisation_id' => $this->organisation->id,
            'platform' => 'android',
        ]);

        $this->deleteJson('/api/member/device-tokens', ['token' => 'fcm-abc-123'], $this->headers)
            ->assertNoContent();

        $this->assertDatabaseMissing('device_tokens', ['token' => 'fcm-abc-123']);
    }

    public function test_member_does_not_see_draft_posts(): void
    {
        $admin = $this->orgAdmin();
        OrganisationPost::create([
            'organisation_id' => $this->organisation->id,
            'created_by' => $admin->id,
            'title' => 'Concept',
            'body' => 'nog niet klaar',
            'status' => 'draft',
        ]);

        Sanctum::actingAs($this->member());

        $this->getJson('/api/member/posts', $this->headers)
            ->assertOk()
            ->assertJsonCount(0, 'data');
    }
}
