import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { DollarSign, CheckCircle2, Calendar, CreditCard, User, AlertCircle } from 'lucide-react'
import { apiClient } from '../../api/axios'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { format } from 'date-fns'

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
  const [contributions, setContributions] = useState<ContributionRecord[]>([])
  const [openContributions, setOpenContributions] = useState<OpenContribution[]>([])
  const [activeSubscription, setActiveSubscription] = useState<{ amount: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadContributions = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [historyResponse, openResponse, subscriptionResponse] = await Promise.all([
        apiClient.get<{ data: ContributionRecord[] }>('/api/member/contribution-history'),
        apiClient.get<{ data: OpenContribution[] }>('/api/member/contribution-open'),
        apiClient.get<{ data: { amount: string } | null }>('/api/member/subscription').catch(() => ({ data: { data: null } })),
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
      
      // Set active subscription if available
      if (subscriptionResponse.data.data?.amount) {
        setActiveSubscription({ amount: Number(subscriptionResponse.data.data.amount) })
      }
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
        return <Badge variant="success">Betaald</Badge>
      case 'open':
        return <Badge variant="error">Open</Badge>
      case 'processing':
        return <Badge variant="warning">In behandeling</Badge>
      case 'failed':
        return <Badge variant="default">Mislukt</Badge>
      default:
        return <Badge variant="default">{status || '-'}</Badge>
    }
  }

  const getMonthlyDues = () => {
    // Use active subscription amount if available
    if (activeSubscription && activeSubscription.amount > 0) {
      return activeSubscription.amount
    }
    
    // Fallback: use member's contribution_amount from profile if available
    // Otherwise return 0 (don't show average of historical payments)
    return 0
  }

  const hasOpenContributions = openContributions.length > 0
  const monthlyDues = getMonthlyDues()
  const lastPayment = contributions.find(c => c.status === 'paid')
  const lastPaymentDate = lastPayment?.period_iso || lastPayment?.period

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Mijn Dashboard</h2>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Bekijk je contributie overzicht en betalingsgeschiedenis</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Maandelijkse Contributie</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                {monthlyDues > 0 ? `€${monthlyDues.toFixed(2)}` : '-'}
              </p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <DollarSign className="text-blue-600 dark:text-blue-400" size={24} />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Betalingsstatus</p>
              <p className={`text-lg font-semibold mt-2 ${hasOpenContributions ? 'text-yellow-600 dark:text-yellow-400' : 'text-green-600 dark:text-green-400'}`}>
                {hasOpenContributions ? 'Openstaand' : 'Bijgewerkt'}
              </p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
              {hasOpenContributions ? (
                <AlertCircle className="text-yellow-600 dark:text-yellow-400" size={24} />
              ) : (
                <CheckCircle2 className="text-green-600 dark:text-green-400" size={24} />
              )}
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Laatste Betaling</p>
              <p className="text-lg font-medium text-gray-900 dark:text-white mt-2">
                {lastPaymentDate ? format(new Date(lastPaymentDate), 'MMM dd, yyyy') : '-'}
              </p>
            </div>
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Calendar className="text-purple-600 dark:text-purple-400" size={24} />
            </div>
          </div>
        </Card>
      </div>

      {hasOpenContributions && (
        <Card className="p-6">
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-400 px-4 py-3 rounded-lg mb-4">
            Je hebt {openContributions.length} openstaande {openContributions.length === 1 ? 'contributie' : 'contributies'}.
          </div>
          <Link to="/portal/contribution">
            <Button>
              <CreditCard size={16} />
              Bekijk en betaal
            </Button>
          </Link>
        </Card>
      )}

      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Contributie Overzicht</h3>
          <Link to="/portal/contribution">
            <Button variant="outline" size="sm">
              Volledig overzicht
            </Button>
          </Link>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-400 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-8 text-gray-600 dark:text-gray-400">Bezig met laden...</div>
        ) : contributions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Periode</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Bedrag</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Status</th>
                </tr>
              </thead>
              <tbody>
                {contributions.map((record) => (
                  <tr key={record.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="py-4 px-4 text-gray-900 dark:text-white">
                      {formatPeriod(record.period, record.period_iso)}
                    </td>
                    <td className="py-4 px-4 text-gray-900 dark:text-white font-medium">
                      {formatAmount(record.amount)}
                    </td>
                    <td className="py-4 px-4">
                      {getStatusBadge(record.status)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            Geen contributies gevonden.
          </div>
        )}
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Snelle Acties</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link to="/portal/profile">
            <Button variant="outline" className="w-full">
              <User size={16} />
              Mijn Gegevens
            </Button>
          </Link>
          <Link to="/portal/contribution">
            <Button variant="outline" className="w-full">
              <DollarSign size={16} />
              Mijn Contributie
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  )
}

export default MemberDashboardPage


