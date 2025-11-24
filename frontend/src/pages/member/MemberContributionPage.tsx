import { useCallback, useEffect, useMemo, useState } from 'react'
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

type OpenContribution = {
  id: number
  period: string | null
  amount: number | string | null
  status: string
}

const MemberContributionPage: React.FC = () => {
  const [info, setInfo] = useState<ContributionInfo | null>(null)
  const [history, setHistory] = useState<ContributionRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [openContributions, setOpenContributions] = useState<OpenContribution[]>([])
  const [openLoading, setOpenLoading] = useState(false)
  const [openError, setOpenError] = useState<string | null>(null)
  const [payingId, setPayingId] = useState<number | null>(null)
  const [payError, setPayError] = useState<string | null>(null)
  const [manualAmount, setManualAmount] = useState<string>('')
  const [manualNote, setManualNote] = useState<string>('')
  const [setupRecurring, setSetupRecurring] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'sepa'>('card')
  const [manualPaying, setManualPaying] = useState(false)
  const [manualError, setManualError] = useState<string | null>(null)

  const loadAgreementAndHistory = useCallback(async () => {
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
  }, [])

  const loadOpenContributions = useCallback(async () => {
    setOpenLoading(true)
    setOpenError(null)
    try {
      const { data } = await apiClient.get<{ data: OpenContribution[] }>('/api/member/contribution-open')
      setOpenContributions(data.data)
    } catch (err: any) {
      console.error('Openstaande bijdragen ophalen mislukt', err)
      setOpenError(err.response?.data?.message ?? 'Kon openstaande bijdragen niet laden.')
    } finally {
      setOpenLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadAgreementAndHistory()
    void loadOpenContributions()
  }, [loadAgreementAndHistory, loadOpenContributions])

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

  const formatOpenAmount = (amount: number | string | null) => {
    if (amount === null || amount === '') {
      return '-'
    }

    const numeric = typeof amount === 'string' ? Number.parseFloat(amount) : amount
    if (Number.isNaN(numeric)) {
      return '-'
    }

    return `€ ${numeric.toFixed(2)}`
  }

  const formatPeriod = (period: string | null) => {
    if (!period) {
      return '-'
    }

    const date = new Date(period)
    if (Number.isNaN(date.getTime())) {
      return period
    }

    return date.toLocaleDateString('nl-NL', {
      year: 'numeric',
      month: 'long',
    })
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'open':
        return 'Open'
      case 'processing':
        return 'In behandeling'
      case 'paid':
        return 'Betaald'
      case 'failed':
        return 'Mislukt'
      case 'canceled':
        return 'Geannuleerd'
      default:
        return status
    }
  }

  const handlePay = async (contributionId: number) => {
    setPayError(null)
    setPayingId(contributionId)

    try {
      const origin = window.location.origin
      const successUrl = `${origin}/portal/contribution/success`
      const cancelUrl = `${origin}/portal/contribution/cancel`

      const { data } = await apiClient.post<{
        checkout_url: string
      }>('/api/member/contribution-pay', {
        contribution_id: contributionId,
        success_url: successUrl,
        cancel_url: cancelUrl,
      })

      window.location.href = data.checkout_url
    } catch (err: any) {
      console.error('Betaling starten mislukt', err)
      const message =
        err.response?.data?.message ?? 'Kon de betaalpagina niet openen. Probeer het later opnieuw.'
      setPayError(message)
      await loadOpenContributions()
    } finally {
      setPayingId(null)
    }
  }

  const handleManualPay = async (e: React.FormEvent) => {
    e.preventDefault()
    setManualError(null)

    const amount = Number.parseFloat(manualAmount)
    if (Number.isNaN(amount) || amount <= 0) {
      setManualError('Voer een geldig bedrag in (groter dan 0).')
      return
    }

    setManualPaying(true)

    try {
      const origin = window.location.origin
      const successUrl = `${origin}/portal/contribution/success`
      const cancelUrl = `${origin}/portal/contribution/cancel`

      const { data } = await apiClient.post<{
        checkout_url: string
      }>('/api/member/contribution-pay-manual', {
        amount: amount,
        note: manualNote || null,
        setup_recurring: setupRecurring,
        payment_method: setupRecurring ? paymentMethod : null,
        success_url: successUrl,
        cancel_url: cancelUrl,
      })

      window.location.href = data.checkout_url
    } catch (err: any) {
      console.error('Betaling starten mislukt', err)
      const message =
        err.response?.data?.message ?? 'Kon de betaalpagina niet openen. Probeer het later opnieuw.'
      setManualError(message)
    } finally {
      setManualPaying(false)
    }
  }

  const hasOpenContributions = useMemo(
    () => openContributions.some((item) => ['open', 'failed'].includes(item.status)),
    [openContributions],
  )

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

          <section style={{ marginBottom: '2rem' }}>
            <h2>Vrije contributie</h2>
            <p>Je kunt hier een vrijwillige bijdrage doen met een bedrag naar keuze.</p>
            {manualError && <div className="alert alert--error">{manualError}</div>}
            <form onSubmit={handleManualPay}>
              <div className="form-group">
                <label htmlFor="manual_amount">Bedrag (€)</label>
                <input
                  id="manual_amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={manualAmount}
                  onChange={(e) => setManualAmount(e.target.value)}
                  className="input"
                  placeholder="0.00"
                  required
                  disabled={manualPaying}
                />
              </div>
              <div className="form-group">
                <label htmlFor="manual_note">Opmerking (optioneel)</label>
                <textarea
                  id="manual_note"
                  value={manualNote}
                  onChange={(e) => setManualNote(e.target.value)}
                  className="input"
                  rows={3}
                  maxLength={1000}
                  disabled={manualPaying}
                />
              </div>
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={setupRecurring}
                    onChange={(e) => setSetupRecurring(e.target.checked)}
                    disabled={manualPaying}
                  />
                  <span>Automatische incasso inschakelen (maandelijks afschrijven)</span>
                </label>
              </div>
              {setupRecurring && (
                <div className="form-group">
                  <label htmlFor="payment_method">Betaalmethode voor automatische incasso</label>
                  <select
                    id="payment_method"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as 'card' | 'sepa')}
                    className="input"
                    disabled={manualPaying}
                  >
                    <option value="card">Creditcard / Debitcard</option>
                    <option value="sepa">SEPA Incasso (Bankrekening)</option>
                  </select>
                  {paymentMethod === 'sepa' && (
                    <p style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#666' }}>
                      Met SEPA incasso geeft u toestemming om maandelijks automatisch af te schrijven van uw bankrekening.
                    </p>
                  )}
                </div>
              )}
              <button
                type="submit"
                className="button"
                disabled={manualPaying || !manualAmount || Number.parseFloat(manualAmount) <= 0}
              >
                {manualPaying ? 'Bezig...' : setupRecurring ? 'Automatische incasso instellen' : 'Betaal contributie'}
              </button>
            </form>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2>Openstaande bijdragen</h2>
            {payError && <div className="alert alert--error">{payError}</div>}
            {openError && <div className="alert alert--error">{openError}</div>}
            {openLoading ? (
              <p>Openstaande bijdragen worden geladen...</p>
            ) : !hasOpenContributions ? (
              <p>Je hebt momenteel geen openstaande bijdragen.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Periode</th>
                      <th>Bedrag</th>
                      <th>Status</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {openContributions.map((record) => {
                      const isPayable = ['open', 'failed'].includes(record.status)
                      return (
                        <tr key={record.id}>
                          <td>{formatPeriod(record.period)}</td>
                          <td>{formatOpenAmount(record.amount)}</td>
                          <td>{getStatusLabel(record.status)}</td>
                          <td style={{ textAlign: 'right' }}>
                            <button
                              type="button"
                              className="button"
                              onClick={() => handlePay(record.id)}
                              disabled={!isPayable || payingId === record.id}
                            >
                              {payingId === record.id ? 'Bezig...' : isPayable ? 'Betaal nu' : '—'}
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
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


