<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Controleer incomplete subscriptions elk uur
Schedule::command('subscriptions:check-incomplete --hours=1')
    ->hourly()
    ->withoutOverlapping()
    ->runInBackground();

// Controleer grace periods voor organisatie-abonnementen dagelijks
Schedule::command('org:check-grace-period')->daily();

// Stuur betaalherinneringen naar organisaties die nog geen abonnement hebben gekozen (na 24 uur)
Schedule::command('org:send-payment-reminders')->daily();
