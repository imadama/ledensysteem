import { useEffect, useState } from 'react'
import { apiClient } from '../../api/axios'

type ContributionInfo = {
  contribution_amount: string | null
  contribution_frequency: string | null
  contribution_start_date: string | null
  contribution_note: string | null
}

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

const MemberContributionPage: React.FC = () => {
  const [info, setInfo] = useState<ContributionInfo | null>(null)
  const [history, setHistory] = useState<ContributionRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      setError(null)
      try {
        const [infoResponse, historyResponse] = await Promise.all([
          apiClient.get<{ data: ContributionInfo }>('/api/member/contribution'),
          apiClient.get<{ data: ContributionRecord[] }>('/api/member/contribution-history'),
        ])

        setInfo(infoResponse.data.data)
        setHistory(historyResponse.data.data)
      } catch (err: any) {
        console.error('Contributie ophalen mislukt', err)
        setError(err.response?.data?.message ?? 'Kon contributiegegevens niet laden.')
      } finally {
        setLoading(false)
      }
    }

    void loadData()
  }, [])

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

  return (
    <div className="card">
      <h1>Mijn contributie</h1>

      <p>
        Onderstaande gegevens zijn door de organisatie vastgelegd en alleen leesbaar. Neem contact op met de administratie bij vragen of afwijkingen.
      </p>

      {loading && <div>Bezig met laden...</div>}
      {error && <div className="alert alert--error">{error}</div>}

      {!loading && !error && (
        <>
          <section style={{ marginBottom: '2rem' }}>
            <h2>Huidige afspraak</h2>
            <div className="info-grid">
              <div>
                <strong>Bedrag</strong>
                <div>{formatAmount(info?.contribution_amount ?? null)}</div>
              </div>
              <div>
                <strong>Frequentie</strong>
                <div>{info?.contribution_frequency ?? 'Niet bekend'}</div>
              </div>
              <div>
                <strong>Startdatum</strong>
                <div>{info?.contribution_start_date ?? 'Niet bekend'}</div>
              </div>
              <div>
                <strong>Opmerking</strong>
                <div>{info?.contribution_note ?? 'Geen opmerking'}</div>
              </div>
            </div>
          </section>

          <section>
            <h2>Historiek</h2>
            {history.length === 0 ? (
              <p>Er zijn nog geen contributierecords beschikbaar.</p>
            ) : (
              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Periode</th>
                      <th>Bedrag</th>
                      <th>Status</th>
                      <th>Opmerking</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((record) => (
                      <tr key={record.id}>
                        <td>{record.period ?? record.period_iso ?? '-'}</td>
                        <td>{formatAmount(record.amount)}</td>
                        <td>{record.status ?? '-'}</td>
                        <td>{record.note ?? '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}

export default MemberContributionPage


