<?php

namespace App\Console\Commands;

use App\Mail\OrganisationPaymentReminderMailable;
use App\Models\Organisation;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;

class SendOrganisationPaymentReminders extends Command
{
    protected $signature = 'org:send-payment-reminders {--dry-run}';

    protected $description = 'Stuur betaalherinneringen naar organisaties die nog geen abonnement hebben gekozen';

    public function handle(): int
    {
        $dryRun = $this->option('dry-run');

        if ($dryRun) {
            $this->info('[DRY-RUN] Geen wijzigingen worden opgeslagen en geen e-mails verstuurd.');
        }

        $organisations = Organisation::query()
            ->where('billing_status', 'pending_payment')
            ->where('created_at', '<=', now()->subHours(24))
            ->whereNull('payment_reminder_sent_at')
            ->get();

        if ($organisations->isEmpty()) {
            $this->info('Geen organisaties gevonden die een betaalherinnering nodig hebben.');

            return Command::SUCCESS;
        }

        $this->info("Gevonden {$organisations->count()} organisatie(s) om een herinnering naar te sturen.");

        foreach ($organisations as $organisation) {
            $user = $organisation->users()->first();

            if (! $user) {
                $this->warn("  Organisatie {$organisation->id} ({$organisation->name}): geen gebruiker gevonden, overgeslagen.");
                continue;
            }

            $this->line("  Organisatie {$organisation->id} ({$organisation->name}): herinnering sturen naar {$user->email}");

            if (! $dryRun) {
                Mail::to($user->email)->send(new OrganisationPaymentReminderMailable($organisation, $user));

                $organisation->update([
                    'payment_reminder_sent_at' => now(),
                ]);
            }
        }

        $this->info('Klaar met versturen van betaalherinneringen.');

        return Command::SUCCESS;
    }
}
