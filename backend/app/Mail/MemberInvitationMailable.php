<?php

namespace App\Mail;

use App\Models\MemberInvitation;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class MemberInvitationMailable extends Mailable
{
    use Queueable;
    use SerializesModels;

    public function __construct(
        public readonly MemberInvitation $invitation
    ) {
    }

    public function build(): self
    {
        $member = $this->invitation->member;
        $organisation = $member?->organisation;

        $frontendUrl = rtrim(
            (string) (config('app.frontend_url') ?? env('FRONTEND_URL', 'http://localhost:5173')),
            '/'
        );

        $activationUrl = $frontendUrl.'/portal/activate?token='.urlencode($this->invitation->token);

        $subject = __('Uitnodiging voor het ledenportaal van :organisation', [
            'organisation' => $organisation?->name ?? config('app.name', 'Ledenportaal'),
        ]);

        return $this->subject($subject)
            ->view('emails.member_invitation', [
                'invitation' => $this->invitation,
                'member' => $member,
                'organisation' => $organisation,
                'activationUrl' => $activationUrl,
            ]);
    }
}


