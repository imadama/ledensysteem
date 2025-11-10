import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
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
  primary_contact: {
    id: number
    first_name: string
    last_name: string
    email: string
    status: string
  } | null
}

const PlatformOrganisationsPage: React.FC = () => {
  const [organisations, setOrganisations] = useState<OrganisationSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadOrganisations = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data } = await apiClient.get<{ data: OrganisationSummary[] }>('/api/platform/organisations')
      setOrganisations(data.data)
    } catch (err) {
      console.error(err)
      setError('Organisaties konden niet worden geladen.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadOrganisations()
  }, [])

  const updateStatus = async (id: number, action: 'activate' | 'block') => {
    try {
      const { data } = await apiClient.patch<OrganisationSummary>(`/api/platform/organisations/${id}/${action}`)
      setOrganisations((prev) => prev.map((org) => (org.id === id ? data : org)))
    } catch (err) {
      console.error(err)
      setError(`Kon status niet wijzigen (${action}).`)
    }
  }

  return (
    <div>
      <h1>Organisaties</h1>
      <p>Overzicht van alle organisaties binnen het platform.</p>

      {error && <div className="alert alert--error">{error}</div>}

      {loading ? (
        <div>Bezig met laden...</div>
      ) : (
        <div className="table-responsive">
        <table className="table">
          <thead>
            <tr>
              <th>Naam</th>
              <th>Type</th>
              <th>Contact</th>
              <th>Status</th>
              <th>Acties</th>
            </tr>
          </thead>
          <tbody>
            {organisations.map((organisation) => (
              <tr key={organisation.id}>
                <td>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <strong>{organisation.name}</strong>
                    <small>{organisation.city ?? ''} {organisation.country ?? ''}</small>
                  </div>
                </td>
                <td>{organisation.type}</td>
                <td>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span>{organisation.contact_email}</span>
                    {organisation.primary_contact && (
                      <small>
                        {organisation.primary_contact.first_name} {organisation.primary_contact.last_name}
                      </small>
                    )}
                  </div>
                </td>
                <td>
                  <span className={`badge ${organisation.status === 'active' ? 'badge--success' : 'badge--danger'}`}>
                    {organisation.status}
                  </span>
                </td>
                <td>
                    <div className="table-actions">
                    <Link className="button" to={`/platform/organisations/${organisation.id}`}>
                      Details
                    </Link>
                    {organisation.status !== 'active' && (
                      <button
                        className="button"
                        onClick={() => updateStatus(organisation.id, 'activate')}
                      >
                        Activeer
                      </button>
                    )}
                    {organisation.status !== 'blocked' && (
                      <button
                        className="button button--secondary"
                        onClick={() => updateStatus(organisation.id, 'block')}
                      >
                        Blokkeer
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {organisations.length === 0 && !loading && (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center' }}>
                  Geen organisaties gevonden.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      )}
    </div>
  )
}

export default PlatformOrganisationsPage

