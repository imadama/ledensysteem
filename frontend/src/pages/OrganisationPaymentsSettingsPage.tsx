import { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import { apiClient } from '../api/axios'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'

type ConnectionStatus = 'none' | 'pending' | 'active' | 'blocked'

type ConnectionResponse = {
  status: ConnectionStatus
  stripe_account_id: string | null
  activated_at?: string | null
  last_error?: string | null
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
      let message = err?.response?.data?.message ?? 'Kon geen onboardinglink aanmaken. Controleer later opnieuw.'
      
      // Voeg specifieke Stripe foutmelding toe als beschikbaar
      if (err?.response?.data?.errors?.stripe?.[0]) {
        message += ` Details: ${err.response.data.errors.stripe[0]}`
      }
      
      setError(message)
      setIsRedirecting(false)
      
      // Refresh connection om laatste status op te halen
      await fetchConnection()
    }
  }

  const getStatusBadge = (status: ConnectionStatus) => {
    switch (status) {
      case 'active':
        return <Badge variant="success">Actief</Badge>
      case 'pending':
        return <Badge variant="warning">In behandeling</Badge>
      case 'blocked':
        return <Badge variant="error">Geblokkeerd</Badge>
      default:
        return <Badge variant="default">Niet gekoppeld</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Betalingen instellingen</h1>
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

      <Card className="p-6 max-w-3xl">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Stripe betaalrekening koppelen</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Koppel je Stripe-account om betalingen van leden te ontvangen. Betalingen gaan direct naar je Stripe-account
          en worden automatisch uitbetaald naar je bankrekening.
        </p>

        {loading ? (
          <p className="text-gray-600 dark:text-gray-400">Bezig met laden...</p>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-[max-content_1fr] gap-4 items-center">
              <strong className="text-sm font-medium text-gray-700 dark:text-gray-300">Status:</strong>
              <div>{getStatusBadge(connection?.status ?? 'none')}</div>
            </div>

            {connection?.stripe_account_id && (
              <div className="grid grid-cols-[max-content_1fr] gap-4 items-center">
                <strong className="text-sm font-medium text-gray-700 dark:text-gray-300">Stripe account ID:</strong>
                <div className="font-mono text-sm text-gray-900 dark:text-white">{connection.stripe_account_id}</div>
              </div>
            )}

            {connection?.activated_at && (
              <div className="grid grid-cols-[max-content_1fr] gap-4 items-center">
                <strong className="text-sm font-medium text-gray-700 dark:text-gray-300">Geactiveerd op:</strong>
                <div className="text-gray-900 dark:text-white">{new Date(connection.activated_at).toLocaleString('nl-NL')}</div>
              </div>
            )}

            {connection?.status === 'none' && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <strong className="block text-sm font-semibold text-blue-900 dark:text-blue-300 mb-2">Nog niet gekoppeld</strong>
                <p className="text-sm text-blue-800 dark:text-blue-400 mb-2">
                  Klik op "Stripe-account koppelen" om te beginnen. Je wordt doorgestuurd naar Stripe waar je:
                </p>
                <ul className="list-disc list-inside text-sm text-blue-800 dark:text-blue-400 space-y-1">
                  <li>Inlogt met je Stripe-account (of maakt er een aan)</li>
                  <li>Je bedrijfsgegevens invult</li>
                  <li>Je bankrekening opgeeft voor uitbetalingen</li>
                </ul>
              </div>
            )}

            {connection?.status === 'pending' && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <strong className="block text-sm font-semibold text-yellow-900 dark:text-yellow-300 mb-2">Koppeling in behandeling</strong>
                <p className="text-sm text-yellow-800 dark:text-yellow-400">
                  Je Stripe-account is aangemaakt maar nog niet volledig geactiveerd. Stripe controleert je gegevens.
                  Dit kan enkele minuten tot uren duren.
                </p>
              </div>
            )}

            {connection?.status === 'active' && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <strong className="block text-sm font-semibold text-green-900 dark:text-green-300 mb-2">Betaalrekening actief</strong>
                <p className="text-sm text-green-800 dark:text-green-400">
                  Je Stripe-account is gekoppeld en actief. Leden kunnen nu betalingen doen en het geld wordt
                  automatisch uitbetaald naar je bankrekening.
                </p>
              </div>
            )}

            {connection?.status === 'blocked' && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <strong className="block text-sm font-semibold text-red-900 dark:text-red-300 mb-2">Account geblokkeerd</strong>
                <p className="text-sm text-red-800 dark:text-red-400 mb-2">
                  Er is een probleem met je Stripe-account. Neem contact op met Stripe support of probeer opnieuw te
                  koppelen.
                </p>
                {connection.last_error && (
                  <p className="text-xs text-red-700 dark:text-red-500 mt-2 font-mono bg-red-100 dark:bg-red-900/40 p-2 rounded">
                    {connection.last_error}
                  </p>
                )}
              </div>
            )}

            <div className="flex gap-3 flex-wrap mt-2">
              {connection?.status !== 'active' && (
                <Button
                  onClick={handleCreateLink}
                  disabled={isRedirecting}
                >
                  {isRedirecting ? 'Doorverwijzen naar Stripe...' : 'Stripe-account koppelen'}
                </Button>
              )}
              {connection?.status === 'active' && (
                <Button
                  variant="secondary"
                  onClick={handleCreateLink}
                  disabled={isRedirecting}
                >
                  {isRedirecting ? 'Doorverwijzen...' : 'Accountinstellingen bijwerken'}
                </Button>
              )}
              <Button
                variant="secondary"
                onClick={() => void refreshConnection()}
                disabled={isRefreshing}
              >
                {isRefreshing ? 'Vernieuwen...' : 'Status vernieuwen'}
              </Button>
            </div>
          </div>
        )}
      </Card>

      <Card className="p-6 max-w-3xl">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Platform abonnement</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-4">Bekijk of wijzig je platformabonnement voor het gebruik van dit systeem.</p>
        <Link to="/organisation/subscription">
          <Button>
            Abonnement beheren
          </Button>
        </Link>
      </Card>
    </div>
  )
}

export default OrganisationPaymentsSettingsPage
