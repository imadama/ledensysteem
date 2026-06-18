<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Covers the stateless token login used by the native (KMP) member app.
 */
class AuthTokenTest extends TestCase
{
    use RefreshDatabase;

    public function test_valid_credentials_return_a_bearer_token(): void
    {
        $user = User::factory()->create([
            'email' => 'member@example.com',
            'status' => 'active',
        ]);

        $response = $this->postJson('/api/auth/token', [
            'email' => 'member@example.com',
            'password' => 'password',
            'device_name' => 'pixel-test',
        ]);

        $response->assertOk()
            ->assertJsonStructure(['token', 'token_type', 'user' => ['id', 'email']])
            ->assertJsonPath('token_type', 'Bearer')
            ->assertJsonPath('user.email', 'member@example.com');

        $this->assertNotEmpty($response->json('token'));
        $this->assertDatabaseHas('personal_access_tokens', [
            'tokenable_id' => $user->id,
            'name' => 'pixel-test',
        ]);
    }

    public function test_invalid_password_is_rejected(): void
    {
        User::factory()->create([
            'email' => 'member@example.com',
            'status' => 'active',
        ]);

        $this->postJson('/api/auth/token', [
            'email' => 'member@example.com',
            'password' => 'wrong-password',
        ])->assertStatus(422);
    }

    public function test_issued_token_authenticates_subsequent_requests(): void
    {
        User::factory()->create([
            'email' => 'member@example.com',
            'status' => 'active',
        ]);

        $token = $this->postJson('/api/auth/token', [
            'email' => 'member@example.com',
            'password' => 'password',
        ])->json('token');

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/auth/me')
            ->assertOk()
            ->assertJsonPath('email', 'member@example.com');
    }
}
