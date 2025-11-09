<?php

namespace App\Models;

use App\Models\Concerns\OrganisationScoped;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Member extends Model
{
    use HasFactory;
    use OrganisationScoped;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'organisation_id',
        'member_number',
        'first_name',
        'last_name',
        'gender',
        'birth_date',
        'email',
        'phone',
        'street_address',
        'postal_code',
        'city',
        'iban',
        'status',
        'contribution_amount',
        'contribution_frequency',
        'contribution_start_date',
        'contribution_note',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'birth_date' => 'date',
            'contribution_start_date' => 'date',
            'contribution_amount' => 'decimal:2',
        ];
    }

    public function organisation(): BelongsTo
    {
        return $this->belongsTo(Organisation::class);
    }

    public function contributionHistories(): HasMany
    {
        return $this->hasMany(MemberContributionHistory::class);
    }

    public function getFullNameAttribute(): string
    {
        return trim($this->first_name.' '.$this->last_name);
    }
}


