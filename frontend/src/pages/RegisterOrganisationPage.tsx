import { type FormEvent, useState } from 'react'
import { Building2, UserPlus } from 'lucide-react'
import { apiClient } from '../api/axios'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'

type OrganisationForm = {
  name: string
  type: string
  city: string
  country: string
  contact_email: string
}

type AdminForm = {
  first_name: string
  last_name: string
  email: string
  password: string
  password_confirmation: string
}

const RegisterOrganisationPage: React.FC = () => {
  const [organisation, setOrganisation] = useState<OrganisationForm>({
    name: '',
    type: '',
    city: '',
    country: '',
    contact_email: '',
  })
  const [admin, setAdmin] = useState<AdminForm>({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    password_confirmation: '',
  })
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleOrganisationChange = (field: keyof OrganisationForm) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setOrganisation((prev) => ({ ...prev, [field]: event.target.value }))
    }

  const handleAdminChange = (field: keyof AdminForm) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setAdmin((prev) => ({ ...prev, [field]: event.target.value }))
    }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setMessage(null)

    if (!acceptTerms) {
      setError('Je moet akkoord gaan met de voorwaarden.')
      return
    }

    setIsSubmitting(true)
    try {
      await apiClient.get('/sanctum/csrf-cookie')
      await apiClient.post('/api/auth/register-organisation', {
        organisation,
        admin,
        accept_terms: acceptTerms,
      })

      setMessage('Registratie ontvangen! Controleer je e-mail voor activatie.')
      setOrganisation({ name: '', type: '', city: '', country: '', contact_email: '' })
      setAdmin({
        first_name: '',
        last_name: '',
        email: '',
        password: '',
        password_confirmation: '',
      })
      setAcceptTerms(false)
    } catch (err) {
      console.error(err)
      setError('Registratie mislukt. Controleer de velden en probeer opnieuw.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const inputClassName = "w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
  const labelClassName = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 py-8">
      <div className="max-w-3xl mx-auto">
        <Card className="p-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Nieuwe organisatie registreren</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">Vul zowel de gegevens van de organisatie als van de eerste beheerder in.</p>
          </div>

          {message && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-400 px-4 py-3 rounded-lg mb-4">
              {message}
            </div>
          )}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-400 px-4 py-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          <form className="space-y-8" onSubmit={handleSubmit}>
            <section className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Building2 className="text-indigo-600 dark:text-indigo-400" size={20} />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Organisatie</h2>
              </div>
              <div>
                <label htmlFor="org-name" className={labelClassName}>Naam *</label>
                <input
                  id="org-name"
                  value={organisation.name}
                  onChange={handleOrganisationChange('name')}
                  required
                  className={inputClassName}
                />
              </div>
              <div>
                <label htmlFor="org-type" className={labelClassName}>Type *</label>
                <select
                  id="org-type"
                  value={organisation.type}
                  onChange={handleOrganisationChange('type')}
                  required
                  className={inputClassName}
                >
                  <option value="">Selecteer...</option>
                  <option value="moskee">Moskee</option>
                  <option value="stichting">Stichting</option>
                  <option value="vereniging">Vereniging</option>
                </select>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="org-city" className={labelClassName}>Stad</label>
                  <input id="org-city" value={organisation.city} onChange={handleOrganisationChange('city')} className={inputClassName} />
                </div>
                <div>
                  <label htmlFor="org-country" className={labelClassName}>Land</label>
                  <input
                    id="org-country"
                    value={organisation.country}
                    onChange={handleOrganisationChange('country')}
                    className={inputClassName}
                  />
                </div>
              </div>
              <div>
                <label htmlFor="org-email" className={labelClassName}>Contact e-mail *</label>
                <input
                  id="org-email"
                  type="email"
                  value={organisation.contact_email}
                  onChange={handleOrganisationChange('contact_email')}
                  required
                  className={inputClassName}
                />
              </div>
            </section>

            <section className="space-y-4 border-t border-gray-200 dark:border-gray-700 pt-8">
              <div className="flex items-center gap-2 mb-4">
                <UserPlus className="text-indigo-600 dark:text-indigo-400" size={20} />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Eerste beheerder</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="admin-first-name" className={labelClassName}>Voornaam *</label>
                  <input
                    id="admin-first-name"
                    value={admin.first_name}
                    onChange={handleAdminChange('first_name')}
                    required
                    className={inputClassName}
                  />
                </div>
                <div>
                  <label htmlFor="admin-last-name" className={labelClassName}>Achternaam *</label>
                  <input
                    id="admin-last-name"
                    value={admin.last_name}
                    onChange={handleAdminChange('last_name')}
                    required
                    className={inputClassName}
                  />
                </div>
              </div>
              <div>
                <label htmlFor="admin-email" className={labelClassName}>E-mailadres *</label>
                <input
                  id="admin-email"
                  type="email"
                  value={admin.email}
                  onChange={handleAdminChange('email')}
                  required
                  className={inputClassName}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="admin-password" className={labelClassName}>Wachtwoord *</label>
                  <input
                    id="admin-password"
                    type="password"
                    value={admin.password}
                    onChange={handleAdminChange('password')}
                    required
                    minLength={8}
                    className={inputClassName}
                  />
                </div>
                <div>
                  <label htmlFor="admin-password-confirm" className={labelClassName}>Bevestig wachtwoord *</label>
                  <input
                    id="admin-password-confirm"
                    type="password"
                    value={admin.password_confirmation}
                    onChange={handleAdminChange('password_confirmation')}
                    required
                    minLength={8}
                    className={inputClassName}
                  />
                </div>
              </div>
            </section>

            <div className="flex items-center gap-2">
              <input
                id="accept-terms"
                type="checkbox"
                checked={acceptTerms}
                onChange={(event) => setAcceptTerms(event.target.checked)}
                required
                className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="accept-terms" className="text-sm text-gray-700 dark:text-gray-300">
                Ik ga akkoord met de voorwaarden
              </label>
            </div>

            <Button type="submit" disabled={isSubmitting} className="w-full" size="lg">
              {isSubmitting ? 'Bezig...' : 'Registreren'}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  )
}

export default RegisterOrganisationPage

