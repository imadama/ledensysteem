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
