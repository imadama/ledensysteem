<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

// Sanctum CSRF cookie endpoint voor SPA authenticatie
Route::get('/sanctum/csrf-cookie', function () {
    return response()->noContent();
})->middleware('web');
