<?php

namespace App\Exports;

use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithTitle;

class MemberTemplateExport implements FromCollection, WithHeadings, ShouldAutoSize, WithTitle
{
    /**
     * @return Collection<int, array<int, string|null>>
     */
    public function collection(): Collection
    {
        return collect([
            [
                '12345',
                'Jan',
                'Jansen',
                'm',
                '25.00',
                'jan.jansen@example.com',
                '01-01-1990',
                'Hoofdstraat 1',
                '1234AB',
                'Amsterdam',
                '0612345678',
                'NL01BANK0123456789',
            ],
            [
                'LET OP: veldnamen met * zijn verplicht. Geslacht = m of f. Datumformaat = dd-mm-jjjj.',
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
            ],
        ]);
    }

    /**
     * @return list<string>
     */
    public function headings(): array
    {
        return [
            'lidnummer',
            'voornaam *',
            'achternaam *',
            'geslacht *',
            'bedrag',
            'email',
            'geboortedatum',
            'straatnaam_huisnummer',
            'postcode',
            'plaats',
            'telnummer',
            'iban',
        ];
    }

    public function title(): string
    {
        return 'Leden import';
    }
}


