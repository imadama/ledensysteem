<?php

namespace App\Jobs;

use App\Services\Firebase\FcmSender;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

/**
 * Notifies an organisation's members of a new post. Implements ShouldQueue so it
 * can be moved onto a worker later; for now it is invoked via dispatchSync()
 * because no queue worker runs yet.
 */
class SendOrganisationPostNotification implements ShouldQueue
{
    use Dispatchable;
    use InteractsWithQueue;
    use Queueable;
    use SerializesModels;

    public function __construct(
        public int $organisationId,
        public int $postId,
        public string $title,
        public string $body,
    ) {
    }

    // DELIVERY step 3: the job simply asks the FcmSender to notify the whole
    // organisation. The extra `data` (type + post_id) travels with the push so
    // the app could, later, open the exact post when the notification is tapped.
    public function handle(FcmSender $sender): void
    {
        $sender->sendToOrganisation($this->organisationId, $this->title, $this->body, [
            'type' => 'organisation_post',
            'post_id' => (string) $this->postId,
        ]); // -> DELIVERY step 4
    }
}
