<?php

namespace App\Http\Requests\Organisation\Concerns;

use Carbon\CarbonImmutable;

trait NormalizesMemberDates
{
    /**
     * @param array<string> $fields
     */
    protected function normalizeDateFields(array $fields): void
    {
        foreach ($fields as $field) {
            if (! $this->has($field)) {
                continue;
            }

            $value = $this->input($field);

            if ($value === null || $value === '') {
                $this->merge([$field => null]);
                continue;
            }

            $normalized = $this->tryNormalizeDate($value);

            if ($normalized !== null) {
                $this->merge([$field => $normalized]);
            }
        }
    }

    private function tryNormalizeDate(mixed $value): ?string
    {
        if (! is_string($value)) {
            return null;
        }

        $trimmed = trim($value);

        if ($trimmed === '') {
            return null;
        }

        if (preg_match('/^\d{2}-\d{2}-\d{4}$/', $trimmed) === 1) {
            $date = CarbonImmutable::createFromFormat('d-m-Y', $trimmed);

            return $date?->toDateString();
        }

        try {
            return CarbonImmutable::parse($trimmed)->toDateString();
        } catch (\Throwable) {
            return null;
        }
    }
}


