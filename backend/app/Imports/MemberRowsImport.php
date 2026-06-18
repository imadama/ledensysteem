<?php

namespace App\Imports;

use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\ToCollection;
use Maatwebsite\Excel\Concerns\WithHeadingRow;

use Maatwebsite\Excel\Concerns\WithChunkReading;

class MemberRowsImport implements ToCollection, WithHeadingRow, WithChunkReading
{
    /**
     * @var Collection<int, array<string, mixed>>
     */
    private Collection $rows;

    public function __construct()
    {
        $this->rows = collect();
    }

    public function collection(Collection $rows): void
    {
        $this->rows = $rows;
    }

    /**
     * @return Collection<int, array<string, mixed>>
     */
    public function getRows(): Collection
    {
        return $this->rows;
    }

    public function chunkSize(): int
    {
        return 500;
    }
}


