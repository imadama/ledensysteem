<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

// Sanctum CSRF cookie endpoint voor SPA authenticatie
// Gebruik alleen basis web middleware zonder AuthenticateSession
Route::get('/sanctum/csrf-cookie', function () {
    return response()->noContent();
})->middleware(['web', 'throttle:60,1']);
