import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Building2, ArrowLeft, CheckCircle2, XCircle, Users, Mail, Calendar } from 'lucide-react'
import { apiClient } from '../api/axios'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { format } from 'date-fns'

type OrganisationSummary = {
  id: number
  name: string
  type: string
  city?: string | null
  country?: string | null
  contact_email: string
  status: string
  created_at: string
  billing_status?: string | null
  billing_note?: string | null
  subscription?: {
    plan_name?: string | null
    status?: string | null
    current_period_end?: string | null
  } | null
  primary_contact: {
    id: number
    first_name: string
    last_name: string
    email: string
    status: string
  } | null
}

type OrganisationDetail = {
  organisation: OrganisationSummary
  users: Array<{
    id: number
    name: string
    email: string
    status: string
    roles: string[]
  }>
}

const PlatformOrganisationDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [detail, setDetail] = useState<OrganisationDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadDetail = async () => {
    if (!id) {
      return
    }
    setLoading(true)
    setError(null)
    try {
      const { data } = await apiClient.get<OrganisationDetail>(`/api/platform/organisations/${id}`)
      setDetail(data)
    } catch (err) {
      console.error(err)
      setError('Organisatie kon niet worden geladen.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDetail()
  }, [id])

  const updateStatus = async (status: 'activate' | 'block') => {
    if (!id) return
    try {
      const { data } = await apiClient.patch<OrganisationSummary>(
        `/api/platform/organisations/${id}/${status}`,
      )
      setDetail((prev) => (prev ? { ...prev, organisation: data } : prev))
    } catch (err) {
      console.error(err)
      setError('Status aanpassen mislukt.')
    }
  }

  if (loading) {
    return <div className="text-center py-8 text-gray-600 dark:text-gray-400">Bezig met laden...</div>
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-400 px-4 py-3 rounded-lg">
          {error}
        </div>
        <Button onClick={() => navigate(-1)}>
          <ArrowLeft size={16} />
          Ga terug
        </Button>
      </div>
    )
  }

  if (!detail) {
    return null
  }

  const { organisation, users } = detail

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{organisation.name}</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {organisation.type} | {organisation.city ?? ''} {organisation.country ?? ''}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft size={16} />
            Terug
          </Button>
          {organisation.status !== 'active' && (
            <Button onClick={() => updateStatus('activate')}>
              <CheckCircle2 size={16} />
              Activeer
            </Button>
          )}
          {organisation.status !== 'blocked' && (
            <Button variant="secondary" onClick={() => updateStatus('block')}>
              <XCircle size={16} />
              Blokkeer
            </Button>
          )}
        </div>
      </div>

      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Organisatiegegevens</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Contact e-mail</p>
            <p className="text-gray-900 dark:text-white">{organisation.contact_email}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Status</p>
            {organisation.status === 'active' ? (
              <Badge variant="success">{organisation.status}</Badge>
            ) : (
              <Badge variant="error">{organisation.status}</Badge>
            )}
          </div>
          {organisation.billing_status && (
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Betalingsstatus</p>
              <div className="space-y-1">
                <Badge
                  variant={
                    organisation.billing_status === 'ok'
                      ? 'success'
                      : organisation.billing_status === 'restricted'
                      ? 'error'
                      : 'warning'
                  }
                >
                  {organisation.billing_status}
                </Badge>
                {organisation.billing_note && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">{organisation.billing_note}</p>
                )}
              </div>
            </div>
          )}
          {organisation.subscription && (
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Abonnement</p>
              <div className="space-y-1">
                <p className="text-gray-900 dark:text-white">{organisation.subscription.plan_name ?? 'Geen pakket'}</p>
                {organisation.subscription.status && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">Status: {organisation.subscription.status}</p>
                )}
                {organisation.subscription.current_period_end && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Periode tot: {format(new Date(organisation.subscription.current_period_end), 'dd MMM yyyy HH:mm')}
                  </p>
                )}
              </div>
            </div>
          )}
          <div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Aangemaakt op</p>
            <p className="text-gray-900 dark:text-white">{format(new Date(organisation.created_at), 'dd MMM yyyy')}</p>
          </div>
          {organisation.primary_contact && (
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Primair contact</p>
              <p className="text-gray-900 dark:text-white">
                {organisation.primary_contact.first_name} {organisation.primary_contact.last_name}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">{organisation.primary_contact.email}</p>
            </div>
          )}
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Users className="text-indigo-600 dark:text-indigo-400" size={20} />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Gebruikers</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Naam</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">E-mail</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Status</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Rollen</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="py-4 px-4 text-gray-900 dark:text-white">{user.name}</td>
                  <td className="py-4 px-4 text-gray-600 dark:text-gray-400">{user.email}</td>
                  <td className="py-4 px-4">
                    {user.status === 'active' ? (
                      <Badge variant="success">{user.status}</Badge>
                    ) : (
                      <Badge variant="default">{user.status}</Badge>
                    )}
                  </td>
                  <td className="py-4 px-4 text-gray-600 dark:text-gray-400">{user.roles.join(', ')}</td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-gray-500 dark:text-gray-400">
                    Geen gebruikers gevonden.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Link to="/platform/organisations" className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1">
        <ArrowLeft size={16} />
        Terug naar overzicht
      </Link>
    </div>
  )
}

export default PlatformOrganisationDetailPage

