import { useCallback, useEffect, useMemo, useState } from 'react'
import { apiClient } from '../api/axios'

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
      return <span style={{ color: '#94a3b8' }}>—</span>
    }

    switch (monthData.status) {
      case 'paid':
        return <span style={{ color: '#16a34a', fontWeight: 'bold' }}>✓</span>
      case 'open':
        return <span style={{ color: '#dc2626', fontWeight: 'bold' }}>✗</span>
      case 'processing':
        return <span style={{ color: '#f59e0b' }}>⏳</span>
      case 'failed':
        return <span style={{ color: '#6b7280' }}>⚠</span>
      default:
        return <span style={{ color: '#64748b' }}>?</span>
    }
  }

  const getStatusColor = (monthData: MonthData) => {
    if (!monthData) {
      return { backgroundColor: '#f8fafc' }
    }

    switch (monthData.status) {
      case 'paid':
        return { backgroundColor: '#dcfce7' }
      case 'open':
        return { backgroundColor: '#fee2e2' }
      case 'processing':
        return { backgroundColor: '#fef3c7' }
      case 'failed':
        return { backgroundColor: '#f3f4f6' }
      default:
        return { backgroundColor: '#ffffff' }
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
    <div>
      <div className="page-header">
        <h1>Contributiematrix</h1>
        <p>Overzicht van betalingen per lid per maand</p>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem', maxWidth: '720px' }}>
        <h2>Filters</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-end' }}>
          <div>
            <label className="form-label" htmlFor="year-select-matrix">
              Jaar
            </label>
            <select
              id="year-select-matrix"
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
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ color: '#16a34a', fontWeight: 'bold' }}>✓</span>
            <span>Betaald</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ color: '#dc2626', fontWeight: 'bold' }}>✗</span>
            <span>Open</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ color: '#f59e0b' }}>⏳</span>
            <span>In behandeling</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ color: '#94a3b8' }}>—</span>
            <span>Geen contributie</span>
          </div>
        </div>
      </div>

      {error && <div className="alert alert--error">{error}</div>}

      <div className="card">
        {loading ? (
          <p>Bezig met laden...</p>
        ) : matrixData && matrixData.members.length > 0 ? (
          <div style={{ overflowX: 'auto', width: '100%' }}>
            <table
              className="table"
              style={{
                minWidth: '800px',
                tableLayout: 'fixed',
              }}
            >
              <thead>
                <tr>
                  <th style={{ position: 'sticky', left: 0, zIndex: 10, backgroundColor: '#eff3fb', minWidth: '150px' }}>
                    Lid
                  </th>
                  {monthNames.map((monthName, index) => (
                    <th
                      key={index + 1}
                      style={{
                        textAlign: 'center',
                        minWidth: '60px',
                        maxWidth: '60px',
                      }}
                    >
                      {monthName}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrixData.members.map((member) => (
                  <tr key={member.member_id}>
                    <td
                      style={{
                        position: 'sticky',
                        left: 0,
                        zIndex: 5,
                        backgroundColor: '#ffffff',
                        fontWeight: 500,
                      }}
                    >
                      <div style={{ fontSize: '0.875rem' }}>
                        {member.member_number && (
                          <div style={{ color: '#64748b', fontSize: '0.75rem' }}>{member.member_number}</div>
                        )}
                        <div>{member.name}</div>
                      </div>
                    </td>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((month) => {
                      const monthData = member.months[month.toString()]
                      return (
                        <td
                          key={month}
                          style={{
                            ...getStatusColor(monthData),
                            textAlign: 'center',
                            cursor: monthData ? 'help' : 'default',
                            padding: '0.5rem',
                          }}
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
          <p>Geen leden gevonden voor {year}.</p>
        )}
      </div>
    </div>
  )
}

export default OrganisationContributionsMatrixPage

