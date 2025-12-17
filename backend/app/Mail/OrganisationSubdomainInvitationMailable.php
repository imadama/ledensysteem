<?php

namespace App\Mail;

use App\Models\Organisation;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class OrganisationSubdomainInvitationMailable extends Mailable
{
    use Queueable;
    use SerializesModels;

    public function __construct(
        public readonly Organisation $organisation
    ) {
    }

    public function build(): self
    {
        $subdomainUrl = 'https://'.$this->organisation->subdomain.'.aidatim.nl';

        $subject = __('Jullie subdomein URL voor :organisation', [
            'organisation' => $this->organisation->name,
        ]);

        return $this->subject($subject)
            ->view('emails.organisation_subdomain_invitation', [
                'organisation' => $this->organisation,
                'subdomainUrl' => $subdomainUrl,
            ]);
    }
}
