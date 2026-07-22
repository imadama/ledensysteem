<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

/**
 * Valideert een IBAN op formaat én mod-97 controlegetal (ISO 13616).
 * Voorkomt dat goed-gevormde-maar-ongeldige IBANs in de database komen die
 * pas bij de eerste SEPA-incasso zouden falen.
 */
class ValidIban implements ValidationRule
{
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        $iban = strtoupper(str_replace(' ', '', (string) $value));

        // Formaat: 2 letters (land) + 2 controlecijfers + 11–30 alfanumeriek.
        if (! preg_match('/^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$/', $iban)) {
            $fail('Het IBAN-nummer heeft een ongeldig formaat.');

            return;
        }

        // Mod-97: verplaats de eerste 4 tekens naar achteren, zet letters om naar
        // getallen (A=10 … Z=35) en bereken de rest bij deling door 97 (moet 1 zijn).
        $rearranged = substr($iban, 4).substr($iban, 0, 4);
        $numeric = '';
        foreach (str_split($rearranged) as $char) {
            $numeric .= ctype_alpha($char) ? (ord($char) - 55) : $char;
        }

        $remainder = 0;
        foreach (str_split($numeric, 7) as $chunk) {
            $remainder = (int) (($remainder.$chunk) % 97);
        }

        if ($remainder !== 1) {
            $fail('Het IBAN-nummer is ongeldig (onjuist controlegetal).');
        }
    }
}
