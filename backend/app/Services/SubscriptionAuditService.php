<?php

namespace App\Services;

use App\Models\Organisation;
use App\Models\SubscriptionAuditLog;
use App\Models\User;

class SubscriptionAuditService
{
    public function logPlanChange(
        Organisation $organisation,
        ?User $user,
        string $action, // 'upgrade', 'downgrade', 'cancel'
        ?array $oldPlan,
        ?array $newPlan,
        ?string $description = null,
        ?array $metadata = null
    ): SubscriptionAuditLog {
        return SubscriptionAuditLog::create([
            'organisation_id' => $organisation->id,
            'user_id' => $user?->id,
            'action_type' => 'plan_change',
            'old_value' => $oldPlan,
            'new_value' => $newPlan,
            'description' => $description ?? $this->generatePlanChangeDescription($action, $oldPlan, $newPlan),
            'metadata' => array_merge($metadata ?? [], ['action' => $action]),
        ]);
    }

    public function logPaymentEvent(
        Organisation $organisation,
        ?User $user,
        string $eventType, // 'succeeded', 'failed', 'retry', 'refund'
        array $paymentData,
        ?string $description = null,
        ?array $metadata = null
    ): SubscriptionAuditLog {
        return SubscriptionAuditLog::create([
            'organisation_id' => $organisation->id,
            'user_id' => $user?->id,
            'action_type' => 'payment_event',
            'old_value' => null,
            'new_value' => $paymentData,
            'description' => $description ?? $this->generatePaymentEventDescription($eventType, $paymentData),
            'metadata' => array_merge($metadata ?? [], ['event_type' => $eventType]),
        ]);
    }

    public function logSubscriptionStatusChange(
        Organisation $organisation,
        ?User $user,
        string $oldStatus,
        string $newStatus,
        ?string $description = null,
        ?array $metadata = null
    ): SubscriptionAuditLog {
        return SubscriptionAuditLog::create([
            'organisation_id' => $organisation->id,
            'user_id' => $user?->id,
            'action_type' => 'subscription_status_change',
            'old_value' => ['status' => $oldStatus],
            'new_value' => ['status' => $newStatus],
            'description' => $description ?? "Subscription status changed from {$oldStatus} to {$newStatus}",
            'metadata' => $metadata,
        ]);
    }

    public function logUserAction(
        Organisation $organisation,
        User $user,
        string $action, // 'subscription_started', 'subscription_cancelled', etc.
        ?string $description = null,
        ?array $metadata = null
    ): SubscriptionAuditLog {
        return SubscriptionAuditLog::create([
            'organisation_id' => $organisation->id,
            'user_id' => $user->id,
            'action_type' => 'user_action',
            'old_value' => null,
            'new_value' => ['action' => $action, 'user_email' => $user->email, 'user_name' => $user->name],
            'description' => $description ?? "User {$user->email} performed action: {$action}",
            'metadata' => array_merge($metadata ?? [], ['action' => $action]),
        ]);
    }

    private function generatePlanChangeDescription(string $action, ?array $oldPlan, ?array $newPlan): string
    {
        $oldPlanName = $oldPlan['name'] ?? 'None';
        $newPlanName = $newPlan['name'] ?? 'None';

        return match ($action) {
            'upgrade' => "Plan upgraded from {$oldPlanName} to {$newPlanName}",
            'downgrade' => "Plan downgraded from {$oldPlanName} to {$newPlanName}",
            'cancel' => "Subscription cancelled (was on {$oldPlanName})",
            default => "Plan changed: {$oldPlanName} → {$newPlanName}",
        };
    }

    private function generatePaymentEventDescription(string $eventType, array $paymentData): string
    {
        $amount = $paymentData['amount'] ?? 'unknown';
        $currency = $paymentData['currency'] ?? 'EUR';

        return match ($eventType) {
            'succeeded' => "Payment succeeded: {$amount} {$currency}",
            'failed' => "Payment failed: {$amount} {$currency}",
            'retry' => "Payment retry attempted: {$amount} {$currency}",
            'refund' => "Payment refunded: {$amount} {$currency}",
            default => "Payment event ({$eventType}): {$amount} {$currency}",
        };
    }
}

