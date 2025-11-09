import { type FormEvent, useState } from 'react'
import { apiClient } from '../api/axios'

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

  return (
    <div className="card">
      <h1>Nieuwe organisatie registreren</h1>
      <p>Vul zowel de gegevens van de organisatie als van de eerste beheerder in.</p>

      {message && <div className="alert alert--success">{message}</div>}
      {error && <div className="alert alert--error">{error}</div>}

      <form className="form" onSubmit={handleSubmit}>
        <section>
          <h2>Organisatie</h2>
          <div className="form__group">
            <label htmlFor="org-name">Naam *</label>
            <input
              id="org-name"
              value={organisation.name}
              onChange={handleOrganisationChange('name')}
              required
            />
          </div>
          <div className="form__group">
            <label htmlFor="org-type">Type *</label>
            <select
              id="org-type"
              value={organisation.type}
              onChange={handleOrganisationChange('type')}
              required
            >
              <option value="">Selecteer...</option>
              <option value="moskee">Moskee</option>
              <option value="stichting">Stichting</option>
              <option value="vereniging">Vereniging</option>
            </select>
          </div>
          <div className="form__group">
            <label htmlFor="org-city">Stad</label>
            <input id="org-city" value={organisation.city} onChange={handleOrganisationChange('city')} />
          </div>
          <div className="form__group">
            <label htmlFor="org-country">Land</label>
            <input
              id="org-country"
              value={organisation.country}
              onChange={handleOrganisationChange('country')}
            />
          </div>
          <div className="form__group">
            <label htmlFor="org-email">Contact e-mail *</label>
            <input
              id="org-email"
              type="email"
              value={organisation.contact_email}
              onChange={handleOrganisationChange('contact_email')}
              required
            />
          </div>
        </section>

        <section>
          <h2>Eerste beheerder</h2>
          <div className="form__group">
            <label htmlFor="admin-first-name">Voornaam *</label>
            <input
              id="admin-first-name"
              value={admin.first_name}
              onChange={handleAdminChange('first_name')}
              required
            />
          </div>
          <div className="form__group">
            <label htmlFor="admin-last-name">Achternaam *</label>
            <input
              id="admin-last-name"
              value={admin.last_name}
              onChange={handleAdminChange('last_name')}
              required
            />
          </div>
          <div className="form__group">
            <label htmlFor="admin-email">E-mailadres *</label>
            <input
              id="admin-email"
              type="email"
              value={admin.email}
              onChange={handleAdminChange('email')}
              required
            />
          </div>
          <div className="form__group">
            <label htmlFor="admin-password">Wachtwoord *</label>
            <input
              id="admin-password"
              type="password"
              value={admin.password}
              onChange={handleAdminChange('password')}
              required
              minLength={8}
            />
          </div>
          <div className="form__group">
            <label htmlFor="admin-password-confirm">Bevestig wachtwoord *</label>
            <input
              id="admin-password-confirm"
              type="password"
              value={admin.password_confirmation}
              onChange={handleAdminChange('password_confirmation')}
              required
              minLength={8}
            />
          </div>
        </section>

        <div className="form__group" style={{ flexDirection: 'row', alignItems: 'center' }}>
          <input
            id="accept-terms"
            type="checkbox"
            checked={acceptTerms}
            onChange={(event) => setAcceptTerms(event.target.checked)}
            required
          />
          <label htmlFor="accept-terms">Ik ga akkoord met de voorwaarden</label>
        </div>

        <button className="button" type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Bezig...' : 'Registreren'}
        </button>
      </form>
    </div>
  )
}

export default RegisterOrganisationPage

