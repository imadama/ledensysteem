import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { apiClient } from '../api/axios'
import { useAuth } from '../context/AuthContext'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'

type Plan = {
  id: number
  name: string
  monthly_price: number
  currency: string
  description: string | null
}

type SubscriptionSummary = {
  plan?: {
    id: number
    name: string
  } | null
  status?: string | null
  current_period_end?: string | null
}

type OrganisationInfo = {
  billing_status?: string | null
  billing_note?: string | null
  subscription?: SubscriptionSummary | null
}

const statusLabels: Record<string, string> = {
  trial: 'Proefperiode',
  active: 'Actief',
  past_due: 'Achterstallig',
  canceled: 'Beëindigd',
  incomplete: 'Wordt verwerkt',
  incomplete_expired: 'Onvolledig verlopen',
  warning: 'Waarschuwing',
  restricted: 'Geblokkeerd',
}

const OrganisationSubscriptionPage: React.FC = () => {
  const [plans, setPlans] = useState<Plan[]>([])
  const [plansLoading, setPlansLoading] = useState(false)
  const [plansError, setPlansError] = useState<string | null>(null)
  const [subscription, setSubscription] = useState<SubscriptionSummary | null>(null)
  const [billingStatus, setBillingStatus] = useState<string | null>(null)
  const [billingNote, setBillingNote] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [isCheckout, setIsCheckout] = useState(false)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const { refreshMe } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const loadPlans = useCallback(async () => {
    setPlansLoading(true)
    setPlansError(null)
    try {
      const { data } = await apiClient.get<{ data: Plan[] }>('/api/plans')
      setPlans(data.data)
    } catch (err: any) {
      console.error('Plannen ophalen mislukt', err)
      setPlansError(err.response?.data?.message ?? 'Kon plannen niet laden.')
    } finally {
      setPlansLoading(false)
    }
  }, [])

  const loadOrganisationInfo = useCallback(async () => {
    try {
      const { data } = await apiClient.get<{ organisation: OrganisationInfo }>('/api/auth/me')
      setSubscription(data.organisation?.subscription ?? null)
      setBillingStatus(data.organisation?.billing_status ?? null)
      setBillingNote(data.organisation?.billing_note ?? null)
    } catch (err) {
      console.error('Organisatiegegevens ophalen mislukt', err)
    }
  }, [])

  useEffect(() => {
    void loadPlans()
    void loadOrganisationInfo()
  }, [loadOrganisationInfo, loadPlans])

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const sessionId = params.get('session_id')
    const cancelled = params.get('cancelled')

    if (!sessionId && !cancelled) {
      return
    }

    if (cancelled) {
      setStatusMessage('Betaling geannuleerd of onderbroken.')
    } else {
    setStatusMessage('Betaling wordt gecontroleerd...')
    }

    void (async () => {
      await loadOrganisationInfo()
      await refreshMe()
      setStatusMessage('Status bijgewerkt.')
      navigate(location.pathname, { replace: true })
    })()
  }, [location.pathname, location.search, loadOrganisationInfo, navigate, refreshMe])

  const statusLabel = useMemo(() => {
    const rawStatus = subscription?.status ?? 'onbekend'
    return statusLabels[rawStatus] ?? rawStatus
  }, [subscription?.status])

  const handleStartSubscription = async (planId: number) => {
    setCheckoutError(null)
    setIsCheckout(true)
    try {
      const origin = window.location.origin
      const successUrl = `${origin}/organisation/subscription?session_id={CHECKOUT_SESSION_ID}`
      const cancelUrl = `${origin}/organisation/subscription?session_id={CHECKOUT_SESSION_ID}&cancelled=1`

      const { data } = await apiClient.post<{ checkout_url: string }>('/api/organisation/subscription/start', {
        plan_id: planId,
        success_url: successUrl,
        cancel_url: cancelUrl,
      })

      window.location.href = data.checkout_url
    } catch (err: any) {
      console.error('Abonnement starten mislukt', err)
      const errorData = err.response?.data
      let errorMessage = errorData?.message ?? 'Kon de abonnementscheckout niet starten.'
      
      // Toon specifieke Stripe errors als die er zijn
      if (errorData?.errors?.stripe && Array.isArray(errorData.errors.stripe) && errorData.errors.stripe.length > 0) {
        errorMessage = `Stripe error: ${errorData.errors.stripe[0]}`
      } else if (errorData?.errors?.stripe) {
        errorMessage = `Stripe error: ${errorData.errors.stripe}`
      }
      
      setCheckoutError(errorMessage)
      setIsCheckout(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Abonnement</h2>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Beheer je abonnement en kies een pakket</p>
      </div>

      {statusMessage && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-400 px-4 py-3 rounded-lg">
          {statusMessage}
        </div>
      )}
      
      {checkoutError && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-400 px-4 py-3 rounded-lg">
          {checkoutError}
        </div>
      )}
      
      {billingStatus && billingStatus !== 'ok' && (
        <div className={`px-4 py-3 rounded-lg ${
          billingStatus === 'restricted' 
            ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-400'
            : 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-400'
        }`}>
          <strong className="font-semibold">Betalingsstatus: {billingStatus}</strong>
          <div className="mt-1">{billingNote ?? 'Controleer uw betaalgegevens in Stripe.'}</div>
        </div>
      )}

      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Huidig abonnement</h3>
        {subscription ? (
          <div className="space-y-4">
            <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-3">
              <dt className="text-sm font-medium text-gray-600 dark:text-gray-400">Pakket</dt>
              <dd className="text-gray-900 dark:text-white font-medium">{subscription.plan?.name ?? 'Onbekend'}</dd>
              
              <dt className="text-sm font-medium text-gray-600 dark:text-gray-400">Status</dt>
              <dd>
                <Badge 
                  variant={
                    subscription.status === 'active' ? 'success' :
                    subscription.status === 'past_due' || subscription.status === 'warning' ? 'warning' :
                    subscription.status === 'canceled' || subscription.status === 'restricted' ? 'error' :
                    'default'
                  }
                >
                  {statusLabel}
                </Badge>
              </dd>
              
              {subscription.current_period_end && (
                <>
                  <dt className="text-sm font-medium text-gray-600 dark:text-gray-400">Huidige periode tot</dt>
                  <dd className="text-gray-900 dark:text-white">
                    {new Date(subscription.current_period_end).toLocaleString('nl-NL', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </dd>
                </>
              )}
            </dl>
            
            {subscription.status === 'incomplete' && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-400 px-4 py-3 rounded-lg mt-4">
                <strong className="font-semibold block mb-1">Abonnement wordt verwerkt</strong>
                <div className="text-sm">Je betaling is ontvangen. Het abonnement wordt momenteel geactiveerd. Dit kan enkele minuten duren.</div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-gray-600 dark:text-gray-400">Er is nog geen abonnement actief.</p>
        )}
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Beschikbare plannen</h3>
        {plansLoading ? (
          <div className="text-center py-8 text-gray-600 dark:text-gray-400">Plannen worden geladen...</div>
        ) : plansError ? (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-400 px-4 py-3 rounded-lg">
            {plansError}
          </div>
        ) : plans.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">Er zijn momenteel geen plannen geconfigureerd.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <Card key={plan.id} className="p-6 border-2 border-gray-200 dark:border-gray-700 hover:border-indigo-500 dark:hover:border-indigo-500 transition-colors">
                <div className="space-y-4">
                  <div>
                    <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{plan.name}</h4>
                    <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
                      € {plan.monthly_price.toLocaleString('nl-NL', { minimumFractionDigits: 2 })}
                      <span className="text-lg font-normal text-gray-600 dark:text-gray-400"> p/m</span>
                    </p>
                  </div>
                  
                  {plan.description && (
                    <p className="text-gray-600 dark:text-gray-400 text-sm">{plan.description}</p>
                  )}
                  
                  <Button
                    onClick={() => handleStartSubscription(plan.id)}
                    disabled={isCheckout}
                    className="w-full"
                  >
                    {isCheckout ? 'Bezig...' : 'Kies dit pakket'}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

export default OrganisationSubscriptionPage
