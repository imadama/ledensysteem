import { type FormEvent, useEffect, useState } from 'react'
import { apiClient } from '../api/axios'

type OrgUser = {
  id: number
  first_name: string
  last_name: string
  email: string
  status: string
  roles: string[]
}

const OrganisationUsersPage: React.FC = () => {
  const [users, setUsers] = useState<OrgUser[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    status: 'pending',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const loadUsers = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data } = await apiClient.get<{ data: OrgUser[] }>('/api/organisation/users')
      setUsers(data.data)
    } catch (err) {
      console.error(err)
      setError('Gebruikers konden niet worden geladen.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [])

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault()
    setIsSubmitting(true)
    setError(null)
    try {
      const { data } = await apiClient.post<OrgUser>('/api/organisation/users', form)
      setUsers((prev) => [...prev, data])
      setForm({ first_name: '', last_name: '', email: '', status: 'pending' })
      setShowForm(false)
    } catch (err) {
      console.error(err)
      setError('Gebruiker kon niet worden aangemaakt.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleBlock = async (userId: number) => {
    try {
      const { data } = await apiClient.patch<OrgUser>(`/api/organisation/users/${userId}/block`)
      setUsers((prev) => prev.map((user) => (user.id === userId ? data : user)))
    } catch (err) {
      console.error(err)
      setError('Gebruiker blokkeren mislukt.')
    }
  }

  const handleUnblock = async (userId: number) => {
    try {
      const { data } = await apiClient.patch<OrgUser>(`/api/organisation/users/${userId}/unblock`)
      setUsers((prev) => prev.map((user) => (user.id === userId ? data : user)))
    } catch (err) {
      console.error(err)
      setError('Gebruiker deblokkeren mislukt.')
    }
  }

  const handleDelete = async (userId: number) => {
    if (!window.confirm('Weet je zeker dat je deze beheerder wilt verwijderen?')) {
      return
    }
    try {
      await apiClient.delete(`/api/organisation/users/${userId}`)
      setUsers((prev) => prev.filter((user) => user.id !== userId))
    } catch (err) {
      console.error(err)
      setError('Gebruiker verwijderen mislukt.')
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Beheerders</h1>
        <button className="button" onClick={() => setShowForm((prev) => !prev)}>
          {showForm ? 'Annuleren' : 'Nieuwe beheerder toevoegen'}
        </button>
      </div>

      {error && <div className="alert alert--error">{error}</div>}

      {showForm && (
        <div className="card" style={{ marginTop: '1.5rem' }}>
          <h2>Nieuwe beheerder</h2>
          <form className="form" onSubmit={handleCreate}>
            <div className="form__group">
              <label htmlFor="new-first-name">Voornaam</label>
              <input
                id="new-first-name"
                value={form.first_name}
                onChange={(event) => setForm((prev) => ({ ...prev, first_name: event.target.value }))}
                required
              />
            </div>
            <div className="form__group">
              <label htmlFor="new-last-name">Achternaam</label>
              <input
                id="new-last-name"
                value={form.last_name}
                onChange={(event) => setForm((prev) => ({ ...prev, last_name: event.target.value }))}
                required
              />
            </div>
            <div className="form__group">
              <label htmlFor="new-email">E-mailadres</label>
              <input
                id="new-email"
                type="email"
                value={form.email}
                onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                required
              />
            </div>
            <div className="form__group">
              <label htmlFor="new-status">Status</label>
              <select
                id="new-status"
                value={form.status}
                onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}
              >
                <option value="pending">In afwachting</option>
                <option value="active">Actief</option>
              </select>
            </div>
            <button className="button" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Opslaan...' : 'Uitnodiging versturen'}
            </button>
          </form>
        </div>
      )}

      {loading ? (
        <div style={{ marginTop: '2rem' }}>Bezig met laden...</div>
      ) : (
        <div className="table-responsive">
        <table className="table">
          <thead>
            <tr>
              <th>Naam</th>
              <th>E-mail</th>
              <th>Status</th>
              <th>Rollen</th>
              <th>Acties</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>
                  {user.first_name} {user.last_name}
                </td>
                <td>{user.email}</td>
                <td>
                  <span className={`badge ${user.status === 'active' ? 'badge--success' : 'badge--danger'}`}>
                    {user.status}
                  </span>
                </td>
                <td>{user.roles.join(', ')}</td>
                <td>
                  <div className="table-actions">
                    {user.status !== 'blocked' ? (
                      <button className="button button--secondary" onClick={() => handleBlock(user.id)}>
                        Blokkeer
                      </button>
                    ) : (
                      <button className="button" onClick={() => handleUnblock(user.id)}>
                        Deblokkeer
                      </button>
                    )}
                    <button className="button button--secondary" onClick={() => handleDelete(user.id)}>
                      Verwijder
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {users.length === 0 && !loading && (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center' }}>
                  Geen beheerders gevonden.
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

export default OrganisationUsersPage

