import { useCallback, useEffect, useMemo, useState } from 'react'
import { apiClient } from '../../api/axios'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'

type ContributionInfo = {
  contribution_amount: string | null
  contribution_frequency: string | null
  contribution_start_date: string | null
  contribution_note: string | null
  has_subscription?: boolean
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Mijn contributie</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Onderstaande gegevens zijn door de organisatie vastgelegd en alleen leesbaar. Neem contact op met de administratie bij vragen of afwijkingen.
        </p>
      </div>

      {loading && (
        <Card className="p-6">
          <div className="text-center py-8 text-gray-600 dark:text-gray-400">Bezig met laden...</div>
        </Card>
      )}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-400 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {!loading && !error && (
        <>
          {info && (info.contribution_amount || info.has_subscription) ? (
            <Card className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                {info.has_subscription ? 'Actieve automatische incasso' : 'Huidige afspraak'}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm font-medium text-gray-600 dark:text-gray-400">Bedrag</dt>
                  <dd className="mt-1 text-lg text-gray-900 dark:text-white">{formatAmount(info.contribution_amount ?? null)}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-600 dark:text-gray-400">Frequentie</dt>
                  <dd className="mt-1 text-lg text-gray-900 dark:text-white">{info.contribution_frequency ?? 'Niet bekend'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-600 dark:text-gray-400">Startdatum</dt>
                  <dd className="mt-1 text-lg text-gray-900 dark:text-white">{info.contribution_start_date ?? 'Niet bekend'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-600 dark:text-gray-400">Opmerking</dt>
                  <dd className="mt-1 text-lg text-gray-900 dark:text-white">{info.contribution_note ?? 'Geen opmerking'}</dd>
                </div>
              </div>
            </Card>
          ) : null}

          <Card className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Vrije contributie</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">Je kunt hier een vrijwillige bijdrage doen met een bedrag naar keuze.</p>
            {manualError && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-400 px-4 py-3 rounded-lg mb-4">
                {manualError}
              </div>
            )}
            <form onSubmit={handleManualPay} className="space-y-4">
              <div>
                <label htmlFor="manual_amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Bedrag (€)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">€</span>
                  <input
                    id="manual_amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={manualAmount}
                    onChange={(e) => setManualAmount(e.target.value)}
                    className="w-full px-4 py-2 pl-8 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-aidatim-blue"
                    placeholder="0.00"
                    required
                    disabled={manualPaying}
                  />
                </div>
              </div>
              <div>
                <label htmlFor="manual_note" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Opmerking (optioneel)
                </label>
                <textarea
                  id="manual_note"
                  value={manualNote}
                  onChange={(e) => setManualNote(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-aidatim-blue"
                  rows={3}
                  maxLength={1000}
                  disabled={manualPaying}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="setup_recurring"
                  checked={setupRecurring}
                  onChange={(e) => setSetupRecurring(e.target.checked)}
                  disabled={manualPaying}
                  className="w-4 h-4 rounded border-gray-300 text-aidatim-blue focus:ring-aidatim-blue"
                />
                <label htmlFor="setup_recurring" className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                  Automatische incasso inschakelen (maandelijks afschrijven)
                </label>
              </div>
              {setupRecurring && (
                <div>
                  <label htmlFor="payment_method" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Betaalmethode voor automatische incasso
                  </label>
                  <select
                    id="payment_method"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as 'card' | 'sepa')}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-aidatim-blue"
                    disabled={manualPaying}
                  >
                    <option value="card">Creditcard / Debitcard</option>
                    <option value="sepa">SEPA Incasso (Bankrekening)</option>
                  </select>
                  {paymentMethod === 'sepa' && (
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                      Met SEPA incasso geeft u toestemming om maandelijks automatisch af te schrijven van uw bankrekening.
                    </p>
                  )}
                </div>
              )}
              <Button
                type="submit"
                disabled={manualPaying || !manualAmount || Number.parseFloat(manualAmount) <= 0}
                className="w-full"
              >
                {manualPaying ? 'Bezig...' : setupRecurring ? 'Automatische incasso instellen' : 'Betaal contributie'}
              </Button>
            </form>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Openstaande bijdragen</h2>
            {payError && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-400 px-4 py-3 rounded-lg mb-4">
                {payError}
              </div>
            )}
            {openError && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-400 px-4 py-3 rounded-lg mb-4">
                {openError}
              </div>
            )}
            {openLoading ? (
              <div className="text-center py-8 text-gray-600 dark:text-gray-400">Openstaande bijdragen worden geladen...</div>
            ) : !hasOpenContributions ? (
              <p className="text-gray-600 dark:text-gray-400">Je hebt momenteel geen openstaande bijdragen.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Periode</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Bedrag</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Status</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Actie</th>
                    </tr>
                  </thead>
                  <tbody>
                    {openContributions.map((record) => {
                      const isPayable = ['open', 'failed'].includes(record.status)
                      return (
                        <tr key={record.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                          <td className="py-4 px-4 text-gray-900 dark:text-white">{formatPeriod(record.period)}</td>
                          <td className="py-4 px-4 text-gray-900 dark:text-white font-medium">{formatOpenAmount(record.amount)}</td>
                          <td className="py-4 px-4">
                            <Badge
                              variant={
                                record.status === 'paid' ? 'success' :
                                record.status === 'open' || record.status === 'failed' ? 'error' :
                                record.status === 'processing' ? 'warning' :
                                'default'
                              }
                            >
                              {getStatusLabel(record.status)}
                            </Badge>
                          </td>
                          <td className="py-4 px-4 text-right">
                            {isPayable && (
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => handlePay(record.id)}
                                disabled={payingId === record.id}
                              >
                                {payingId === record.id ? 'Bezig...' : 'Betaal nu'}
                              </Button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Historiek</h2>
            {history.length === 0 ? (
              <p className="text-gray-600 dark:text-gray-400">Er zijn nog geen contributierecords beschikbaar.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Periode</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Bedrag</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Status</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Opmerking</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((record) => (
                      <tr key={record.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="py-4 px-4 text-gray-900 dark:text-white">{record.period ?? record.period_iso ?? '-'}</td>
                        <td className="py-4 px-4 text-gray-900 dark:text-white font-medium">{formatAmount(record.amount)}</td>
                        <td className="py-4 px-4">
                          <Badge
                            variant={
                              record.status === 'paid' ? 'success' :
                              record.status === 'open' || record.status === 'failed' ? 'error' :
                              record.status === 'processing' ? 'warning' :
                              'default'
                            }
                          >
                            {record.status ?? '-'}
                          </Badge>
                        </td>
                        <td className="py-4 px-4 text-gray-600 dark:text-gray-400">{record.note ?? '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  )
}

export default MemberContributionPage


