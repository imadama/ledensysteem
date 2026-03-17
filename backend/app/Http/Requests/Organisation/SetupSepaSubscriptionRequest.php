<?php

namespace App\Http\Requests\Organisation;

use Illuminate\Foundation\Http\FormRequest;

class SetupSepaSubscriptionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('iban') && $this->input('iban')) {
            $this->merge([
                'iban' => strtoupper(str_replace(' ', '', $this->input('iban'))),
            ]);
        }
    }

    public function rules(): array
    {
        return [
            'amount' => ['required', 'numeric', 'min:0.01'],
            'iban' => ['nullable', 'string', 'max:34', function($attribute, $value, $fail) {
                // Strip spaces and convert to uppercase
                $iban = strtoupper(str_replace(' ', '', $value));

                // Basic format check: 2 letters + 2 digits + up to 30 alphanumeric
                if (!preg_match('/^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$/', $iban)) {
                    $fail('Het IBAN-nummer heeft een ongeldig formaat.');
                    return;
                }

                // IBAN checksum validation (mod 97)
                $rearranged = substr($iban, 4) . substr($iban, 0, 4);
                $numeric = '';
                foreach (str_split($rearranged) as $char) {
                    $numeric .= ctype_alpha($char) ? (ord($char) - 55) : $char;
                }

                // Calculate mod 97 using bcmath or chunk approach
                $remainder = 0;
                foreach (str_split($numeric, 7) as $chunk) {
                    $remainder = (int)(($remainder . $chunk) % 97);
                }

                if ($remainder !== 1) {
                    $fail('Het IBAN-nummer is ongeldig (onjuist controlegetal).');
                }
            }],
            'description' => ['nullable', 'string', 'max:500'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ];
    }
}
