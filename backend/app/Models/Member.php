<?php

namespace App\Models;

use App\Models\Concerns\OrganisationScoped;
use App\Models\MemberContributionRecord;
use App\Models\MemberInvitation;
use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Carbon;

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

    public function contributionRecords(): HasMany
    {
        return $this->hasMany(MemberContributionRecord::class);
    }

    public function user(): HasOne
    {
        return $this->hasOne(User::class);
    }

    public function memberInvitations(): HasMany
    {
        return $this->hasMany(MemberInvitation::class);
    }

    public function latestMemberInvitation(): HasOne
    {
        return $this->hasOne(MemberInvitation::class)->latestOfMany('created_at');
    }

    public function pendingMemberInvitation(): HasOne
    {
        return $this->hasOne(MemberInvitation::class)
            ->where('status', 'pending')
            ->whereNull('used_at')
            ->where(function ($query): void {
                $query->whereNull('expires_at')
                    ->orWhere('expires_at', '>', now());
            })
            ->latestOfMany('created_at');
    }

    public function hasActiveAccount(): bool
    {
        $user = $this->user;

        if (! $user) {
            return false;
        }

        if ($user->status !== 'active') {
            return false;
        }

        return $this->userHasMemberRole($user);
    }

    public function getAccountStatusAttribute(): string
    {
        $user = $this->user;

        if ($user && $user->status === 'blocked' && $this->userHasMemberRole($user)) {
            return 'blocked';
        }

        if ($this->hasActiveAccount()) {
            return 'active';
        }

        return $this->hasPendingInvitation() ? 'invited' : 'none';
    }

    public function getAccountEmailAttribute(): ?string
    {
        return $this->user?->email;
    }

    public function getLastInvitationSentAtAttribute(): ?Carbon
    {
        $invitation = $this->relationLoaded('latestMemberInvitation')
            ? $this->latestMemberInvitation
            : $this->latestMemberInvitation()->first();

        return $invitation?->created_at;
    }

    public function getFullNameAttribute(): string
    {
        return trim($this->first_name.' '.$this->last_name);
    }

    private function hasPendingInvitation(): bool
    {
        return $this->getPendingInvitation() !== null;
    }

    private function getPendingInvitation(): ?MemberInvitation
    {
        if ($this->relationLoaded('pendingMemberInvitation')) {
            return $this->pendingMemberInvitation;
        }

        return $this->pendingMemberInvitation()->first();
    }

    private function userHasMemberRole(User $user): bool
    {
        if ($user->relationLoaded('roles')) {
            return $user->roles->contains(fn (Role $role) => $role->name === 'member');
        }

        return $user->hasRole('member');
    }
}

