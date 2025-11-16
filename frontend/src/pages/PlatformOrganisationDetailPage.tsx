import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { apiClient } from '../api/axios'

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
    return <div>Bezig met laden...</div>
  }

  if (error) {
    return (
      <div>
        <div className="alert alert--error">{error}</div>
        <button className="button" onClick={() => navigate(-1)}>
          Ga terug
        </button>
      </div>
    )
  }

  if (!detail) {
    return null
  }

  const { organisation, users } = detail

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>{organisation.name}</h1>
          <p>
            {organisation.type} | {organisation.city ?? ''} {organisation.country ?? ''}
          </p>
        </div>
        <div className="table-actions">
          <button className="button button--secondary" onClick={() => navigate(-1)}>
            Terug
          </button>
          {organisation.status !== 'active' && (
            <button className="button" onClick={() => updateStatus('activate')}>
              Activeer
            </button>
          )}
          {organisation.status !== 'blocked' && (
            <button className="button button--secondary" onClick={() => updateStatus('block')}>
              Blokkeer
            </button>
          )}
        </div>
      </div>

      <div className="card" style={{ marginTop: '1.5rem' }}>
        <h2>Organisatiegegevens</h2>
        <dl style={{ display: 'grid', gridTemplateColumns: 'max-content 1fr', rowGap: '0.75rem', columnGap: '1rem' }}>
          <dt>Contact e-mail</dt>
          <dd>{organisation.contact_email}</dd>
          <dt>Status</dt>
          <dd>{organisation.status}</dd>
          {organisation.billing_status && (
            <>
              <dt>Betalingsstatus</dt>
              <dd>
                <span
                  className={`badge ${
                    organisation.billing_status === 'ok'
                      ? 'badge--success'
                      : organisation.billing_status === 'restricted'
                        ? 'badge--danger'
                        : 'badge--warning'
                  }`}
                >
                  {organisation.billing_status}
                </span>
                {organisation.billing_note && <div>{organisation.billing_note}</div>}
              </dd>
            </>
          )}
          {organisation.subscription && (
            <>
              <dt>Abonnement</dt>
              <dd>
                <div>{organisation.subscription.plan_name ?? 'Geen pakket'}</div>
                {organisation.subscription.status && (
                  <div>Status: {organisation.subscription.status}</div>
                )}
                {organisation.subscription.current_period_end && (
                  <div>
                    Periode tot:{' '}
                    {new Date(organisation.subscription.current_period_end).toLocaleString('nl-NL')}
                  </div>
                )}
              </dd>
            </>
          )}
          <dt>Aangemaakt op</dt>
          <dd>{new Date(organisation.created_at).toLocaleString()}</dd>
          {organisation.primary_contact && (
            <>
              <dt>Primair contact</dt>
              <dd>
                {organisation.primary_contact.first_name} {organisation.primary_contact.last_name} -{' '}
                {organisation.primary_contact.email}
              </dd>
            </>
          )}
        </dl>
      </div>

      <section style={{ marginTop: '2rem' }}>
        <h2>Gebruikers</h2>
        <div className="table-responsive">
        <table className="table">
          <thead>
            <tr>
              <th>Naam</th>
              <th>E-mail</th>
              <th>Status</th>
              <th>Rollen</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>{user.name}</td>
                <td>{user.email}</td>
                <td>{user.status}</td>
                <td>{user.roles.join(', ')}</td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center' }}>
                  Geen gebruikers gevonden.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </section>

      <div style={{ marginTop: '1.5rem' }}>
        <Link to="/platform/organisations">← Terug naar overzicht</Link>
      </div>
    </div>
  )
}

export default PlatformOrganisationDetailPage

