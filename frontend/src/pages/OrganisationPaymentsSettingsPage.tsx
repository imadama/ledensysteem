import { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { apiClient } from '../api/axios'

type ConnectionStatus = 'none' | 'pending' | 'active' | 'blocked'

type ConnectionResponse = {
  status: ConnectionStatus
  stripe_account_id: string | null
  activated_at?: string | null
}

const OrganisationPaymentsSettingsPage: React.FC = () => {
  const [connection, setConnection] = useState<ConnectionResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isRedirecting, setIsRedirecting] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  const fetchConnection = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const { data } = await apiClient.get<ConnectionResponse>('/api/organisation/payments/connection')
      setConnection(data)
    } catch (err) {
      console.error(err)
      setError('Kon de betaalstatus niet ophalen. Probeer het later opnieuw.')
    } finally {
      setLoading(false)
    }
  }, [])

  const refreshConnection = useCallback(async () => {
    setIsRefreshing(true)
    setError(null)

    try {
      const { data } = await apiClient.post<ConnectionResponse>('/api/organisation/payments/connection/refresh')
      setConnection(data)
      setSuccessMessage('Status bijgewerkt.')
    } catch (err) {
      console.error(err)
      setError('Kon de status niet vernieuwen. Probeer het later opnieuw.')
    } finally {
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void fetchConnection()
  }, [fetchConnection])

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const hasSession = params.has('session_id') || params.get('onboarding') === 'return'

    if (!hasSession) {
      return
    }

    void (async () => {
      await refreshConnection()
      navigate(location.pathname, { replace: true })
    })()
  }, [location.pathname, location.search, navigate, refreshConnection])

  const handleCreateLink = async () => {
    setIsRedirecting(true)
    setError(null)
    setSuccessMessage(null)

    try {
      const { data } = await apiClient.post<{ url: string }>('/api/organisation/payments/connection/onboarding-link')
      window.location.href = data.url
    } catch (err: any) {
      console.error(err)
      const message =
        err?.response?.data?.message ?? 'Kon geen onboardinglink aanmaken. Controleer later opnieuw.'
      setError(message)
      setIsRedirecting(false)
    }
  }

  const getStatusBadge = (status: ConnectionStatus) => {
    switch (status) {
      case 'active':
        return <span className="badge badge--success">Actief</span>
      case 'pending':
        return <span className="badge badge--warning">In behandeling</span>
      case 'blocked':
        return <span className="badge badge--danger">Geblokkeerd</span>
      default:
        return <span className="badge badge--secondary">Niet gekoppeld</span>
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Betalingen instellingen</h1>
      </div>

      {error && <div className="alert alert--error">{error}</div>}
      {successMessage && <div className="alert alert--success">{successMessage}</div>}

      <div className="card" style={{ maxWidth: '800px' }}>
        <h2>Stripe betaalrekening koppelen</h2>
        <p style={{ marginBottom: '1.5rem' }}>
          Koppel je Stripe-account om betalingen van leden te ontvangen. Betalingen gaan direct naar je Stripe-account
          en worden automatisch uitbetaald naar je bankrekening.
        </p>

        {loading ? (
          <p>Bezig met laden...</p>
        ) : (
          <div style={{ display: 'grid', gap: '1.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'max-content 1fr', gap: '1rem', alignItems: 'center' }}>
              <strong>Status:</strong>
              <div>{getStatusBadge(connection?.status ?? 'none')}</div>
            </div>

            {connection?.stripe_account_id && (
              <div style={{ display: 'grid', gridTemplateColumns: 'max-content 1fr', gap: '1rem', alignItems: 'center' }}>
                <strong>Stripe account ID:</strong>
                <div style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}>{connection.stripe_account_id}</div>
              </div>
            )}

            {connection?.activated_at && (
              <div style={{ display: 'grid', gridTemplateColumns: 'max-content 1fr', gap: '1rem', alignItems: 'center' }}>
                <strong>Geactiveerd op:</strong>
                <div>{new Date(connection.activated_at).toLocaleString('nl-NL')}</div>
              </div>
            )}

            {connection?.status === 'none' && (
              <div className="alert alert--info">
                <strong>Nog niet gekoppeld</strong>
                <p style={{ margin: '0.5rem 0 0 0' }}>
                  Klik op "Stripe-account koppelen" om te beginnen. Je wordt doorgestuurd naar Stripe waar je:
                </p>
                <ul style={{ margin: '0.5rem 0 0 1.5rem' }}>
                  <li>Inlogt met je Stripe-account (of maakt er een aan)</li>
                  <li>Je bedrijfsgegevens invult</li>
                  <li>Je bankrekening opgeeft voor uitbetalingen</li>
                </ul>
              </div>
            )}

            {connection?.status === 'pending' && (
              <div className="alert alert--warning">
                <strong>Koppeling in behandeling</strong>
                <p style={{ margin: '0.5rem 0 0 0' }}>
                  Je Stripe-account is aangemaakt maar nog niet volledig geactiveerd. Stripe controleert je gegevens.
                  Dit kan enkele minuten tot uren duren.
                </p>
              </div>
            )}

            {connection?.status === 'active' && (
              <div className="alert alert--success">
                <strong>Betaalrekening actief</strong>
                <p style={{ margin: '0.5rem 0 0 0' }}>
                  Je Stripe-account is gekoppeld en actief. Leden kunnen nu betalingen doen en het geld wordt
                  automatisch uitbetaald naar je bankrekening.
                </p>
              </div>
            )}

            {connection?.status === 'blocked' && (
              <div className="alert alert--error">
                <strong>Account geblokkeerd</strong>
                <p style={{ margin: '0.5rem 0 0 0' }}>
                  Er is een probleem met je Stripe-account. Neem contact op met Stripe support of probeer opnieuw te
                  koppelen.
                </p>
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
              {connection?.status !== 'active' && (
                <button
                  type="button"
                  className="button"
                  onClick={handleCreateLink}
                  disabled={isRedirecting}
                >
                  {isRedirecting ? 'Doorverwijzen naar Stripe...' : 'Stripe-account koppelen'}
                </button>
              )}
              {connection?.status === 'active' && (
                <button
                  type="button"
                  className="button button--secondary"
                  onClick={handleCreateLink}
                  disabled={isRedirecting}
                >
                  {isRedirecting ? 'Doorverwijzen...' : 'Accountinstellingen bijwerken'}
                </button>
              )}
              <button
                type="button"
                className="button button--secondary"
                onClick={() => void refreshConnection()}
                disabled={isRefreshing}
              >
                {isRefreshing ? 'Vernieuwen...' : 'Status vernieuwen'}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="card" style={{ maxWidth: '800px', marginTop: '1.5rem' }}>
        <h2>Platform abonnement</h2>
        <p>Bekijk of wijzig je platformabonnement voor het gebruik van dit systeem.</p>
        <a className="button" href="/organisation/subscription">
          Abonnement beheren
        </a>
      </div>
    </div>
  )
}

export default OrganisationPaymentsSettingsPage
