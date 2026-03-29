import { useCallback, useEffect, useState } from 'react'
import { apiClient } from '../api/axios'
import { Card } from '../components/ui/Card'
import { AlertTriangle, CheckCircle, Clock, RefreshCw } from 'lucide-react'

type BatchSubscription = {
  member_id: number
  member_number: string | null
  name: string
  iban_masked: string | null
  amount: number
  currency: string
  subscription_status: string
  next_billing_date: string | null
}

type BatchResponse = {
  billing_cycle_day: number
  total_amount: number
  total_members: number
  subscriptions: BatchSubscription[]
}

type OrganisationProfile = {
  billing_cycle_day: number
  billing_cycle_time: string
}

const statusConfig: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
  active: {
    label: 'Actief',
    className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    icon: <CheckCircle size={12} className="inline mr-1" />,
  },
  trial: {
    label: 'Wacht op 1e incasso',
    className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    icon: <Clock size={12} className="inline mr-1" />,
  },
  incomplete: {
    label: 'Incomplete',
    className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    icon: <Clock size={12} className="inline mr-1" />,
  },
  past_due: {
    label: 'Achterstallig',
    className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    icon: <AlertTriangle size={12} className="inline mr-1" />,
  },
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  const date = new Date(dateStr)
  return date.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })
}

function formatAmount(amount: number, currency: string): string {
  return amount.toLocaleString('nl-NL', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
  })
}

const OrganisationContributionsBatchPage: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [batch, setBatch] = useState<BatchResponse | null>(null)
  const [profile, setProfile] = useState<OrganisationProfile | null>(null)

  const fetchBatch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [batchRes, profileRes] = await Promise.all([
        apiClient.get<BatchResponse>('/api/organisation/contributions/monthly-batch'),
        apiClient.get<{ data: OrganisationProfile }>('/api/organisation/profile'),
      ])
      setBatch(batchRes.data)
      setProfile(profileRes.data.data)
    } catch (err: any) {
      const message = err.response?.data?.message || err.message || 'Onbekende fout'
      setError(`Kon de batch niet laden: ${message}`)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchBatch()
  }, [fetchBatch])

  const cycleDay = profile?.billing_cycle_day ?? batch?.billing_cycle_day ?? 1
  const cycleTime = profile?.billing_cycle_time ?? '00:00'
  const nextBatchLabel = (() => {
    const now = new Date()
    const [h, m] = cycleTime.split(':').map(Number)
    const candidateThisMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), cycleDay, h, m, 0))
    const target = candidateThisMonth > now
      ? candidateThisMonth
      : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, cycleDay, h, m, 0))
    return target.toLocaleString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }) + ' UTC'
  })()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Maandelijkse incasso-batch</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Leden worden geïncasseerd op dag <strong>{cycleDay}</strong> van elke maand — volgende batch: <strong>{nextBatchLabel}</strong>
          </p>
        </div>
        <button
          onClick={fetchBatch}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Vernieuwen
        </button>
      </div>

      {error && (
        <div className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 p-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {batch && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card className="p-5">
            <p className="text-sm text-gray-500 dark:text-gray-400">Totaal te incasseren</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
              {formatAmount(batch.total_amount, 'EUR')}
            </p>
          </Card>
          <Card className="p-5">
            <p className="text-sm text-gray-500 dark:text-gray-400">Aantal leden in batch</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
              {batch.total_members}
            </p>
          </Card>
        </div>
      )}

      <Card className="p-6">
        {loading ? (
          <p className="text-gray-600 dark:text-gray-400">Bezig met laden...</p>
        ) : batch && batch.subscriptions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Lid
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    IBAN
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Bedrag
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Volgende incasso
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {batch.subscriptions.map((sub) => {
                  const status = statusConfig[sub.subscription_status] ?? {
                    label: sub.subscription_status,
                    className: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
                    icon: null,
                  }
                  return (
                    <tr key={sub.member_id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{sub.name}</div>
                        {sub.member_number && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">{sub.member_number}</div>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-mono text-gray-600 dark:text-gray-400">
                        {sub.iban_masked ?? '—'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-white">
                        {formatAmount(sub.amount, sub.currency)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {formatDate(sub.next_billing_date)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${status.className}`}>
                          {status.icon}
                          {status.label}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : batch ? (
          <p className="text-gray-600 dark:text-gray-400">
            Geen actieve SEPA-incasso's gevonden. Stel eerst een SEPA-incasso in voor uw leden.
          </p>
        ) : null}
      </Card>
    </div>
  )
}

export default OrganisationContributionsBatchPage
