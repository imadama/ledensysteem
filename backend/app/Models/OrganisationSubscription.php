<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrganisationSubscription extends Model
{
    use HasFactory;

    protected $fillable = [
        'organisation_id',
        'plan_id',
        'stripe_customer_id',
        'stripe_subscription_id',
        'latest_checkout_session_id',
        'status',
        'current_period_start',
        'current_period_end',
        'cancel_at',
        'canceled_at',
        'metadata',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'current_period_start' => 'datetime',
            'current_period_end' => 'datetime',
            'cancel_at' => 'datetime',
            'canceled_at' => 'datetime',
            'metadata' => 'array',
        ];
    }

    public function organisation(): BelongsTo
    {
        return $this->belongsTo(Organisation::class);
    }

    public function plan(): BelongsTo
    {
        return $this->belongsTo(Plan::class);
    }
}
