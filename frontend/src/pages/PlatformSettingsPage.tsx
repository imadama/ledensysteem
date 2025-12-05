import { useCallback, useEffect, useState } from 'react'
import { Save } from 'lucide-react'
import { apiClient } from '../api/axios'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'

type PaymentMethod = 'card' | 'sepa_debit' | 'ideal' | 'bancontact' | 'sofort'

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  card: 'Creditcard / Debitcard',
  sepa_debit: 'SEPA Incasso',
  ideal: 'iDEAL',
  bancontact: 'Bancontact',
  sofort: 'Sofort',
}

const PlatformSettingsPage: React.FC = () => {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>(['card', 'sepa_debit'])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const loadPaymentMethods = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data } = await apiClient.get<{ payment_methods: PaymentMethod[] }>(
        '/api/platform/settings/payment-methods'
      )
      setPaymentMethods(data.payment_methods)
    } catch (err: any) {
      console.error('Betaalmethodes laden mislukt', err)
      setError(err.response?.data?.message ?? 'Kon betaalmethodes niet laden.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadPaymentMethods()
  }, [loadPaymentMethods])

  const handlePaymentMethodToggle = (method: PaymentMethod) => {
    setPaymentMethods((prev) => {
      if (prev.includes(method)) {
        // Minimaal één betaalmethode moet geselecteerd zijn
        if (prev.length === 1) {
          return prev
        }
        return prev.filter((m) => m !== method)
      } else {
        return [...prev, method]
      }
    })
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setSuccessMessage(null)

    try {
      await apiClient.put('/api/platform/settings/payment-methods', {
        payment_methods: paymentMethods,
      })
      setSuccessMessage('Betaalmethodes succesvol bijgewerkt.')
    } catch (err: any) {
      console.error('Betaalmethodes opslaan mislukt', err)
      setError(err.response?.data?.message ?? 'Kon betaalmethodes niet opslaan.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Platform Instellingen</h1>
        </div>
        <Card className="p-6">
          <p className="text-gray-600 dark:text-gray-400">Bezig met laden...</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Platform Instellingen</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Beheer platform instellingen en configuratie</p>
      </div>

      {error && (
        <div className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 p-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 p-3 rounded-lg text-sm">
          {successMessage}
        </div>
      )}

      <Card className="p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Betaalmethodes</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Selecteer welke betaalmethodes beschikbaar zijn voor leden bij het betalen van contributies via Stripe.
        </p>

        <div className="space-y-3 mb-6">
          {(Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[]).map((method) => (
            <label
              key={method}
              className="flex items-center space-x-3 p-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={paymentMethods.includes(method)}
                onChange={() => handlePaymentMethodToggle(method)}
                disabled={paymentMethods.length === 1 && paymentMethods.includes(method)}
                className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
              />
              <span className="text-gray-900 dark:text-white">{PAYMENT_METHOD_LABELS[method]}</span>
              {paymentMethods.length === 1 && paymentMethods.includes(method) && (
                <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto">
                  (Minimaal één methode vereist)
                </span>
              )}
            </label>
          ))}
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Opslaan...' : 'Betaalmethodes opslaan'}
        </Button>
      </Card>
    </div>
  )
}

export default PlatformSettingsPage
