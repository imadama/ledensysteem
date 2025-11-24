import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMemberAuth } from '../../context/MemberAuthContext'
import { apiClient } from '../../api/axios'

type ContributionRecord = {
  id: number
  period: string | null
  period_iso: string | null
  amount: string | null
  status: string | null
  note: string | null
  created_at: string | null
  updated_at: string | null
}

type OpenContribution = {
  id: number
  period: string | null
  amount: number | string | null
  status: string
}

const MemberDashboardPage: React.FC = () => {
  const { memberUser } = useMemberAuth()
  const [contributions, setContributions] = useState<ContributionRecord[]>([])
  const [openContributions, setOpenContributions] = useState<OpenContribution[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadContributions = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [historyResponse, openResponse] = await Promise.all([
        apiClient.get<{ data: ContributionRecord[] }>('/api/member/contribution-history'),
        apiClient.get<{ data: OpenContribution[] }>('/api/member/contribution-open'),
      ])

      // Combineer en sorteer: eerst openstaande, dan betaalde (nieuwste eerst)
      const allContributions: (ContributionRecord & { isOpen?: boolean })[] = [
        ...openResponse.data.data.map((oc) => ({
          id: oc.id,
          period: oc.period,
          period_iso: oc.period,
          amount: oc.amount?.toString() ?? null,
          status: oc.status,
          note: null,
          created_at: null,
          updated_at: null,
          isOpen: true,
        })),
        ...historyResponse.data.data,
      ]

      // Sorteer: eerst op status (open eerst), dan op periode (nieuwste eerst)
      allContributions.sort((a, b) => {
        if (a.status === 'open' && b.status !== 'open') return -1
        if (a.status !== 'open' && b.status === 'open') return 1

        const periodA = a.period_iso || a.period
        const periodB = b.period_iso || b.period

        if (!periodA && !periodB) return 0
        if (!periodA) return 1
        if (!periodB) return -1

        return new Date(periodB).getTime() - new Date(periodA).getTime()
      })

      setContributions(allContributions.slice(0, 10)) // Toon laatste 10
      setOpenContributions(openResponse.data.data)
    } catch (err: any) {
      console.error('Contributies ophalen mislukt', err)
      setError('Kon contributies niet laden.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadContributions()
  }, [loadContributions])

  const formatAmount = (amount: string | null) => {
    if (!amount) {
      return '-'
    }
    const parsed = Number(amount)
    if (Number.isNaN(parsed)) {
      return amount
    }
    return `€ ${parsed.toFixed(2)}`
  }

  const formatPeriod = (period: string | null, periodIso: string | null) => {
    const dateStr = periodIso || period
    if (!dateStr) {
      return '-'
    }

    const date = new Date(dateStr)
    if (Number.isNaN(date.getTime())) {
      return dateStr
    }

    return date.toLocaleDateString('nl-NL', {
      year: 'numeric',
      month: 'long',
    })
  }

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'paid':
        return <span className="badge badge--success">Betaald</span>
      case 'open':
        return <span className="badge badge--danger">Open</span>
      case 'processing':
        return <span className="badge" style={{ background: '#fef3c7', color: '#f59e0b' }}>In behandeling</span>
      case 'failed':
        return <span className="badge badge--secondary">Mislukt</span>
      default:
        return <span className="badge badge--secondary">{status || '-'}</span>
    }
  }

  const hasOpenContributions = openContributions.length > 0

  return (
    <div>
      <div className="card">
        <h1>Welkom, {memberUser?.member.first_name} {memberUser?.member.last_name}</h1>
        <p>
          Via het ledenportaal kun je je persoonsgegevens bekijken en je contributie opvolgen.
        </p>

        <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
          <Link to="/portal/profile" className="button">
            Mijn gegevens
          </Link>
          <Link to="/portal/contribution" className="button button--secondary">
            Mijn contributie
          </Link>
        </div>
      </div>

      {hasOpenContributions && (
        <div className="card" style={{ marginTop: '1.5rem' }}>
          <div className="alert alert--error" style={{ marginBottom: '1rem' }}>
            Je hebt {openContributions.length} openstaande {openContributions.length === 1 ? 'contributie' : 'contributies'}.
          </div>
          <Link to="/portal/contribution" className="button">
            Bekijk en betaal
          </Link>
        </div>
      )}

      <div className="card" style={{ marginTop: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2>Contributie overzicht</h2>
          <Link to="/portal/contribution" className="button button--secondary" style={{ fontSize: '0.875rem' }}>
            Volledig overzicht
          </Link>
        </div>

        {error && <div className="alert alert--error">{error}</div>}

        {loading ? (
          <p>Bezig met laden...</p>
        ) : contributions.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Periode</th>
                  <th>Bedrag</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {contributions.map((record) => (
                  <tr key={record.id}>
                    <td>{formatPeriod(record.period, record.period_iso)}</td>
                    <td>{formatAmount(record.amount)}</td>
                    <td>{getStatusBadge(record.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p>Geen contributies gevonden.</p>
        )}
      </div>
    </div>
  )
}

export default MemberDashboardPage


