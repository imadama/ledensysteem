<?php

namespace App\Imports;

use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\ToCollection;
use Maatwebsite\Excel\Concerns\WithHeadingRow;
use Maatwebsite\Excel\Concerns\WithLimit;

class MemberRowsImport implements ToCollection, WithHeadingRow, WithLimit
{
    /**
     * @var Collection<int, array<string, mixed>>
     */
    private Collection $rows;

    /**
     * Hard cap on the number of data rows the reader will materialise. Bounds
     * memory/CPU so a highly compressible (ZIP-bomb) XLSX cannot exhaust the
     * process. The caller passes cap+1 so it can detect and reject overflow.
     */
    public function __construct(private readonly int $rowLimit = 2001)
    {
        $this->rows = collect();
    }

    public function collection(Collection $rows): void
    {
        $this->rows = $rows;
    }

    public function limit(): int
    {
        return $this->rowLimit;
    }

    /**
     * @return Collection<int, array<string, mixed>>
     */
    public function getRows(): Collection
    {
        return $this->rows;
    }
}
