<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\MemberActivationController;
use App\Http\Controllers\Api\Member\ContributionPaymentController;
use App\Http\Controllers\Api\Member\SelfServiceController;
use App\Http\Controllers\Api\Organisation\SubscriptionController;
use App\Http\Controllers\Api\Organisation\ContributionReportController;
use App\Http\Controllers\Api\Organisation\MemberController;
use App\Http\Controllers\Api\Organisation\PaymentConnectionController;
use App\Http\Controllers\Api\OrganisationUserController;
use App\Http\Controllers\Api\PlatformOrganisationController;
use App\Http\Controllers\Api\PlatformPlanController;
use App\Http\Controllers\Api\StripeWebhookController;
use App\Http\Controllers\Api\PlanController;
use Illuminate\Support\Facades\Route;

Route::prefix('member-activation')->group(function (): void {
    Route::get('{token}', [MemberActivationController::class, 'show']);
    Route::post('{token}', [MemberActivationController::class, 'store']);
});

Route::get('plans', [PlanController::class, 'index']);

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

Route::middleware(['auth:sanctum', 'role:org_admin', 'billing.status'])
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
        Route::post('members/invite-bulk', [MemberController::class, 'inviteBulk']);
        Route::post('members/{id}/invite', [MemberController::class, 'invite']);
        Route::get('members/{id}', [MemberController::class, 'show']);
        Route::put('members/{id}', [MemberController::class, 'update']);
        Route::patch('members/{id}/status', [MemberController::class, 'updateStatus']);
        Route::patch('members/{id}/block-account', [MemberController::class, 'blockAccount']);
        Route::patch('members/{id}/unblock-account', [MemberController::class, 'unblockAccount']);
        Route::get('members/{memberId}/contributions', [ContributionReportController::class, 'memberContributions']);

        Route::get('contributions/summary', [ContributionReportController::class, 'organisationSummary']);
        Route::get('contributions/matrix', [ContributionReportController::class, 'membersPaymentMatrix']);
        Route::get('subscription', [SubscriptionController::class, 'show']);
        Route::post('subscription/start', [SubscriptionController::class, 'start']);
        Route::post('subscription/cancel', [SubscriptionController::class, 'cancel']);
        Route::post('subscription/upgrade', [SubscriptionController::class, 'upgrade']);
        Route::post('subscription/downgrade', [SubscriptionController::class, 'downgrade']);

        Route::prefix('payments')->group(function (): void {
            Route::get('connection', [PaymentConnectionController::class, 'show']);
            Route::post('connection/onboarding-link', [PaymentConnectionController::class, 'createOnboardingLink']);
            Route::post('connection/refresh', [PaymentConnectionController::class, 'refresh']);
        });
    });

Route::middleware(['auth:sanctum', 'role:member', 'billing.status'])
    ->prefix('member')
    ->group(function (): void {
        Route::get('profile', [SelfServiceController::class, 'profile']);
        Route::put('profile', [SelfServiceController::class, 'updateProfile']);
        Route::get('contribution', [SelfServiceController::class, 'contribution']);
        Route::get('contribution-history', [SelfServiceController::class, 'contributionHistory']);
        Route::get('contribution-open', [ContributionPaymentController::class, 'index']);
        Route::post('contribution-pay', [ContributionPaymentController::class, 'store']);
        Route::post('contribution-pay-manual', [ContributionPaymentController::class, 'payManual']);
    });

Route::middleware(['auth:sanctum', 'role:platform_admin'])
    ->prefix('platform')
    ->group(function (): void {
        Route::get('organisations', [PlatformOrganisationController::class, 'index']);
        Route::get('organisations/{id}', [PlatformOrganisationController::class, 'show']);
        Route::get('organisations/{id}/audit-logs', [PlatformOrganisationController::class, 'auditLogs']);
        Route::patch('organisations/{id}/activate', [PlatformOrganisationController::class, 'activate']);
        Route::patch('organisations/{id}/block', [PlatformOrganisationController::class, 'block']);
        Route::get('plans', [PlatformPlanController::class, 'index']);
        Route::post('plans', [PlatformPlanController::class, 'store']);
        Route::put('plans/{id}', [PlatformPlanController::class, 'update']);
        Route::delete('plans/{id}', [PlatformPlanController::class, 'destroy']);
    });

Route::post('stripe/webhook', StripeWebhookController::class);

