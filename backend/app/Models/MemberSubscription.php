<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MemberSubscription extends Model
{
    use HasFactory;

    protected $fillable = [
        'member_id',
        'amount',
        'currency',
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
            'amount' => 'decimal:2',
            'current_period_start' => 'datetime',
            'current_period_end' => 'datetime',
            'cancel_at' => 'datetime',
            'canceled_at' => 'datetime',
            'metadata' => 'array',
        ];
    }

    public function member(): BelongsTo
    {
        return $this->belongsTo(Member::class);
    }
}
