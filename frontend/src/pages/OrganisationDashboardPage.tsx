import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Users, DollarSign, Clock, UserPlus, Upload } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { apiClient } from '../api/axios'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'

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

const monthNames = ['Jan', 'Feb', 'Mrt', 'Apr', 'Mei', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec']

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

const OrganisationDashboardPage: React.FC = () => {
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

      console.log('Matrix data received:', data)
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
      return <span className="text-gray-400">—</span>
    }

    switch (monthData.status) {
      case 'paid':
        return <span className="text-green-600 dark:text-green-400 font-bold">✓</span>
      case 'open':
        return <span className="text-red-600 dark:text-red-400 font-bold">✗</span>
      case 'processing':
        return <span className="text-yellow-600 dark:text-yellow-400">⏳</span>
      case 'failed':
        return <span className="text-gray-600 dark:text-gray-400">⚠</span>
      default:
        return <span className="text-gray-500 dark:text-gray-500">?</span>
    }
  }

  const getStatusColorClass = (monthData: MonthData) => {
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
        return 'bg-gray-100 dark:bg-gray-800'
      default:
        return 'bg-white dark:bg-gray-800'
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

  const totalMembers = matrixData?.members.length || 0
  const paidCount = matrixData?.members.reduce((sum, member) => {
    return sum + Object.values(member.months).filter(m => m?.status === 'paid').length
  }, 0) || 0
  const openCount = matrixData?.members.reduce((sum, member) => {
    return sum + Object.values(member.months).filter(m => m?.status === 'open').length
  }, 0) || 0

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Organisatie Dashboard</h2>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Beheer je organisatie en contributies</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Totaal Leden</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{totalMembers}</p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <Users className="text-green-600 dark:text-green-400" size={24} />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Betaalde Contributies</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{paidCount}</p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <DollarSign className="text-blue-600 dark:text-blue-400" size={24} />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Openstaande Contributies</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{openCount}</p>
            </div>
            <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
              <Clock className="text-yellow-600 dark:text-yellow-400" size={24} />
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Snelle Acties</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link to="/organisation/users">
            <Button variant="outline" className="w-full">
              <Users size={16} />
              Beheerders
            </Button>
          </Link>
          <Link to="/organisation/members">
            <Button variant="outline" className="w-full">
              <Users size={16} />
              Ledenoverzicht
            </Button>
          </Link>
          <Link to="/organisation/members/new">
            <Button variant="outline" className="w-full">
              <UserPlus size={16} />
              Nieuw Lid
            </Button>
          </Link>
          <Link to="/organisation/members/import">
            <Button variant="outline" className="w-full">
              <Upload size={16} />
              Bulk Upload
            </Button>
          </Link>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Contributiematrix</h3>
          <div className="flex items-center gap-2">
            <label htmlFor="year-select-matrix" className="text-sm text-gray-600 dark:text-gray-400">
              Jaar:
            </label>
            <select
              id="year-select-matrix"
              value={year}
              onChange={(event) => setYear(Number(event.target.value))}
              className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {yearOptions.map((optionYear) => (
                <option key={optionYear} value={optionYear}>
                  {optionYear}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-4 mb-4 flex-wrap text-sm">
          <div className="flex items-center gap-2">
            <span className="text-green-600 dark:text-green-400 font-bold">✓</span>
            <span className="text-gray-600 dark:text-gray-400">Betaald</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-red-600 dark:text-red-400 font-bold">✗</span>
            <span className="text-gray-600 dark:text-gray-400">Open</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-yellow-600 dark:text-yellow-400">⏳</span>
            <span className="text-gray-600 dark:text-gray-400">In behandeling</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-400">—</span>
            <span className="text-gray-600 dark:text-gray-400">Geen contributie</span>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-400 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-8 text-gray-600 dark:text-gray-400">Bezig met laden...</div>
        ) : matrixData && matrixData.members.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="sticky left-0 z-10 bg-gray-50 dark:bg-gray-800 text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400 min-w-[150px]">
                    Lid
                  </th>
                  {monthNames.map((monthName, index) => (
                    <th
                      key={index + 1}
                      className="text-center py-3 px-2 text-sm font-medium text-gray-600 dark:text-gray-400 min-w-[60px] max-w-[60px]"
                    >
                      {monthName}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrixData.members.map((member) => (
                  <tr key={member.member_id} className="border-b border-gray-100 dark:border-gray-800">
                    <td className="sticky left-0 z-5 bg-white dark:bg-gray-800 font-medium py-3 px-4">
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
                          className={`${getStatusColorClass(monthData)} text-center py-2 px-2 ${monthData ? 'cursor-help' : ''}`}
                          title={formatTooltip(monthData, month)}
                        >
                          {getStatusIcon(monthData)}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            Geen leden gevonden voor {year}.
          </div>
        )}
      </Card>
    </div>
  )
}

export default OrganisationDashboardPage

