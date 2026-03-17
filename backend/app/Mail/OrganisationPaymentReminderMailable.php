<?php

namespace App\Mail;

use App\Models\Organisation;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class OrganisationPaymentReminderMailable extends Mailable
{
    use Queueable;
    use SerializesModels;

    public function __construct(
        public readonly Organisation $organisation,
        public readonly User $user
    ) {
    }

    public function build(): self
    {
        $frontendUrl = rtrim(
            (string) (config('app.frontend_url') ?? env('FRONTEND_URL', 'http://localhost:5173')),
            '/'
        );

        $subscriptionUrl = $frontendUrl.'/organisation/subscription';

        return $this->subject(__('Herinnering: kies je abonnement om te starten'))
            ->view('emails.organisation-payment-reminder', [
                'organisation'    => $this->organisation,
                'user'            => $this->user,
                'frontendUrl'     => $frontendUrl,
                'subscriptionUrl' => $subscriptionUrl,
            ]);
    }
}
