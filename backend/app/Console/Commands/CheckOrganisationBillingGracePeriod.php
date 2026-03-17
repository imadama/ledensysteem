<?php

namespace App\Console\Commands;

use App\Models\Organisation;
use Illuminate\Console\Command;

class CheckOrganisationBillingGracePeriod extends Command
{
    protected $signature = 'org:check-grace-period {--dry-run}';

    protected $description = 'Controleer organisaties met een verlopen abonnement en pas de billing status aan';

    public function handle(): int
    {
        $dryRun = $this->option('dry-run');

        if ($dryRun) {
            $this->info('[DRY-RUN] Geen wijzigingen worden opgeslagen.');
        }

        $this->checkPastDueToWarning($dryRun);
        $this->checkWarningToRestricted($dryRun);
        $this->checkCanceledToRestricted($dryRun);

        $this->info('Klaar met controleren van billing grace periods.');

        return Command::SUCCESS;
    }

    /**
     * Stap 1: past_due + billing_status active → warning
     */
    private function checkPastDueToWarning(bool $dryRun): void
    {
        $this->info('Controleren op organisaties met achterstallige betalingen (past_due)...');

        $organisations = Organisation::query()
            ->where('billing_status', 'active')
            ->whereHas('currentSubscription', function ($query) {
                $query->where('status', 'past_due');
            })
            ->get();

        if ($organisations->isEmpty()) {
            $this->info('Geen organisaties gevonden met achterstallige betalingen.');
            return;
        }

        $this->info("Gevonden {$organisations->count()} organisatie(s) met status past_due.");

        foreach ($organisations as $organisation) {
            $this->line("  Organisatie {$organisation->id} ({$organisation->name}): active → warning");

            if (! $dryRun) {
                $organisation->update([
                    'billing_status'         => 'warning',
                    'billing_note'           => 'Betaling achterstallig. Update uw betaalmethode om toegang te behouden.',
                    'billing_warning_sent_at' => now(),
                ]);
            }
        }
    }

    /**
     * Stap 2: billing_status warning + billing_warning_sent_at ouder dan 7 dagen → restricted
     */
    private function checkWarningToRestricted(bool $dryRun): void
    {
        $this->info('Controleren op organisaties waarvan de waarschuwingsperiode is verstreken (> 7 dagen)...');

        $organisations = Organisation::query()
            ->where('billing_status', 'warning')
            ->where('billing_warning_sent_at', '<=', now()->subDays(7))
            ->get();

        if ($organisations->isEmpty()) {
            $this->info('Geen organisaties gevonden waarvan de grace period is verstreken.');
            return;
        }

        $this->info("Gevonden {$organisations->count()} organisatie(s) waarvan de grace period is verstreken.");

        foreach ($organisations as $organisation) {
            $this->line("  Organisatie {$organisation->id} ({$organisation->name}): warning → restricted");

            if (! $dryRun) {
                $organisation->update([
                    'billing_status' => 'restricted',
                    'billing_note'   => 'Toegang geblokkeerd wegens niet-betaling. Neem contact op met support.',
                ]);
            }
        }
    }

    /**
     * Stap 3: abonnement canceled + billing_status active of warning → restricted
     */
    private function checkCanceledToRestricted(bool $dryRun): void
    {
        $this->info('Controleren op organisaties met een beëindigd abonnement (canceled)...');

        $organisations = Organisation::query()
            ->whereIn('billing_status', ['active', 'warning'])
            ->whereHas('currentSubscription', function ($query) {
                $query->where('status', 'canceled');
            })
            ->get();

        if ($organisations->isEmpty()) {
            $this->info('Geen organisaties gevonden met een beëindigd abonnement.');
            return;
        }

        $this->info("Gevonden {$organisations->count()} organisatie(s) met een beëindigd abonnement.");

        foreach ($organisations as $organisation) {
            $this->line("  Organisatie {$organisation->id} ({$organisation->name}): {$organisation->billing_status} → restricted");

            if (! $dryRun) {
                $organisation->update([
                    'billing_status' => 'restricted',
                    'billing_note'   => 'Abonnement beëindigd.',
                ]);
            }
        }
    }
}
