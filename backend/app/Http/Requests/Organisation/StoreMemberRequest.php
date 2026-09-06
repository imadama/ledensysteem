<?php

namespace App\Http\Requests\Organisation;

use App\Http\Requests\Organisation\Concerns\NormalizesMemberDates;
use App\Rules\ValidIban;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreMemberRequest extends FormRequest
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
            'member_number' => ['nullable', 'string', 'max:255'],
            'first_name' => ['required', 'string', 'max:255'],
            'last_name' => ['required', 'string', 'max:255'],
            'gender' => ['required', 'string', Rule::in(['m', 'f'])],
            'birth_date' => ['nullable', 'date'],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:255'],
            'street_address' => ['nullable', 'string', 'max:255'],
            'postal_code' => ['nullable', 'string', 'max:50'],
            'city' => ['nullable', 'string', 'max:255'],
            // max:34 is de ISO 13616-maximumlengte. Stond op 255, wat betekende dat het
            // beheerderspad — het pad dat het meest gebruikt wordt — willekeurige tekst als
            // IBAN accepteerde. AUDIT-44 dekte alleen de publieke aanmelding en de SEPA-setup.
            'iban' => ['nullable', 'string', 'max:34', new ValidIban],
            'status' => ['nullable', Rule::in(['active', 'inactive'])],
            'contribution_amount' => ['nullable', 'numeric', 'min:0', 'max:9999999.99'],
            'contribution_frequency' => ['nullable', 'string', 'max:255'],
            'contribution_start_date' => ['nullable', 'date'],
            'contribution_note' => ['nullable', 'string'],
        ];
    }
}
