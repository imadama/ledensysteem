import React, { useState } from 'react'
import { Building2, UserPlus } from 'lucide-react'
import { Button } from '../ui/Button'

export type OrganisationFormData = {
  name: string
  type: string
  city: string
  country: string
  contact_email: string
}

export type AdminFormData = {
  first_name: string
  last_name: string
  email: string
  password: string
  password_confirmation: string
}

interface OrganisationFormProps {
  onSubmit: (data: { organisation: OrganisationFormData; admin: AdminFormData }) => Promise<void>
  initialData?: Partial<OrganisationFormData>
  isSubmitting?: boolean
  showTerms?: boolean
  submitLabel?: string
}

export const OrganisationForm: React.FC<OrganisationFormProps> = ({
  onSubmit,
  initialData,
  isSubmitting = false,
  showTerms = true,
  submitLabel = 'Registreren'
}) => {
  const [organisation, setOrganisation] = useState<OrganisationFormData>({
    name: initialData?.name || '',
    type: initialData?.type || '',
    city: initialData?.city || '',
    country: initialData?.country || '',
    contact_email: initialData?.contact_email || '',
  })

  const [admin, setAdmin] = useState<AdminFormData>({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    password_confirmation: '',
  })

  const [acceptTerms, setAcceptTerms] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)

  const handleOrganisationChange = (field: keyof OrganisationFormData) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setOrganisation((prev) => ({ ...prev, [field]: event.target.value }))
    }

  const handleAdminChange = (field: keyof AdminFormData) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setAdmin((prev) => ({ ...prev, [field]: event.target.value }))
    }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setValidationError(null)

    if (showTerms && !acceptTerms) {
      setValidationError('Je moet akkoord gaan met de voorwaarden.')
      return
    }

    if (admin.password !== admin.password_confirmation) {
        setValidationError('Wachtwoorden komen niet overeen.')
        return
    }

    await onSubmit({ organisation, admin })
  }

  const inputClassName = "w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-aidatim-blue"
  const labelClassName = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"

  return (
    <form className="space-y-8" onSubmit={handleSubmit} noValidate>
      {validationError && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-400 px-4 py-3 rounded-lg mb-4">
          {validationError}
        </div>
      )}

      <section className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Building2 className="text-aidatim-blue dark:text-aidatim-blue" size={20} />
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
          <UserPlus className="text-aidatim-blue dark:text-aidatim-blue" size={20} />
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

      {showTerms && (
        <div className="flex items-center gap-2">
          <input
            id="accept-terms"
            type="checkbox"
            checked={acceptTerms}
            onChange={(event) => setAcceptTerms(event.target.checked)}
            required
            className="w-4 h-4 rounded border-gray-300 text-aidatim-blue focus:ring-aidatim-blue"
          />
          <label htmlFor="accept-terms" className="text-sm text-gray-700 dark:text-gray-300">
            Ik ga akkoord met de voorwaarden
          </label>
        </div>
      )}

      <Button type="submit" disabled={isSubmitting} className="w-full" size="lg">
        {isSubmitting ? 'Bezig...' : submitLabel}
      </Button>
    </form>
  )
}
