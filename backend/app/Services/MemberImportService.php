<?php

namespace App\Services;

use App\Imports\MemberRowsImport;
use App\Models\Member;
use App\Models\User;
use App\Services\Concerns\ResolvesOrganisation;
use Carbon\Carbon;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Maatwebsite\Excel\Facades\Excel;
use PhpOffice\PhpSpreadsheet\Shared\Date as ExcelDate;

class MemberImportService
{
    use ResolvesOrganisation;
    private const CACHE_PREFIX = 'member-import';

    /**
     * @return array<string, mixed>
     */
    public function previewImport(User $user, UploadedFile $file): array
    {
        $organisationId = $this->requireOrganisationId($user);

        // Gebruik Excel::import in plaats van toCollection om geheugenverbruik te beperken bij grote bestanden
        // Hoewel previewImport nog steeds de rijen verzamelt voor de UI, helpt ChunkReading bij het inlezen.
        $import = new MemberRowsImport();
        Excel::import($import, $file);
        $collection = $import->getRows();

        $totalRows = 0;
        $validRows = [];
        $invalidRows = [];

        foreach ($collection as $index => $row) {
            $rowNumber = $index + 2; // Account for heading row
            $rowArray = $this->normalizeRow($row);

            if ($this->rowIsEmpty($rowArray)) {
                continue;
            }

            $totalRows++;

            [$parsedRow, $errors] = $this->validateRow($rowArray);

            if (! empty($errors)) {
                $invalidRows[] = [
                    'row_number' => $rowNumber,
                    'errors' => $errors,
                ];

                continue;
            }

            $validRows[] = [
                'row_number' => $rowNumber,
                'data' => $parsedRow,
            ];
        }

        $token = (string) Str::uuid();

        Cache::put(
            $this->cacheKey($token, $organisationId),
            [
                'organisation_id' => $organisationId,
                'rows' => array_column($validRows, 'data'),
                'total_rows' => $totalRows,
            ],
            now()->addHour()
        );

        return [
            'total_rows' => $totalRows,
            'valid_count' => count($validRows),
            'invalid_count' => count($invalidRows),
            'valid_rows' => $validRows,
            'invalid_rows' => $invalidRows,
            'import_token' => $token,
        ];
    }

    /**
     * @return array<string, int|string>
     */
    public function confirmImport(User $user, string $token): array
    {
        $organisationId = $this->requireOrganisationId($user);

        $cacheKey = $this->cacheKey($token, $organisationId);

        $payload = Cache::pull($cacheKey);

        if (! $payload || ! is_array($payload)) {
            abort(404, 'Import token is ongeldig of verlopen.');
        }

        if ((int) ($payload['organisation_id'] ?? 0) !== $organisationId) {
            abort(403, 'Import token hoort niet bij deze organisatie.');
        }

        $rows = $payload['rows'] ?? [];

        if (! is_array($rows)) {
            abort(400, 'Importgegevens ongeldig.');
        }

        $imported = 0;

        DB::transaction(function () use ($rows, $organisationId, &$imported): void {
            foreach ($rows as $row) {
                if (! is_array($row)) {
                    continue;
                }

                Member::create([
                    'organisation_id' => $organisationId,
                    'member_number' => $row['member_number'] ?? null,
                    'first_name' => $row['first_name'],
                    'last_name' => $row['last_name'],
                    'gender' => $row['gender'],
                    'birth_date' => $row['birth_date'] ?? null,
                    'email' => $row['email'] ?? null,
                    'phone' => $row['phone'] ?? null,
                    'street_address' => $row['street_address'] ?? null,
                    'postal_code' => $row['postal_code'] ?? null,
                    'city' => $row['city'] ?? null,
                    'iban' => $row['iban'] ?? null,
                    'status' => 'active',
                    'contribution_amount' => $row['contribution_amount'] ?? null,
                    'contribution_frequency' => $row['contribution_frequency'] ?? null,
                    'contribution_start_date' => $row['contribution_start_date'] ?? null,
                    'contribution_note' => $row['contribution_note'] ?? null,
                ]);

                $imported++;
            }
        });

        $totalRows = (int) ($payload['total_rows'] ?? 0);
        $skipped = max(0, $totalRows - $imported);

        return [
            'imported_count' => $imported,
            'skipped_count' => $skipped,
            'message' => $imported > 0
                ? sprintf('%d leden geïmporteerd.', $imported)
                : 'Geen leden geïmporteerd.',
        ];
    }

    /**
     * @param array<string, mixed> $row
     *
     * @return array{0: array<string, mixed>, 1: list<string>}
     */
    private function validateRow(array $row): array
    {
        $errors = [];

        $data = [
            'member_number' => $row['lidnummer'] ?? null,
            'first_name' => $this->normalizeString($row['voornaam'] ?? null),
            'last_name' => $this->normalizeString($row['achternaam'] ?? null),
            'gender' => $this->normalizeGender($row['geslacht'] ?? null),
            'contribution_amount' => null,
            'email' => $this->normalizeString($row['email'] ?? null),
            'birth_date' => null,
            'street_address' => $this->normalizeString($row['straatnaam_huisnummer'] ?? null),
            'postal_code' => $this->normalizeString($row['postcode'] ?? null),
            'city' => $this->normalizeString($row['plaats'] ?? null),
            'phone' => $this->normalizeString($row['telnummer'] ?? null),
            'iban' => $this->normalizeString($row['iban'] ?? null),
        ];

        if ($data['first_name'] === null || $data['first_name'] === '') {
            $errors[] = 'Voornaam is verplicht.';
        }

        if ($data['last_name'] === null || $data['last_name'] === '') {
            $errors[] = 'Achternaam is verplicht.';
        }

        if ($data['gender'] === null || $data['gender'] === '') {
            $errors[] = 'Geslacht is verplicht.';
        } elseif (! in_array($data['gender'], ['m', 'f'], true)) {
            $errors[] = 'Geslacht moet m of f zijn.';
        }

        [$amount, $amountError] = $this->parseDecimal($row['bedrag'] ?? null);
        if ($amountError !== null) {
            $errors[] = $amountError;
        } else {
            $data['contribution_amount'] = $amount;
        }

        if ($data['email'] !== null && $data['email'] !== '' && ! filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
            $errors[] = 'E-mailadres is ongeldig.';
        }

        [$birthDate, $birthDateError] = $this->parseDate($row['geboortedatum'] ?? null);
        if ($birthDateError !== null) {
            $errors[] = $birthDateError;
        } else {
            $data['birth_date'] = $birthDate;
        }

        return [$data, $errors];
    }

    /**
     * @param array<string, mixed> $row
     */
    private function rowIsEmpty(array $row): bool
    {
        foreach ($row as $value) {
            if ($value === null) {
                continue;
            }

            if (is_string($value) && trim($value) === '') {
                continue;
            }

            if ($value === '') {
                continue;
            }

            return false;
        }

        return true;
    }

    /**
     * @param mixed $value
     */
    private function normalizeString($value): ?string
    {
        if ($value === null) {
            return null;
        }

        if (is_string($value)) {
            $trimmed = trim($value);

            return $trimmed === '' ? null : $trimmed;
        }

        if (is_numeric($value)) {
            return (string) $value;
        }

        return null;
    }

    /**
     * @param mixed $value
     */
    private function normalizeGender($value): ?string
    {
        $string = $this->normalizeString($value);

        return $string ? strtolower($string) : null;
    }

    /**
     * @param mixed $value
     *
     * @return array{0: ?string, 1: ?string}
     */
    private function parseDecimal($value): array
    {
        if ($value === null || $value === '') {
            return [null, null];
        }

        if (is_string($value)) {
            $normalized = str_replace(['€', ' '], '', $value);
            $normalized = str_replace(',', '.', $normalized);

            if (is_numeric($normalized)) {
                return [$this->formatDecimal($normalized), null];
            }

            return [null, 'Bedrag moet een geldig getal zijn.'];
        }

        if (is_numeric($value)) {
            return [$this->formatDecimal($value), null];
        }

        return [null, 'Bedrag moet een geldig getal zijn.'];
    }

    /**
     * @param mixed $value
     *
     * @return array{0: ?string, 1: ?string}
     */
    private function parseDate($value): array
    {
        if ($value === null || $value === '') {
            return [null, null];
        }

        if ($value instanceof \DateTimeInterface) {
            return [Carbon::instance($value)->toDateString(), null];
        }

        if (is_numeric($value)) {
            try {
                $date = ExcelDate::excelToDateTimeObject((float) $value);

                return [Carbon::instance($date)->toDateString(), null];
            } catch (\Throwable) {
                return [null, 'Geboortedatum moet een geldige datum zijn.'];
            }
        }

        if (is_string($value)) {
            $trimmed = trim($value);

            if ($trimmed === '') {
                return [null, null];
            }

            try {
                if (preg_match('/^\d{2}-\d{2}-\d{4}$/', $trimmed) === 1) {
                    $date = Carbon::createFromFormat('d-m-Y', $trimmed);

                    if ($date !== false) {
                        return [$date->toDateString(), null];
                    }
                }

                $date = Carbon::parse($trimmed);

                return [$date->toDateString(), null];
            } catch (\Throwable) {
                return [null, 'Geboortedatum moet het formaat dd-mm-jjjj hebben of een geldige datum zijn.'];
            }
        }

        return [null, 'Geboortedatum moet een geldige datum zijn.'];
    }

    /**
     * @param array<string, mixed>|mixed $row
     *
     * @return array<string, mixed>
     */
    private function normalizeRow($row): array
    {
        if (is_array($row)) {
            return $row;
        }

        if ($row instanceof \Illuminate\Support\Collection) {
            return $row->toArray();
        }

        if (is_iterable($row)) {
            return iterator_to_array($row);
        }

        return [];
    }

    private function cacheKey(string $token, int $organisationId): string
    {
        return implode(':', [self::CACHE_PREFIX, $organisationId, $token]);
    }


    /**
     * @param mixed $value
     */
    private function formatDecimal($value): string
    {
        return number_format((float) $value, 2, '.', '');
    }
}


