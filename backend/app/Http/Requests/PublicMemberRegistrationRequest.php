<?php

namespace App\Http\Requests;

use App\Http\Requests\Organisation\Concerns\NormalizesMemberDates;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class PublicMemberRegistrationRequest extends FormRequest
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
            'org_id' => ['nullable', 'integer', 'exists:organisations,id'],
            'first_name' => ['required', 'string', 'max:255'],
            'last_name' => ['required', 'string', 'max:255'],
            'gender' => ['required', 'string', Rule::in(['m', 'f'])],
            'birth_date' => ['nullable', 'date'],
            'email' => ['required', 'email', 'max:255'],
            'street_address' => ['required', 'string', 'max:255'],
            'postal_code' => ['required', 'string', 'max:50'],
            'city' => ['required', 'string', 'max:255'],
            'iban' => ['required', 'string', 'max:255'],
            'contribution_amount' => ['required', 'numeric', Rule::in([10, 15, 20, 25])],
            'contribution_start_date' => ['required', 'date', 'after_or_equal:today'],
            'contribution_note' => ['nullable', 'string'],
            'sepa_consent' => ['required', 'accepted'],
        ];
    }

    /**
     * Get custom messages for validator errors.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'first_name.required' => 'Voornaam is verplicht.',
            'last_name.required' => 'Achternaam is verplicht.',
            'gender.required' => 'Geslacht is verplicht.',
            'gender.in' => 'Geslacht moet Man of Vrouw zijn.',
            'email.required' => 'E-mailadres is verplicht.',
            'email.email' => 'E-mailadres moet een geldig e-mailadres zijn.',
            'street_address.required' => 'Adres is verplicht.',
            'postal_code.required' => 'Postcode is verplicht.',
            'city.required' => 'Woonplaats is verplicht.',
            'iban.required' => 'IBAN is verplicht.',
            'contribution_amount.required' => 'Contributiebedrag is verplicht.',
            'contribution_amount.in' => 'Contributiebedrag moet 10, 15, 20 of 25 zijn.',
            'contribution_start_date.required' => 'Startdatum contributie is verplicht.',
            'contribution_start_date.date' => 'Startdatum contributie moet een geldige datum zijn.',
            'contribution_start_date.after_or_equal' => 'Startdatum contributie mag niet in het verleden liggen.',
            'sepa_consent.required' => 'U moet akkoord gaan met de SEPA machtiging.',
            'sepa_consent.accepted' => 'U moet akkoord gaan met de SEPA machtiging.',
        ];
    }

    /**
     * Configure the validator instance.
     */
    public function withValidator($validator): void
    {
        $validator->after(function ($validator): void {
            // IBAN validatie
            if ($this->has('iban') && $this->filled('iban')) {
                $iban = str_replace(' ', '', strtoupper($this->input('iban')));
                if (strlen($iban) < 15 || strlen($iban) > 34) {
                    $validator->errors()->add('iban', 'IBAN moet tussen 15 en 34 karakters lang zijn.');
                } elseif (!preg_match('/^[A-Z0-9]+$/', $iban)) {
                    $validator->errors()->add('iban', 'IBAN mag alleen letters en cijfers bevatten.');
                }
            }
        });
    }
}
