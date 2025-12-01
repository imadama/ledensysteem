<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PaymentTransaction extends Model
{
    use HasFactory;

    protected $fillable = [
        'organisation_id',
        'member_id',
        'type',
        'amount',
        'currency',
        'status',
        'stripe_payment_intent_id',
        'stripe_checkout_session_id',
        'metadata',
        'occurred_at',
        'failure_reason',
        'retry_count',
        'last_retry_at',
        'failure_metadata',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'metadata' => 'array',
            'occurred_at' => 'datetime',
            'last_retry_at' => 'datetime',
            'failure_metadata' => 'array',
        ];
    }

    public function organisation(): BelongsTo
    {
        return $this->belongsTo(Organisation::class);
    }

    public function member(): BelongsTo
    {
        return $this->belongsTo(Member::class);
    }

    /**
     * @return HasMany<MemberContributionRecord>
     */
    public function memberContributionRecords(): HasMany
    {
        return $this->hasMany(MemberContributionRecord::class);
    }
}
