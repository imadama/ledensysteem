import { useCallback, useEffect, useMemo, useState } from 'react'
import { apiClient } from '../api/axios'
import { Card } from '../components/ui/Card'
import { Check, X, Clock, AlertTriangle, Minus } from 'lucide-react'

type MonthData = {
  status: string
  amount: number | null
  paid_at: string | null
  contribution_id: number
} | null

type MemberData = {
  member_id: number
  member_number: string | null
  name: string
  months: Record<string, MonthData>
}

type MatrixResponse = {
  year: number
  members: MemberData[]
}

const monthNames = [
  'Jan',
  'Feb',
  'Mrt',
  'Apr',
  'Mei',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Okt',
  'Nov',
  'Dec',
]

const monthNamesFull = [
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

const OrganisationContributionsMatrixPage: React.FC = () => {
  const [year, setYear] = useState<number>(currentYear)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [matrixData, setMatrixData] = useState<MatrixResponse | null>(null)

  const yearOptions = useMemo(() => {
    return Array.from({ length: 6 }, (_, index) => currentYear - index)
  }, [])

  const fetchMatrix = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const { data } = await apiClient.get<MatrixResponse>('/api/organisation/contributions/matrix', {
        params: { year },
      })

      setMatrixData(data)
    } catch (err: any) {
      console.error('Matrix ophalen mislukt', err)
      setError('Kon contributiematrix niet laden. Probeer het later opnieuw.')
    } finally {
      setLoading(false)
    }
  }, [year])

  useEffect(() => {
    void fetchMatrix()
  }, [fetchMatrix])

  const getStatusIcon = (monthData: MonthData) => {
    if (!monthData) {
      return <Minus size={16} className="text-gray-400" />
    }

    switch (monthData.status) {
      case 'paid':
        return <Check size={16} className="text-green-600 dark:text-green-400 font-bold" />
      case 'open':
        return <X size={16} className="text-red-600 dark:text-red-400 font-bold" />
      case 'processing':
        return <Clock size={16} className="text-yellow-600 dark:text-yellow-400" />
      case 'failed':
        return <AlertTriangle size={16} className="text-gray-500 dark:text-gray-400" />
      default:
        return <span className="text-gray-500 dark:text-gray-400">?</span>
    }
  }

  const getStatusColor = (monthData: MonthData) => {
    if (!monthData) {
      return 'bg-gray-50 dark:bg-gray-800/50'
    }

    switch (monthData.status) {
      case 'paid':
        return 'bg-green-50 dark:bg-green-900/20'
      case 'open':
        return 'bg-red-50 dark:bg-red-900/20'
      case 'processing':
        return 'bg-yellow-50 dark:bg-yellow-900/20'
      case 'failed':
        return 'bg-gray-100 dark:bg-gray-700'
      default:
        return 'bg-white dark:bg-gray-900'
    }
  }

  const formatTooltip = (monthData: MonthData, month: number) => {
    if (!monthData) {
      return `${monthNamesFull[month - 1]} ${year}: Geen contributie`
    }

    const lines = [
      `${monthNamesFull[month - 1]} ${year}`,
      `Status: ${monthData.status === 'paid' ? 'Betaald' : monthData.status === 'open' ? 'Open' : monthData.status}`,
    ]

    if (monthData.amount !== null) {
      lines.push(`Bedrag: € ${monthData.amount.toFixed(2)}`)
    }

    if (monthData.paid_at) {
      const date = new Date(monthData.paid_at)
      lines.push(`Betaald op: ${date.toLocaleDateString('nl-NL')}`)
    }

    return lines.join('\n')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Contributiematrix</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Overzicht van betalingen per lid per maand</p>
      </div>

      <Card className="p-6 max-w-3xl">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Filters</h2>
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="year-select-matrix">
              Jaar
            </label>
            <select
              id="year-select-matrix"
              className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-aidatim-blue focus:border-aidatim-blue sm:text-sm bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100"
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
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex flex-wrap gap-4 mb-4">
          <div className="flex items-center gap-2">
            <Check size={16} className="text-green-600 dark:text-green-400 font-bold" />
            <span className="text-sm text-gray-700 dark:text-gray-300">Betaald</span>
          </div>
          <div className="flex items-center gap-2">
            <X size={16} className="text-red-600 dark:text-red-400 font-bold" />
            <span className="text-sm text-gray-700 dark:text-gray-300">Open</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-yellow-600 dark:text-yellow-400" />
            <span className="text-sm text-gray-700 dark:text-gray-300">In behandeling</span>
          </div>
          <div className="flex items-center gap-2">
            <Minus size={16} className="text-gray-400" />
            <span className="text-sm text-gray-700 dark:text-gray-300">Geen contributie</span>
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
        ) : matrixData && matrixData.members.length > 0 ? (
          <div className="overflow-x-auto w-full">
            <table className="min-w-[800px] table-fixed">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800">
                  <th style={{ position: 'sticky', left: 0, zIndex: 10 }} className="bg-gray-50 dark:bg-gray-800 min-w-[150px] px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Lid
                  </th>
                  {monthNames.map((monthName, index) => (
                    <th
                      key={index + 1}
                      className="text-center min-w-[60px] max-w-[60px] px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                    >
                      {monthName}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {matrixData.members.map((member) => (
                  <tr key={member.member_id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td style={{ position: 'sticky', left: 0, zIndex: 5 }} className="bg-white dark:bg-gray-900 font-medium px-4 py-3">
                      <div className="text-sm">
                        {member.member_number && (
                          <div className="text-gray-500 dark:text-gray-400 text-xs">{member.member_number}</div>
                        )}
                        <div className="text-gray-900 dark:text-white">{member.name}</div>
                      </div>
                    </td>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((month) => {
                      const monthData = member.months[month.toString()]
                      return (
                        <td
                          key={month}
                          className={`${getStatusColor(monthData)} text-center cursor-${monthData ? 'help' : 'default'} p-2`}
                          title={formatTooltip(monthData, month)}
                        >
                          <div className="flex items-center justify-center">
                            {getStatusIcon(monthData)}
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-600 dark:text-gray-400">Geen leden gevonden voor {year}.</p>
        )}
      </Card>
    </div>
  )
}

export default OrganisationContributionsMatrixPage

