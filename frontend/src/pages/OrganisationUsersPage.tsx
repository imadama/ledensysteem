import { type FormEvent, useEffect, useState } from 'react'
import { UserPlus, X, Ban, CheckCircle2, Trash2 } from 'lucide-react'
import { apiClient } from '../api/axios'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'

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
    role: 'org_admin',
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
      setForm({ first_name: '', last_name: '', email: '', status: 'pending', role: 'org_admin' })
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Beheerders</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Beheer organisatie beheerders</p>
        </div>
        <Button onClick={() => setShowForm((prev) => !prev)} variant={showForm ? 'secondary' : 'primary'}>
          {showForm ? (
            <>
              <X size={16} />
              Annuleren
            </>
          ) : (
            <>
              <UserPlus size={16} />
              Nieuwe beheerder
            </>
          )}
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-400 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {showForm && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Nieuwe beheerder</h3>
          <form className="space-y-4" onSubmit={handleCreate}>
            <div>
              <label htmlFor="new-first-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Voornaam
              </label>
              <input
                id="new-first-name"
                value={form.first_name}
                onChange={(event) => setForm((prev) => ({ ...prev, first_name: event.target.value }))}
                required
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-aidatim-blue"
              />
            </div>
            <div>
              <label htmlFor="new-last-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Achternaam
              </label>
              <input
                id="new-last-name"
                value={form.last_name}
                onChange={(event) => setForm((prev) => ({ ...prev, last_name: event.target.value }))}
                required
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-aidatim-blue"
              />
            </div>
            <div>
              <label htmlFor="new-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                E-mailadres
              </label>
              <input
                id="new-email"
                type="email"
                value={form.email}
                onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                required
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-aidatim-blue"
              />
            </div>
            <div>
              <label htmlFor="new-status" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Status
              </label>
              <select
                id="new-status"
                value={form.status}
                onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-aidatim-blue"
              >
                <option value="pending">In afwachting</option>
                <option value="active">Actief</option>
              </select>
            </div>
            <div>
              <label htmlFor="new-role" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Rol
              </label>
              <select
                id="new-role"
                value={form.role}
                onChange={(event) => setForm((prev) => ({ ...prev, role: event.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-aidatim-blue"
              >
                <option value="org_admin">Organisatie Beheerder</option>
                <option value="monitor">Monitor</option>
              </select>
            </div>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Opslaan...' : 'Uitnodiging versturen'}
            </Button>
          </form>
        </Card>
      )}

      {loading ? (
        <div className="text-center py-8 text-gray-600 dark:text-gray-400">Bezig met laden...</div>
      ) : (
        <Card className="p-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Naam</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">E-mail</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Rollen</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Acties</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="py-4 px-4 text-gray-900 dark:text-white">
                      {user.first_name} {user.last_name}
                    </td>
                    <td className="py-4 px-4 text-gray-600 dark:text-gray-400">{user.email}</td>
                    <td className="py-4 px-4">
                      {user.status === 'active' ? (
                        <Badge variant="success">Actief</Badge>
                      ) : (
                        <Badge variant="error">Niet actief</Badge>
                      )}
                    </td>
                    <td className="py-4 px-4 text-gray-600 dark:text-gray-400">{user.roles.join(', ')}</td>
                    <td className="py-4 px-4">
                      <div className="flex items-center justify-end gap-2">
                        {user.status !== 'blocked' ? (
                          <Button variant="outline" size="sm" onClick={() => handleBlock(user.id)}>
                            <Ban size={16} />
                            Blokkeer
                          </Button>
                        ) : (
                          <Button size="sm" onClick={() => handleUnblock(user.id)}>
                            <CheckCircle2 size={16} />
                            Deblokkeer
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(user.id)}
                          className="text-red-600 hover:text-red-700 border-red-300"
                        >
                          <Trash2 size={16} />
                          Verwijder
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && !loading && (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-gray-500 dark:text-gray-400">
                      Geen beheerders gevonden.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}

export default OrganisationUsersPage

