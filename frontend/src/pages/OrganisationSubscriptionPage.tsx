import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { apiClient } from '../api/axios'
import { useAuth } from '../context/AuthContext'

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
  incomplete: 'Onvolledig',
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
      setCheckoutError(err.response?.data?.message ?? 'Kon de abonnementscheckout niet starten.')
      setIsCheckout(false)
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Abonnement</h1>
      </div>

      {statusMessage && <div className="alert alert--info">{statusMessage}</div>}
      {checkoutError && <div className="alert alert--error">{checkoutError}</div>}
      {billingStatus && billingStatus !== 'ok' && (
        <div className={`alert ${billingStatus === 'restricted' ? 'alert--error' : 'alert--warning'}`}>
          <strong>Betalingsstatus: {billingStatus}</strong>
          <div>{billingNote ?? 'Controleer uw betaalgegevens in Stripe.'}</div>
        </div>
      )}

      <div className="card" style={{ marginBottom: '2rem', maxWidth: '720px' }}>
        <h2>Huidig abonnement</h2>
        {subscription ? (
          <dl style={{ display: 'grid', gridTemplateColumns: 'max-content 1fr', rowGap: '0.75rem', columnGap: '1rem' }}>
            <><dt>Pakket</dt><dd>{subscription.plan?.name ?? 'Onbekend'}</dd></>
            <><dt>Status</dt><dd>{statusLabel}</dd></>
            {subscription.current_period_end && (
              <><dt>Huidige periode tot</dt><dd>{new Date(subscription.current_period_end).toLocaleString('nl-NL')}</dd></>
            )}
          </dl>
        ) : (
          <p>Er is nog geen abonnement actief.</p>
        )}
      </div>

      <div className="card" style={{ maxWidth: '900px' }}>
        <h2>Beschikbare plannen</h2>
        {plansLoading ? (
          <p>Plannen worden geladen...</p>
        ) : plansError ? (
          <div className="alert alert--error">{plansError}</div>
        ) : plans.length === 0 ? (
          <p>Er zijn momenteel geen plannen geconfigureerd.</p>
        ) : (
          <div style={{ display: 'grid', gap: '1.5rem' }}>
            {plans.map((plan) => (
              <div key={plan.id} className="card card--subtle" style={{ border: '1px solid var(--color-border)' }}>
                <h3>{plan.name}</h3>
                <p style={{ fontSize: '1.5rem', margin: '0.5rem 0' }}>
                  € {plan.monthly_price.toLocaleString('nl-NL', { minimumFractionDigits: 2 })} per maand
                </p>
                {plan.description && <p>{plan.description}</p>}
                <button
                  type="button"
                  className="button"
                  disabled={isCheckout}
                  onClick={() => handleStartSubscription(plan.id)}
                >
                  {isCheckout ? 'Bezig...' : 'Kies dit pakket'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default OrganisationSubscriptionPage
