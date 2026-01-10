import { useCallback, useEffect, useState } from 'react'
import { CreditCard, X, Edit, CheckCircle, AlertCircle } from 'lucide-react'
import { apiClient } from '../../api/axios'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'

type SepaSubscriptionData = {
  enabled: boolean
  iban: string | null
  mandate_stripe_id: string | null
  notes: string | null
  setup_at: string | null
  setup_by: {
    id: number
    name: string
  } | null
  subscription: {
    id: number
    amount: number
    currency: string
    status: string
    stripe_subscription_id: string | null
    current_period_start: string | null
    current_period_end: string | null
  } | null
}

type MemberSepaSubscriptionSectionProps = {
  memberId: number
  memberIban: string | null
}

const MemberSepaSubscriptionSection: React.FC<MemberSepaSubscriptionSectionProps> = ({
  memberId,
  memberIban,
}) => {
  const [data, setData] = useState<SepaSubscriptionData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isSettingUp, setIsSettingUp] = useState(false)
  const [isDisabling, setIsDisabling] = useState(false)
  const [isUpdatingAmount, setIsUpdatingAmount] = useState(false)
  const [showSetupForm, setShowSetupForm] = useState(false)
  const [showUpdateAmountForm, setShowUpdateAmountForm] = useState(false)

  const [formAmount, setFormAmount] = useState('')
  const [formIban, setFormIban] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formNotes, setFormNotes] = useState('')
  const [updateAmountValue, setUpdateAmountValue] = useState('')

  const loadSepaSubscription = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data: responseData } = await apiClient.get<SepaSubscriptionData>(
        `/api/organisation/members/${memberId}/sepa-subscription`
      )
      setData(responseData)
    } catch (err: any) {
      console.error('SEPA incasso ophalen mislukt', err)
      setError(err.response?.data?.message ?? 'Kon SEPA incasso informatie niet ophalen.')
    } finally {
      setLoading(false)
    }
  }, [memberId])

  useEffect(() => {
    void loadSepaSubscription()
  }, [loadSepaSubscription])

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSettingUp(true)
    setError(null)
    setSuccessMessage(null)

    try {
      await apiClient.post(`/api/organisation/members/${memberId}/sepa-subscription/setup`, {
        amount: Number.parseFloat(formAmount),
        iban: formIban || undefined,
        description: formDescription || undefined,
        notes: formNotes || undefined,
      })
      setSuccessMessage('Automatische SEPA incasso succesvol opgezet.')
      setShowSetupForm(false)
      setFormAmount('')
      setFormIban('')
      setFormDescription('')
      setFormNotes('')
      await loadSepaSubscription()
    } catch (err: any) {
      console.error('SEPA incasso opzetten mislukt', err)
      setError(err.response?.data?.message ?? 'Kon automatische incasso niet opzetten.')
    } finally {
      setIsSettingUp(false)
    }
  }

  const handleDisable = async () => {
    if (!confirm('Weet je zeker dat je de automatische incasso wilt uitschakelen?')) {
      return
    }

    setIsDisabling(true)
    setError(null)
    setSuccessMessage(null)

    try {
      await apiClient.post(`/api/organisation/members/${memberId}/sepa-subscription/disable`)
      setSuccessMessage('Automatische incasso is uitgeschakeld.')
      await loadSepaSubscription()
    } catch (err: any) {
      console.error('SEPA incasso uitschakelen mislukt', err)
      setError(err.response?.data?.message ?? 'Kon automatische incasso niet uitschakelen.')
    } finally {
      setIsDisabling(false)
    }
  }

  const handleUpdateAmount = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsUpdatingAmount(true)
    setError(null)
    setSuccessMessage(null)

    try {
      await apiClient.post(`/api/organisation/members/${memberId}/sepa-subscription/update-amount`, {
        amount: Number.parseFloat(updateAmountValue),
      })
      setSuccessMessage('Incasso bedrag is bijgewerkt.')
      setShowUpdateAmountForm(false)
      setUpdateAmountValue('')
      await loadSepaSubscription()
    } catch (err: any) {
      console.error('Incasso bedrag bijwerken mislukt', err)
      setError(err.response?.data?.message ?? 'Kon incasso bedrag niet bijwerken.')
    } finally {
      setIsUpdatingAmount(false)
    }
  }

  const formatDateTime = (value: string | null) => {
    if (!value) return null
    try {
      return new Date(value).toLocaleString('nl-NL', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return value
    }
  }

  const formatAmount = (amount: number) => {
    return `€ ${amount.toLocaleString('nl-NL', { minimumFractionDigits: 2 })}`
  }

  if (loading) {
    return (
      <Card className="p-6">
        <div className="text-center py-4 text-gray-600 dark:text-gray-400">Bezig met laden...</div>
      </Card>
    )
  }

  const hasActiveSubscription = data?.enabled && data?.subscription

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <CreditCard size={20} className="text-aidatim-blue dark:text-aidatim-blue" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Automatische SEPA Incasso</h3>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-400 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-400 px-4 py-3 rounded-lg mb-4">
          {successMessage}
        </div>
      )}

      {!hasActiveSubscription ? (
        <div className="space-y-4">
          {!showSetupForm ? (
            <>
              <p className="text-gray-600 dark:text-gray-400">
                Zet een automatische maandelijkse SEPA incasso op voor dit lid. De organisatie heeft al een
                collectieve machtiging om incasso's te verrichten.
              </p>
              <Button onClick={() => setShowSetupForm(true)} disabled={!memberIban && !data?.iban}>
                <CreditCard size={16} className="mr-2" />
                Automatische incasso opzetten
              </Button>
              {!memberIban && !data?.iban && (
                <p className="text-sm text-amber-600 dark:text-amber-400 flex items-center gap-2">
                  <AlertCircle size={16} />
                  Voeg eerst een IBAN toe aan het lid om een automatische incasso op te zetten.
                </p>
              )}
            </>
          ) : (
            <form onSubmit={handleSetup} className="space-y-4">
              <div>
                <label htmlFor="amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Maandelijks bedrag <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  id="amount"
                  step="0.01"
                  min="0.01"
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-aidatim-blue"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label htmlFor="iban" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  IBAN (optioneel)
                </label>
                <input
                  type="text"
                  id="iban"
                  value={formIban}
                  onChange={(e) => setFormIban(e.target.value.toUpperCase())}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-aidatim-blue"
                  placeholder={memberIban || 'IBAN'}
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Laat leeg om het IBAN van het lid te gebruiken ({memberIban || 'geen IBAN bekend'})
                </p>
              </div>

              <div>
                <label
                  htmlFor="description"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  Beschrijving (optioneel)
                </label>
                <input
                  type="text"
                  id="description"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  maxLength={500}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-aidatim-blue"
                  placeholder="Bijv. Maandelijkse contributie"
                />
              </div>

              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Interne notities (optioneel)
                </label>
                <textarea
                  id="notes"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  maxLength={1000}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-aidatim-blue"
                  placeholder="Interne notities..."
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={isSettingUp}>
                  {isSettingUp ? 'Bezig...' : 'Incasso opzetten'}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setShowSetupForm(false)
                    setFormAmount('')
                    setFormIban('')
                    setFormDescription('')
                    setFormNotes('')
                  }}
                  disabled={isSettingUp}
                >
                  <X size={16} />
                  Annuleren
                </Button>
              </div>
            </form>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle size={20} className="text-green-600 dark:text-green-400" />
              <span className="font-semibold text-green-900 dark:text-green-300">Automatische incasso actief</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Maandelijks bedrag</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {data.subscription ? formatAmount(data.subscription.amount) : '—'}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">IBAN</p>
              <p className="text-gray-900 dark:text-white">{data.iban || '—'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Status</p>
              <Badge
                variant={
                  data.subscription?.status === 'active'
                    ? 'success'
                    : data.subscription?.status === 'incomplete'
                    ? 'warning'
                    : 'default'
                }
              >
                {data.subscription?.status === 'active'
                  ? 'Actief'
                  : data.subscription?.status === 'incomplete'
                  ? 'In behandeling'
                  : data.subscription?.status || 'Onbekend'}
              </Badge>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Opgezet op</p>
              <p className="text-gray-900 dark:text-white">{formatDateTime(data.setup_at) || '—'}</p>
            </div>
            {data.subscription?.current_period_end && (
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Volgende incasso</p>
                <p className="text-gray-900 dark:text-white">
                  {formatDateTime(data.subscription.current_period_end) || '—'}
                </p>
              </div>
            )}
            {data.mandate_stripe_id && (
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Stripe Mandate ID</p>
                <p className="text-xs font-mono text-gray-600 dark:text-gray-400">{data.mandate_stripe_id}</p>
              </div>
            )}
          </div>

          {data.notes && (
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Notities</p>
              <p className="text-gray-900 dark:text-white">{data.notes}</p>
            </div>
          )}

          {!showUpdateAmountForm ? (
            <div className="flex gap-2 flex-wrap">
              <Button variant="secondary" onClick={() => setShowUpdateAmountForm(true)}>
                <Edit size={16} className="mr-2" />
                Bedrag wijzigen
              </Button>
              <Button variant="outline" onClick={handleDisable} disabled={isDisabling}>
                <X size={16} className="mr-2" />
                {isDisabling ? 'Bezig...' : 'Incasso uitschakelen'}
              </Button>
            </div>
          ) : (
            <form onSubmit={handleUpdateAmount} className="space-y-4 border-t border-gray-200 dark:border-gray-700 pt-4">
              <div>
                <label
                  htmlFor="update-amount"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  Nieuw maandelijks bedrag <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  id="update-amount"
                  step="0.01"
                  min="0.01"
                  value={updateAmountValue}
                  onChange={(e) => setUpdateAmountValue(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-aidatim-blue"
                  placeholder={data.subscription ? formatAmount(data.subscription.amount) : '0.00'}
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={isUpdatingAmount}>
                  {isUpdatingAmount ? 'Bezig...' : 'Bedrag bijwerken'}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setShowUpdateAmountForm(false)
                    setUpdateAmountValue('')
                  }}
                  disabled={isUpdatingAmount}
                >
                  <X size={16} />
                  Annuleren
                </Button>
              </div>
            </form>
          )}
        </div>
      )}
    </Card>
  )
}

export default MemberSepaSubscriptionSection
