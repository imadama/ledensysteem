<?php

namespace App\Console\Commands;

use App\Models\Organisation;
use Illuminate\Console\Command;

class GenerateOrganisationSubdomains extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'organisations:generate-subdomains {--dry-run : Toon wat er zou gebeuren zonder wijzigingen door te voeren}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Genereer subdomeinen voor alle organisaties die nog geen subdomein hebben';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $dryRun = $this->option('dry-run');

        if ($dryRun) {
            $this->info('🔍 DRY RUN MODE - Geen wijzigingen worden doorgevoerd');
            $this->newLine();
        }

        // Haal alle organisaties op zonder subdomein
        $organisations = Organisation::whereNull('subdomain')
            ->orWhere('subdomain', '')
            ->get();

        if ($organisations->isEmpty()) {
            $this->info('✅ Alle organisaties hebben al een subdomein.');
            return Command::SUCCESS;
        }

        $this->info("📋 Gevonden {$organisations->count()} organisatie(s) zonder subdomein:");
        $this->newLine();

        $updated = 0;
        $skipped = 0;

        foreach ($organisations as $organisation) {
            $this->line("  • {$organisation->name} (ID: {$organisation->id})");

            // Genereer subdomein
            $subdomain = Organisation::generateSubdomainFromName($organisation->name);

            $this->line("    → Subdomein: {$subdomain}");

            if ($dryRun) {
                $this->line("    → [DRY RUN] Zou worden bijgewerkt");
                $updated++;
            } else {
                try {
                    $organisation->update(['subdomain' => $subdomain]);
                    $this->info("    ✅ Bijgewerkt");
                    $updated++;
                } catch (\Exception $e) {
                    $this->error("    ❌ Fout: {$e->getMessage()}");
                    $skipped++;
                }
            }

            $this->newLine();
        }

        $this->newLine();
        if ($dryRun) {
            $this->info("📊 DRY RUN: {$updated} organisatie(s) zouden worden bijgewerkt");
        } else {
            $this->info("✅ {$updated} organisatie(s) bijgewerkt");
            if ($skipped > 0) {
                $this->warn("⚠️  {$skipped} organisatie(s) overgeslagen vanwege fouten");
            }
        }

        return Command::SUCCESS;
    }
}
