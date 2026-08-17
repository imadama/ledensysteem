<?php

namespace App\Http\Requests\Organisation;

use App\Http\Requests\Organisation\Concerns\NormalizesMemberDates;
use App\Rules\ValidIban;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateMemberRequest extends FormRequest
{
    use NormalizesMemberDates;

    /**
     * Prepare the data for validation.
     */
    protected function prepareForValidation(): void
    {
        $this->normalizeDateFields([
            'birth_date',
            'contribution_start_date',
        ]);

        if ($this->filled('iban')) {
            $this->merge([
                'iban' => strtoupper(str_replace(' ', '', (string) $this->input('iban'))),
            ]);
        }
    }

    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'member_number' => ['sometimes', 'nullable', 'string', 'max:255'],
            'first_name' => ['sometimes', 'required', 'string', 'max:255'],
            'last_name' => ['sometimes', 'required', 'string', 'max:255'],
            'gender' => ['sometimes', 'required', 'string', Rule::in(['m', 'f'])],
            'birth_date' => ['sometimes', 'nullable', 'date'],
            'email' => ['sometimes', 'nullable', 'email', 'max:255'],
            'phone' => ['sometimes', 'nullable', 'string', 'max:255'],
            'street_address' => ['sometimes', 'nullable', 'string', 'max:255'],
            'postal_code' => ['sometimes', 'nullable', 'string', 'max:50'],
            'city' => ['sometimes', 'nullable', 'string', 'max:255'],
            // Zie StoreMemberRequest: max:34 is de ISO 13616-maximumlengte, en het
            // beheerderspad viel buiten AUDIT-44.
            'iban' => ['sometimes', 'nullable', 'string', 'max:34', new ValidIban],
            'status' => ['sometimes', 'nullable', Rule::in(['active', 'inactive'])],
            'contribution_amount' => ['sometimes', 'nullable', 'numeric', 'min:0', 'max:9999999.99'],
            'contribution_frequency' => ['sometimes', 'nullable', 'string', 'max:255'],
            'contribution_start_date' => ['sometimes', 'nullable', 'date'],
            'contribution_note' => ['sometimes', 'nullable', 'string'],
        ];
    }
}
