<?php

namespace App\Services\Firebase;

use App\Models\DeviceToken;
use Illuminate\Support\Facades\Log;
use Kreait\Firebase\Contract\Messaging;
use Kreait\Firebase\Factory;
use Kreait\Firebase\Messaging\CloudMessage;
use Kreait\Firebase\Messaging\Notification as FcmNotification;
use Throwable;

/**
 * Sends FCM push notifications to the Android devices of an organisation's members.
 * If Firebase credentials are not configured the sender is a no-op, so callers
 * (e.g. creating a post) never fail because push is unavailable.
 */
class FcmSender
{
    /**
     * @param  array<string, string>  $data
     */
    public function sendToOrganisation(int $organisationId, string $title, string $body, array $data = []): void
    {
        $messaging = $this->messaging();
        if ($messaging === null) {
            return;
        }

        $tokens = DeviceToken::query()
            ->where('organisation_id', $organisationId)
            ->where('platform', 'android')
            ->pluck('token')
            ->all();

        if (empty($tokens)) {
            return;
        }

        $message = CloudMessage::new()
            ->withNotification(FcmNotification::create($title, $body))
            ->withData($data);

        try {
            $report = $messaging->sendMulticast($message, $tokens);

            $stale = array_merge($report->invalidTokens(), $report->unknownTokens());
            if (! empty($stale)) {
                DeviceToken::query()->whereIn('token', $stale)->delete();
            }
        } catch (Throwable $e) {
            Log::error('FCM send failed', ['error' => $e->getMessage()]);
        }
    }

    private function messaging(): ?Messaging
    {
        $credentials = config('services.firebase.credentials');

        if (! is_string($credentials) || $credentials === '' || ! file_exists($credentials)) {
            return null;
        }

        try {
            return (new Factory())->withServiceAccount($credentials)->createMessaging();
        } catch (Throwable $e) {
            Log::error('FCM initialisation failed', ['error' => $e->getMessage()]);

            return null;
        }
    }
}
