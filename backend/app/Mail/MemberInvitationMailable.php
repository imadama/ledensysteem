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

    /**
     * @param  string  $plainToken  Ongehashte token voor de activatielink; de
     *                              invitation zelf bevat alleen de hash.
     */
    public function __construct(
        public readonly MemberInvitation $invitation,
        public readonly string $plainToken,
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

        $subdomain = $organisation?->subdomain;
        if ($subdomain) {
            $parsedFrontend = parse_url($frontendUrl);
            $scheme = $parsedFrontend['scheme'] ?? 'https';
            $host = $parsedFrontend['host'] ?? 'aidatim.nl';
            // Strip 'app.' prefix to get the base domain (app.aidatim.nl → aidatim.nl)
            $baseDomain = preg_replace('/^app\./', '', $host);
            $portalBase = $scheme.'://'.$subdomain.'.'.$baseDomain;
        } else {
            $portalBase = $frontendUrl;
        }

        $activationUrl = $portalBase.'/portal/activate?token='.urlencode($this->plainToken);

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
