<?php

namespace App\Http\Requests\Organisation;

use Illuminate\Foundation\Http\FormRequest;

class SetupSepaSubscriptionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'amount' => ['required', 'numeric', 'min:0.01'],
            'iban' => ['nullable', 'string', 'max:34'],
            'description' => ['nullable', 'string', 'max:500'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ];
    }
}
