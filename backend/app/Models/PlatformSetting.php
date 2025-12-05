<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PlatformSetting extends Model
{
    use HasFactory;

    protected $fillable = [
        'key',
        'value',
        'description',
    ];

    /**
     * Get a setting value by key
     */
    public static function get(string $key, mixed $default = null): mixed
    {
        $setting = self::where('key', $key)->first();

        return $setting?->value ?? $default;
    }

    /**
     * Set a setting value by key
     */
    public static function set(string $key, mixed $value, ?string $description = null): void
    {
        self::updateOrCreate(
            ['key' => $key],
            [
                'value' => is_array($value) ? json_encode($value) : (string) $value,
                'description' => $description,
            ]
        );
    }

    /**
     * Get payment methods setting
     */
    public static function getPaymentMethods(): array
    {
        $value = self::get('payment_methods', '["card","sepa_debit"]');
        
        if (is_string($value)) {
            $decoded = json_decode($value, true);
            return is_array($decoded) ? $decoded : ['card', 'sepa_debit'];
        }

        return is_array($value) ? $value : ['card', 'sepa_debit'];
    }

    /**
     * Set payment methods setting
     */
    public static function setPaymentMethods(array $methods): void
    {
        self::set(
            'payment_methods',
            json_encode($methods),
            'Geconfigureerde betaalmethodes voor Stripe checkout sessions'
        );
    }
}
