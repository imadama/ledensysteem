import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { apiClient } from '../api/axios'

type ConnectionStatus = 'none' | 'pending' | 'active' | 'blocked'

type ConnectionResponse = {
  status: ConnectionStatus
  stripe_account_id: string | null
  activated_at?: string | null
}

const statusLabels: Record<ConnectionStatus, string> = {
  none: 'Geen koppeling',
  pending: 'In aanvraag',
  active: 'Actief',
  blocked: 'Geblokkeerd',
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

  const statusLabel = useMemo(() => {
    if (!connection) {
      return 'Onbekend'
    }

    return statusLabels[connection.status]
  }, [connection])

  return (
    <div>
      <div className="page-header">
        <h1>Betalingen</h1>
      </div>

      {error && <div className="alert alert--error">{error}</div>}
      {successMessage && <div className="alert alert--success">{successMessage}</div>}

      <div className="card" style={{ maxWidth: '640px' }}>
        {loading ? (
          <p>Bezig met laden...</p>
        ) : (
          <div style={{ display: 'grid', gap: '1rem' }}>
            <div>
              <strong>Status</strong>
              <div>{statusLabel}</div>
            </div>
            <div>
              <strong>Stripe account</strong>
              <div>{connection?.stripe_account_id ?? 'Nog niet gekoppeld'}</div>
            </div>
            {connection?.activated_at && (
              <div>
                <strong>Geactiveerd op</strong>
                <div>{new Date(connection.activated_at).toLocaleString('nl-NL')}</div>
              </div>
            )}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="button"
                onClick={handleCreateLink}
                disabled={isRedirecting}
              >
                {isRedirecting ? 'Doorverwijzen...' : 'Betaalrekening koppelen'}
              </button>
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

      <div className="card" style={{ maxWidth: '640px', marginTop: '1rem' }}>
        <h2>Abonnement</h2>
        <p>Bekijk of wijzig je platformabonnement.</p>
        <a className="button" href="/organisation/subscription">
          Abonnement beheren
        </a>
      </div>
    </div>
  )
}

export default OrganisationPaymentsSettingsPage
