import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Building2, Eye, CheckCircle2, XCircle, Mail, Plus, X } from 'lucide-react'
import { apiClient } from '../api/axios'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'

type OrganisationSummary = {
  id: number
  name: string
  type: string
  subdomain?: string | null
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
  has_payment_issues?: boolean
  primary_contact: {
    id: number
    first_name: string
    last_name: string
    email: string
    status: string
  } | null
}

type OrganisationForm = {
  name: string
  type: string
  city: string
  country: string
  contact_email: string
  subdomain: string
  status: 'new' | 'active' | 'blocked'
  billing_status: 'ok' | 'pending_payment' | 'restricted'
  billing_note: string
}

const emptyForm: OrganisationForm = {
  name: '',
  type: '',
  city: '',
  country: '',
  contact_email: '',
  subdomain: '',
  status: 'new',
  billing_status: 'pending_payment',
  billing_note: '',
}

const PlatformOrganisationsPage: React.FC = () => {
  const [organisations, setOrganisations] = useState<OrganisationSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [onlyIssues, setOnlyIssues] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<OrganisationForm>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof OrganisationForm, string>>>({})

  const loadOrganisations = async () => {
    setLoading(true)
    setError(null)
    try {
      console.log('[PlatformOrganisationsPage] Laden organisaties...')
      const { data } = await apiClient.get<{ data: OrganisationSummary[] }>('/api/platform/organisations')
      console.log('[PlatformOrganisationsPage] Response ontvangen:', data)
      if (data && data.data) {
        setOrganisations(data.data)
        console.log('[PlatformOrganisationsPage] Organisaties ingesteld:', data.data.length)
      } else {
        console.error('[PlatformOrganisationsPage] Onverwachte response structuur:', data)
        setError('Onverwachte response structuur van de server.')
      }
    } catch (err: any) {
      console.error('[PlatformOrganisationsPage] Fout bij laden organisaties:', err)
      console.error('[PlatformOrganisationsPage] Error response:', err.response)
      console.error('[PlatformOrganisationsPage] Error status:', err.response?.status)
      console.error('[PlatformOrganisationsPage] Error data:', err.response?.data)
      
      let errorMessage = 'Organisaties konden niet worden geladen.'
      
      if (err.response?.status === 401) {
        errorMessage = 'Je bent niet ingelogd. Log opnieuw in.'
      } else if (err.response?.status === 403) {
        errorMessage = 'Je hebt geen toegang tot deze pagina. Je hebt de platform_admin rol nodig.'
      } else if (err.response?.status === 404) {
        errorMessage = 'API endpoint niet gevonden. Controleer of de backend correct is gedeployed.'
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message
      } else if (err.message) {
        errorMessage = err.message
      }
      
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    console.log('[PlatformOrganisationsPage] Component gemount, start laden...')
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

  const sendSubdomainInvitation = async (id: number) => {
    try {
      await apiClient.post(`/api/platform/organisations/${id}/send-subdomain-invitation`)
      setError(null)
      // Toon success message (je kunt later een toast notification toevoegen)
      alert('Uitnodiging is verstuurd!')
    } catch (err: any) {
      console.error(err)
      const errorMessage = err.response?.data?.message || 'Kon uitnodiging niet versturen.'
      setError(errorMessage)
    }
  }

  const handleFormChange = (field: keyof OrganisationForm) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }))
    // Clear error for this field when user starts typing
    if (formErrors[field]) {
      setFormErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  const handleCreateOrganisation = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError(null)
    setFormErrors({})

    try {
      const payload = {
        name: form.name,
        type: form.type,
        city: form.city || null,
        country: form.country || null,
        contact_email: form.contact_email,
        subdomain: form.subdomain || null,
        status: form.status,
        billing_status: form.billing_status,
        billing_note: form.billing_note || null,
      }

      const { data } = await apiClient.post<OrganisationSummary>('/api/platform/organisations', payload)
      setOrganisations((prev) => [data, ...prev])
      setForm(emptyForm)
      setShowForm(false)
      setError(null)
    } catch (err: any) {
      console.error('Organisatie aanmaken mislukt', err)
      if (err.response?.status === 422) {
        // Validation errors
        const errors = err.response.data.errors || {}
        setFormErrors(errors)
        setError('Controleer de invoer van het formulier.')
      } else {
        const errorMessage = err.response?.data?.message || 'Kon organisatie niet aanmaken.'
        setError(errorMessage)
      }
    } finally {
      setSaving(false)
    }
  }

  const totalOrgs = organisations.length
  const activeOrgs = organisations.filter(org => org.status === 'active').length
  const orgsWithIssues = organisations.filter(org => org.has_payment_issues).length

  const filteredOrgs = organisations.filter((organisation) => 
    onlyIssues ? organisation.has_payment_issues : true
  )

  console.log('[PlatformOrganisationsPage] Render - loading:', loading, 'organisations:', organisations.length, 'error:', error)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Platform Overzicht</h2>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Monitor alle organisaties en system metrics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Totaal Organisaties</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{totalOrgs}</p>
            </div>
            <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
              <Building2 className="text-indigo-600 dark:text-indigo-400" size={24} />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Actieve Organisaties</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{activeOrgs}</p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <CheckCircle2 className="text-green-600 dark:text-green-400" size={24} />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Betalingsproblemen</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{orgsWithIssues}</p>
            </div>
            <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <XCircle className="text-red-600 dark:text-red-400" size={24} />
            </div>
          </div>
        </Card>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-400 px-4 py-3 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{error}</p>
              <p className="text-sm mt-1">Controleer de browserconsole (F12) voor meer details.</p>
            </div>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => loadOrganisations()}
            >
              Opnieuw proberen
            </Button>
          </div>
        </div>
      )}

      {showForm && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Nieuwe Organisatie</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowForm(false)
                setForm(emptyForm)
                setFormErrors({})
              }}
            >
              <X size={16} />
            </Button>
          </div>
          <form onSubmit={handleCreateOrganisation} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Naam <span className="text-red-500">*</span>
                </label>
                <input
                  id="name"
                  type="text"
                  value={form.name}
                  onChange={handleFormChange('name')}
                  required
                  className={`w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    formErrors.name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                />
                {formErrors.name && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.name}</p>
                )}
              </div>
              <div>
                <label htmlFor="type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Type <span className="text-red-500">*</span>
                </label>
                <input
                  id="type"
                  type="text"
                  value={form.type}
                  onChange={handleFormChange('type')}
                  required
                  className={`w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    formErrors.type ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                />
                {formErrors.type && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.type}</p>
                )}
              </div>
              <div>
                <label htmlFor="contact_email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Contact E-mail <span className="text-red-500">*</span>
                </label>
                <input
                  id="contact_email"
                  type="email"
                  value={form.contact_email}
                  onChange={handleFormChange('contact_email')}
                  required
                  className={`w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    formErrors.contact_email ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                />
                {formErrors.contact_email && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.contact_email}</p>
                )}
              </div>
              <div>
                <label htmlFor="subdomain" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Subdomein (optioneel, wordt automatisch gegenereerd indien leeg)
                </label>
                <input
                  id="subdomain"
                  type="text"
                  value={form.subdomain}
                  onChange={handleFormChange('subdomain')}
                  className={`w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    formErrors.subdomain ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                />
                {formErrors.subdomain && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.subdomain}</p>
                )}
              </div>
              <div>
                <label htmlFor="city" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Stad
                </label>
                <input
                  id="city"
                  type="text"
                  value={form.city}
                  onChange={handleFormChange('city')}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label htmlFor="country" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Land
                </label>
                <input
                  id="country"
                  type="text"
                  value={form.country}
                  onChange={handleFormChange('country')}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Status
                </label>
                <select
                  id="status"
                  value={form.status}
                  onChange={handleFormChange('status')}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="new">Nieuw</option>
                  <option value="active">Actief</option>
                  <option value="blocked">Geblokkeerd</option>
                </select>
              </div>
              <div>
                <label htmlFor="billing_status" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Betaalstatus
                </label>
                <select
                  id="billing_status"
                  value={form.billing_status}
                  onChange={handleFormChange('billing_status')}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="ok">OK</option>
                  <option value="pending_payment">Betaling in behandeling</option>
                  <option value="restricted">Beperkt</option>
                </select>
              </div>
            </div>
            <div>
              <label htmlFor="billing_note" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Betaalnotitie
              </label>
              <textarea
                id="billing_note"
                value={form.billing_note}
                onChange={handleFormChange('billing_note')}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex items-center justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowForm(false)
                  setForm(emptyForm)
                  setFormErrors({})
                }}
                disabled={saving}
              >
                Annuleren
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Bezig met opslaan...' : 'Organisatie aanmaken'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Organisaties</h3>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={onlyIssues}
                onChange={(event) => setOnlyIssues(event.target.checked)}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              Alleen betalingsproblemen
            </label>
            {!showForm && (
              <Button onClick={() => setShowForm(true)} size="sm">
                <Plus size={16} />
                Nieuwe Organisatie
              </Button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8 text-gray-600 dark:text-gray-400">Bezig met laden...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Organisatie</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Subdomein</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Type</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Contact</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Abonnement</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Betaalstatus</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Acties</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrgs.length > 0 ? (
                  filteredOrgs.map((organisation) => (
                    <tr key={organisation.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center">
                            <Building2 className="text-indigo-600 dark:text-indigo-400" size={20} />
                          </div>
                          <div>
                            <span className="font-medium text-gray-900 dark:text-white">{organisation.name}</span>
                            {(organisation.city || organisation.country) && (
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                {organisation.city ?? ''} {organisation.country ?? ''}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                    <td className="py-4 px-4">
                      {organisation.subdomain ? (
                        <div className="space-y-1">
                          <p className="text-sm font-mono text-gray-900 dark:text-white">{organisation.subdomain}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-500">
                            {organisation.subdomain}.aidatim.nl
                          </p>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400 dark:text-gray-500">Geen subdomein</span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-gray-600 dark:text-gray-400">{organisation.type}</td>
                    <td className="py-4 px-4">
                      <div className="space-y-1">
                        <p className="text-sm text-gray-600 dark:text-gray-400">{organisation.contact_email}</p>
                        {organisation.primary_contact && (
                          <p className="text-xs text-gray-500 dark:text-gray-500">
                            {organisation.primary_contact.first_name} {organisation.primary_contact.last_name}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      {organisation.status === 'active' ? (
                        <Badge variant="success">Actief</Badge>
                      ) : (
                        <Badge variant="error">Niet actief</Badge>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <div className="space-y-1">
                        <p className="text-sm text-gray-900 dark:text-white">
                          {organisation.subscription?.plan_name ?? 'Geen'}
                        </p>
                        {organisation.subscription?.status && (
                          <p className="text-xs text-gray-500 dark:text-gray-500">
                            {organisation.subscription.status}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      {organisation.billing_status ? (
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
                      ) : (
                        <Badge variant="default">n.v.t.</Badge>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center justify-end gap-2">
                        {organisation.subdomain && (
                          <Button 
                            variant="outline"
                            size="sm"
                            onClick={() => sendSubdomainInvitation(organisation.id)}
                          >
                            <Mail size={16} />
                            Uitnodiging
                          </Button>
                        )}
                        <Link to={`/platform/organisations/${organisation.id}`}>
                          <Button variant="outline" size="sm">
                            <Eye size={16} />
                            Details
                          </Button>
                        </Link>
                        {organisation.status !== 'active' && (
                          <Button 
                            size="sm"
                            onClick={() => updateStatus(organisation.id, 'activate')}
                          >
                            Activeer
                          </Button>
                        )}
                        {organisation.status !== 'blocked' && (
                          <Button 
                            variant="secondary"
                            size="sm"
                            onClick={() => updateStatus(organisation.id, 'block')}
                          >
                            Blokkeer
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-gray-500 dark:text-gray-400">
                      {error ? (
                        <div className="space-y-2">
                          <p className="font-medium text-red-600 dark:text-red-400">Fout bij laden organisaties</p>
                          <p className="text-sm">{error}</p>
                          <Button 
                            size="sm" 
                            onClick={() => loadOrganisations()}
                            className="mt-2"
                          >
                            Opnieuw proberen
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <p>Geen organisaties gevonden.</p>
                          {!showForm && (
                            <Button 
                              size="sm" 
                              onClick={() => setShowForm(true)}
                              className="mt-2"
                            >
                              <Plus size={16} />
                              Eerste organisatie aanmaken
                            </Button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}

export default PlatformOrganisationsPage

