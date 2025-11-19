<?php

namespace App\Console\Commands;

use App\Models\Member;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;

class FixMemberAccounts extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'members:fix-accounts {emails?* : Email addresses to check and fix} {--reset-password : Reset het wachtwoord naar een standaard waarde}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Controleer en repareer member accounts - koppel member_id en assign member rol';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $emails = $this->argument('emails');

        if (empty($emails)) {
            $emails = ['info@smartpowerdeals.nl', 'imadgames2003@gmail.com'];
            $this->info('Geen emails opgegeven, gebruik standaard emails: ' . implode(', ', $emails));
        }

        foreach ($emails as $email) {
            $this->info("\n=== Controleren: {$email} ===");

            $user = User::where('email', $email)->first();

            if (! $user) {
                $this->error("User niet gevonden: {$email}");
                continue;
            }

            $this->info("User gevonden - ID: {$user->id}, Status: {$user->status}");

            // Check roles
            $roles = $user->roles->pluck('name')->toArray();
            $this->info("Huidige rollen: " . (empty($roles) ? 'geen' : implode(', ', $roles)));

            // Check member_id
            if (! $user->member_id) {
                $this->warn("Geen member_id gekoppeld aan user");

                // Probeer member te vinden op basis van email
                $member = Member::where('email', $email)->first();

                if ($member) {
                    $this->info("Member gevonden op basis van email - ID: {$member->id}, Naam: {$member->full_name}");

                    // Koppel member aan user
                    $user->member_id = $member->id;
                    $user->organisation_id = $member->organisation_id;
                    $user->save();

                    $this->info("✓ Member gekoppeld aan user");
                } else {
                    $this->error("Geen member gevonden met email: {$email}");
                    continue;
                }
            } else {
                $member = $user->member;
                if ($member) {
                    $this->info("Member al gekoppeld - ID: {$member->id}, Naam: {$member->full_name}");
                } else {
                    $this->error("Member niet gevonden voor member_id: {$user->member_id}");
                    continue;
                }
            }

            // Check en assign member role
            if (! $user->hasRole('member')) {
                $this->warn("User heeft geen 'member' rol");
                $user->assignRole('member');
                $this->info("✓ 'member' rol toegewezen");
            } else {
                $this->info("✓ User heeft al 'member' rol");
            }

            // Check status
            if ($user->status !== 'active') {
                $this->warn("User status is niet 'active': {$user->status}");
                if ($this->confirm("Wil je de status naar 'active' zetten?", true)) {
                    $user->status = 'active';
                    $user->save();
                    $this->info("✓ Status aangepast naar 'active'");
                }
            } else {
                $this->info("✓ User status is 'active'");
            }

            // Reset password if requested
            if ($this->option('reset-password')) {
                $newPassword = 'Imad2003!';
                $user->password = Hash::make($newPassword);
                $user->save();
                $this->info("✓ Wachtwoord gereset naar: {$newPassword}");
            }

            $this->info("✓ Account gerepareerd voor: {$email}");
        }

        $this->info("\n=== Klaar ===");

        return Command::SUCCESS;
    }
}

