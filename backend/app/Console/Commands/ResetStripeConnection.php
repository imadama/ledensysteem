<?php

namespace App\Console\Commands;

use App\Models\Organisation;
use App\Models\OrganisationStripeConnection;
use App\Models\User;
use Illuminate\Console\Command;
use Stripe\Exception\ApiErrorException;
use Stripe\StripeClient;

class ResetStripeConnection extends Command
{
    protected $signature = 'stripe:reset-connection {email : Email adres van de organisatie gebruiker of contact_email}';

    protected $description = 'Reset Stripe Connect koppeling voor een organisatie';

    public function __construct(private readonly StripeClient $stripe)
    {
        parent::__construct();
    }

    public function handle(): int
    {
        $email = $this->argument('email');

        // Zoek organisatie via user email of contact_email
        $user = User::where('email', $email)->first();
        
        if ($user && $user->organisation_id) {
            $organisation = $user->organisation;
        } else {
            // Probeer via contact_email
            $organisation = Organisation::where('contact_email', $email)->first();
        }

        if (!$organisation) {
            $this->error("Geen organisatie gevonden voor email: {$email}");
            return Command::FAILURE;
        }

        $this->info("Organisatie gevonden: {$organisation->name} (ID: {$organisation->id})");

        $connection = $organisation->stripeConnection;

        if (!$connection || !$connection->stripe_account_id) {
            $this->warn("Geen Stripe Connect koppeling gevonden voor deze organisatie.");
            return Command::SUCCESS;
        }

        $this->info("Huidige status: {$connection->status}");
        $this->info("Stripe Account ID: {$connection->stripe_account_id}");

        if (!$this->confirm('Weet je zeker dat je deze Stripe Connect koppeling wilt resetten?', true)) {
            $this->info('Geannuleerd.');
            return Command::SUCCESS;
        }

        // Optioneel: Verwijder het Stripe account (let op: dit kan niet ongedaan worden gemaakt)
        if ($this->confirm('Wil je ook het Stripe account in Stripe verwijderen? (Dit kan niet ongedaan worden gemaakt)', false)) {
            try {
                $this->stripe->accounts->delete($connection->stripe_account_id);
                $this->info("✓ Stripe account verwijderd in Stripe");
            } catch (ApiErrorException $e) {
                $this->warn("Kon Stripe account niet verwijderen: {$e->getMessage()}");
            }
        }

        // Reset de lokale koppeling
        $connection->update([
            'stripe_account_id' => null,
            'status' => 'none',
            'activated_at' => null,
            'last_error' => null,
        ]);

        $this->info("✓ Stripe Connect koppeling gereset voor organisatie: {$organisation->name}");
        $this->info("De organisatie kan nu opnieuw een Stripe account koppelen via /organisation/settings/payments");

        return Command::SUCCESS;
    }
}
