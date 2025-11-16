import { useCallback, useEffect, useMemo, useState } from 'react'
import { apiClient } from '../api/axios'

type MonthlySummary = {
  month: number
  total_received: number
  paid_members: number
  members_with_open: number
}

type SummaryResponse = {
  year: number
  months: MonthlySummary[]
}

type SingleMonthResponse = {
  year: number
  month: number
  total_received: number
  paid_members: number
  members_with_open: number
}

const monthNames = [
  'Januari',
  'Februari',
  'Maart',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Augustus',
  'September',
  'Oktober',
  'November',
  'December',
]

const currentYear = new Date().getFullYear()

const OrganisationContributionsOverviewPage: React.FC = () => {
  const [year, setYear] = useState<number>(currentYear)
  const [month, setMonth] = useState<number | ''>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState<SummaryResponse | null>(null)
  const [singleMonthSummary, setSingleMonthSummary] = useState<SingleMonthResponse | null>(null)

  const yearOptions = useMemo(() => {
    return Array.from({ length: 6 }, (_, index) => currentYear - index)
  }, [])

  const fetchSummary = useCallback(async () => {
    setLoading(true)
    setError(null)
    setSummary(null)
    setSingleMonthSummary(null)

    try {
      const params: Record<string, string | number> = { year }
      if (month !== '') {
        params.month = month
      }

      const { data } = await apiClient.get<SummaryResponse | SingleMonthResponse>('/api/organisation/contributions/summary', {
        params,
      })

      if ('months' in data) {
        setSummary(data)
      } else {
        setSingleMonthSummary(data)
      }
    } catch (err) {
      console.error(err)
      setError('Kon de bijdrageoverzichten niet laden. Probeer het later opnieuw.')
    } finally {
      setLoading(false)
    }
  }, [month, year])

  useEffect(() => {
    void fetchSummary()
  }, [fetchSummary])

  const renderMonthRow = (item: MonthlySummary) => {
    return (
      <tr key={`${summary?.year}-${item.month}`}>
        <td>{monthNames[item.month - 1]}</td>
        <td>€ {item.total_received.toLocaleString('nl-NL', { minimumFractionDigits: 2 })}</td>
        <td>{item.paid_members}</td>
        <td>{item.members_with_open}</td>
      </tr>
    )
  }

  return (
    <div>
      <div className="page-header">
        <h1>Contributies</h1>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem', maxWidth: '720px' }}>
        <h2>Filters</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <label className="form-label" htmlFor="year-select">
              Jaar
            </label>
            <select
              id="year-select"
              className="form-input"
              value={year}
              onChange={(event) => setYear(Number(event.target.value))}
            >
              {yearOptions.map((optionYear) => (
                <option key={optionYear} value={optionYear}>
                  {optionYear}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label" htmlFor="month-select">
              Maand
            </label>
            <select
              id="month-select"
              className="form-input"
              value={month}
              onChange={(event) => {
                const value = event.target.value
                setMonth(value === '' ? '' : Number(value))
              }}
            >
              <option value="">Hele jaar</option>
              {monthNames.map((name, index) => (
                <option key={name} value={index + 1}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {error && <div className="alert alert--error">{error}</div>}

      <div className="card">
        {loading ? (
          <p>Bezig met laden...</p>
        ) : month === '' ? (
          summary && summary.months.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Maand</th>
                    <th>Totaal ontvangen</th>
                    <th>Leden met betaling</th>
                    <th>Leden met openstaand</th>
                  </tr>
                </thead>
                <tbody>{summary.months.map(renderMonthRow)}</tbody>
              </table>
            </div>
          ) : (
            <p>Geen contributies gevonden voor {year}.</p>
          )
        ) : singleMonthSummary ? (
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            <div>
              <strong>Maand</strong>
              <div>{monthNames[singleMonthSummary.month - 1]} {singleMonthSummary.year}</div>
            </div>
            <div>
              <strong>Totaal ontvangen</strong>
              <div>€ {singleMonthSummary.total_received.toLocaleString('nl-NL', { minimumFractionDigits: 2 })}</div>
            </div>
            <div>
              <strong>Leden met betaling</strong>
              <div>{singleMonthSummary.paid_members}</div>
            </div>
            <div>
              <strong>Leden met openstaand</strong>
              <div>{singleMonthSummary.members_with_open}</div>
            </div>
          </div>
        ) : (
          <p>Geen gegevens gevonden voor deze maand.</p>
        )}
      </div>
    </div>
  )
}

export default OrganisationContributionsOverviewPage
