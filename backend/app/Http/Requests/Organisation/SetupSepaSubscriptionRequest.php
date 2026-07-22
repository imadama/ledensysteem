<?php

namespace App\Http\Requests\Organisation;

use App\Rules\ValidIban;
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
            'iban' => ['nullable', 'string', 'max:34', new ValidIban],
            'description' => ['nullable', 'string', 'max:500'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ];
    }
}
