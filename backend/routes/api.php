<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\Organisation\MemberController;
use App\Http\Controllers\Api\OrganisationUserController;
use App\Http\Controllers\Api\PlatformOrganisationController;
use Illuminate\Support\Facades\Route;

Route::prefix('auth')->group(function (): void {
    Route::post('register-organisation', [AuthController::class, 'registerOrganisation']);
    Route::post('login', [AuthController::class, 'login']);
    Route::post('forgot-password', [AuthController::class, 'forgotPassword']);
    Route::post('reset-password', [AuthController::class, 'resetPassword']);

    Route::middleware('auth:sanctum')->group(function (): void {
        Route::post('logout', [AuthController::class, 'logout']);
        Route::get('me', [AuthController::class, 'me']);
    });
});

Route::middleware(['auth:sanctum', 'role:org_admin'])
    ->prefix('organisation')
    ->group(function (): void {
        Route::get('users', [OrganisationUserController::class, 'index']);
        Route::post('users', [OrganisationUserController::class, 'store']);
        Route::patch('users/{id}/block', [OrganisationUserController::class, 'block']);
        Route::patch('users/{id}/unblock', [OrganisationUserController::class, 'unblock']);
        Route::delete('users/{id}', [OrganisationUserController::class, 'destroy']);

        Route::get('members/import/template', [MemberController::class, 'downloadTemplate']);
        Route::post('members/import/preview', [MemberController::class, 'previewImport']);
        Route::post('members/import/confirm', [MemberController::class, 'confirmImport']);
        Route::get('members', [MemberController::class, 'index']);
        Route::post('members', [MemberController::class, 'store']);
        Route::get('members/{id}', [MemberController::class, 'show']);
        Route::put('members/{id}', [MemberController::class, 'update']);
        Route::patch('members/{id}/status', [MemberController::class, 'updateStatus']);
    });

Route::middleware(['auth:sanctum', 'role:platform_admin'])
    ->prefix('platform')
    ->group(function (): void {
        Route::get('organisations', [PlatformOrganisationController::class, 'index']);
        Route::get('organisations/{id}', [PlatformOrganisationController::class, 'show']);
        Route::patch('organisations/{id}/activate', [PlatformOrganisationController::class, 'activate']);
        Route::patch('organisations/{id}/block', [PlatformOrganisationController::class, 'block']);
    });

