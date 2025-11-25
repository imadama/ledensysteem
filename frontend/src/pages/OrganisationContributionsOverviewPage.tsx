import { useCallback, useEffect, useMemo, useState } from 'react'
import { apiClient } from '../api/axios'
import { Card } from '../components/ui/Card'

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
      <tr key={`${summary?.year}-${item.month}`} className="hover:bg-gray-50 dark:hover:bg-gray-800">
        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{monthNames[item.month - 1]}</td>
        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">€ {item.total_received.toLocaleString('nl-NL', { minimumFractionDigits: 2 })}</td>
        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">{item.paid_members}</td>
        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">{item.members_with_open}</td>
      </tr>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Contributies</h1>
      </div>

      <Card className="p-6 max-w-3xl">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Filters</h2>
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="year-select">
              Jaar
            </label>
            <select
              id="year-select"
              className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100"
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

          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="month-select">
              Maand
            </label>
            <select
              id="month-select"
              className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100"
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
      </Card>

      {error && (
        <div className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 p-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <Card className="p-6">
        {loading ? (
          <p className="text-gray-600 dark:text-gray-400">Bezig met laden...</p>
        ) : month === '' ? (
          summary && summary.months.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Maand</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Totaal ontvangen</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Leden met betaling</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Leden met openstaand</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                  {summary.months.map(renderMonthRow)}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-600 dark:text-gray-400">Geen contributies gevonden voor {year}.</p>
          )
        ) : singleMonthSummary ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Maand</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">{monthNames[singleMonthSummary.month - 1]} {singleMonthSummary.year}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Totaal ontvangen</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">€ {singleMonthSummary.total_received.toLocaleString('nl-NL', { minimumFractionDigits: 2 })}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Leden met betaling</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">{singleMonthSummary.paid_members}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Leden met openstaand</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">{singleMonthSummary.members_with_open}</p>
            </div>
          </div>
        ) : (
          <p className="text-gray-600 dark:text-gray-400">Geen gegevens gevonden voor deze maand.</p>
        )}
      </Card>
    </div>
  )
}

export default OrganisationContributionsOverviewPage
