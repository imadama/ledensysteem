<?php

namespace App\Http\Controllers\Api\Member;

use App\Http\Controllers\Controller;
use App\Models\DeviceToken;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class DeviceTokenController extends Controller
{
    /**
     * REGISTRATION step 3: the app sent us its FCM token (POST /api/member/device-tokens).
     * We store it linked to this member AND their organisation, so FcmSender can
     * later look up "all tokens for organisation X" when a post is published.
     *
     * Register (or refresh) the device's push token for the current member.
     * Upsert on the token so a token migrating between accounts/devices is handled.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'token' => ['required', 'string', 'max:255'],
            'platform' => ['nullable', Rule::in(['android'])],
        ]);

        $user = $request->user(); // the logged-in member (from the Bearer token)

        // updateOrCreate = insert if new, update if the token already exists.
        // Keying on the token means the same phone re-logging as another member
        // simply moves the row to that member/organisation (no duplicates).
        DeviceToken::updateOrCreate(
            ['token' => $validated['token']],
            [
                'user_id' => $user->id,
                'organisation_id' => $user->organisation_id,
                'platform' => $validated['platform'] ?? 'android',
                'last_used_at' => now(),
            ],
        );

        return response()->json(null, 204); // 204 = success, no body needed
    }

    /** Unregister a device token (on logout). */
    public function destroy(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'token' => ['required', 'string'],
        ]);

        DeviceToken::query()
            ->where('user_id', $request->user()->id)
            ->where('token', $validated['token'])
            ->delete();

        return response()->json(null, 204);
    }
}
