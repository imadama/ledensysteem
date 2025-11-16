<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrganisationStripeConnection extends Model
{
    use HasFactory;

    protected $fillable = [
        'organisation_id',
        'stripe_account_id',
        'status',
        'activated_at',
        'last_error',
    ];

    /**
     * @var array<string, mixed>
     */
    protected $attributes = [
        'status' => 'none',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'activated_at' => 'datetime',
        ];
    }

    public function organisation(): BelongsTo
    {
        return $this->belongsTo(Organisation::class);
    }
}
