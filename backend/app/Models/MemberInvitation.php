<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MemberInvitation extends Model
{
    use HasFactory;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'member_id',
        'email',
        'token',
        'status',
        'expires_at',
        'used_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'expires_at' => 'datetime',
            'used_at' => 'datetime',
        ];
    }

    public function member(): BelongsTo
    {
        return $this->belongsTo(Member::class);
    }

    /**
     * Zet een uitnodigingstoken om naar de vorm waarin het wordt opgeslagen.
     *
     * De kolom bewaart alleen de hash: het token is een bearer-credential waarmee een
     * ledenaccount wordt geactiveerd, dus wie de database inziet mag er niets aan hebben
     * (AUDIT-60). Bcrypt is hier niet nodig — Str::random(64) heeft ruim genoeg entropie
     * om brute force uit te sluiten — en SHA-256 houdt de lookup één indexed query.
     */
    public static function hashToken(string $plainToken): string
    {
        return hash('sha256', $plainToken);
    }
}


