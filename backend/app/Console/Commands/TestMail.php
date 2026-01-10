<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;

class TestMail extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'mail:test {email? : E-mailadres om testmail naar te sturen}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Test de SMTP mail configuratie door een test email te versturen';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $this->info('=== SMTP Mail Configuratie Test ===');
        $this->newLine();

        // Toon huidige configuratie
        $this->info('Huidige mail configuratie:');
        $this->table(
            ['Instelling', 'Waarde'],
            [
                ['MAIL_MAILER', config('mail.default')],
                ['MAIL_HOST', config('mail.mailers.smtp.host')],
                ['MAIL_PORT', config('mail.mailers.smtp.port')],
                ['MAIL_ENCRYPTION', config('mail.mailers.smtp.encryption')],
                ['MAIL_USERNAME', config('mail.mailers.smtp.username')],
                ['MAIL_PASSWORD', str_repeat('*', strlen(config('mail.mailers.smtp.password') ?? ''))],
                ['MAIL_FROM_ADDRESS', config('mail.from.address')],
                ['MAIL_FROM_NAME', config('mail.from.name')],
            ]
        );
        $this->newLine();

        // Test verbinding
        $this->info('Testen van SMTP verbinding...');
        
        try {
            // Test of we kunnen verbinden met de SMTP server
            $host = config('mail.mailers.smtp.host');
            $port = config('mail.mailers.smtp.port');
            
            $this->line("Verbinden met {$host}:{$port}...");
            
            $connection = @fsockopen($host, $port, $errno, $errstr, 10);
            
            if (!$connection) {
                $this->error("❌ Kan niet verbinden met {$host}:{$port}");
                $this->error("   Fout: {$errstr} ({$errno})");
                return Command::FAILURE;
            }
            
            fclose($connection);
            $this->info("✓ Verbinding met {$host}:{$port} succesvol");
            $this->newLine();
            
            // Probeer een test email te versturen
            $testEmail = $this->argument('email') ?? config('mail.from.address');
            
            if (!$testEmail) {
                $this->error('❌ Geen e-mailadres opgegeven en MAIL_FROM_ADDRESS is niet ingesteld');
                return Command::FAILURE;
            }
            
            $this->info("Versturen van test email naar: {$testEmail}");
            
            Mail::raw('Dit is een test email van het ledensysteem. Als je dit ontvangt, werkt de SMTP configuratie correct!', function ($message) use ($testEmail) {
                $message->to($testEmail)
                    ->subject('Test Email - Ledensysteem SMTP Configuratie');
            });
            
            $this->info('✓ Test email succesvol verstuurd!');
            $this->newLine();
            $this->info('Controleer je inbox (en spam folder) op: ' . $testEmail);
            
            return Command::SUCCESS;
            
        } catch (\Exception $e) {
            $this->error('❌ Fout bij het versturen van test email:');
            $this->error('   ' . $e->getMessage());
            $this->newLine();
            $this->warn('Mogelijke oorzaken:');
            $this->line('1. Verkeerde SMTP credentials (username/password)');
            $this->line('2. Gmail App Password is niet correct of verouderd');
            $this->line('3. 2FA is niet ingeschakeld op het Google account');
            $this->line('4. Verkeerde poort of encryptie instelling');
            $this->line('5. Firewall blokkeert SMTP verbinding');
            $this->newLine();
            
            Log::error('Mail test failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            
            return Command::FAILURE;
        }
    }
}
