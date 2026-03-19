import { type FormEvent, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { apiClient } from '../api/axios'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'

type OrganisationProfile = {
  name: string
  type: string
  city: string
  country: string
  contact_email: string
  pass_stripe_fee_to_member: boolean
}

type FieldErrors = Partial<Record<keyof OrganisationProfile, string[]>>

const OrganisationProfilePage: React.FC = () => {
  const [form, setForm] = useState<OrganisationProfile>({
    name: '',
    type: '',
    city: '',
    country: 'Nederland',
    contact_email: '',
    pass_stripe_fee_to_member: false,
  })
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true)
      setError(null)
      try {
        const { data } = await apiClient.get<OrganisationProfile>('/api/organisation/profile')
        setForm({
          name: data.name ?? '',
          type: data.type ?? '',
          city: data.city ?? '',
          country: data.country ?? 'Nederland',
          contact_email: data.contact_email ?? '',
          pass_stripe_fee_to_member: data.pass_stripe_fee_to_member ?? false,
        })
      } catch (err) {
        console.error(err)
        setError('Profiel kon niet worden geladen.')
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [])

  const handleChange = (field: keyof OrganisationProfile) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }))
    setFieldErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  const handleToggle = (field: keyof OrganisationProfile) => () => {
    setForm((prev) => ({ ...prev, [field]: !prev[field] }))
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setIsSubmitting(true)
    setError(null)
    setFieldErrors({})
    try {
      await apiClient.put('/api/organisation/profile', form)
      toast.success('Profiel opgeslagen.')
    } catch (err: unknown) {
      console.error(err)
      const response = (err as { response?: { data?: { errors?: FieldErrors; message?: string } } })?.response?.data
      if (response?.errors) {
        setFieldErrors(response.errors)
      } else {
        setError(response?.message ?? 'Opslaan mislukt. Probeer het opnieuw.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const inputClass =
    'w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-aidatim-blue'

  if (loading) {
    return (
      <div className="text-center py-8 text-gray-600 dark:text-gray-400">Bezig met laden...</div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Organisatieprofiel</h2>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Bekijk en bewerk de profielgegevens van je organisatie</p>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-400 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <Card className="p-6">
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="profile-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Naam <span className="text-red-500">*</span>
            </label>
            <input
              id="profile-name"
              type="text"
              value={form.name}
              onChange={handleChange('name')}
              required
              className={inputClass}
            />
            {fieldErrors.name && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{fieldErrors.name.join(' ')}</p>
            )}
          </div>

          <div>
            <label htmlFor="profile-type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Type
            </label>
            <input
              id="profile-type"
              type="text"
              value={form.type}
              onChange={handleChange('type')}
              placeholder="bijv. Sportvereniging, Stichting"
              className={inputClass}
            />
            {fieldErrors.type && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{fieldErrors.type.join(' ')}</p>
            )}
          </div>

          <div>
            <label htmlFor="profile-city" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Stad
            </label>
            <input
              id="profile-city"
              type="text"
              value={form.city}
              onChange={handleChange('city')}
              className={inputClass}
            />
            {fieldErrors.city && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{fieldErrors.city.join(' ')}</p>
            )}
          </div>

          <div>
            <label htmlFor="profile-country" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Land
            </label>
            <input
              id="profile-country"
              type="text"
              value={form.country}
              onChange={handleChange('country')}
              className={inputClass}
            />
            {fieldErrors.country && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{fieldErrors.country.join(' ')}</p>
            )}
          </div>

          <div>
            <label htmlFor="profile-contact-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Contacte-mail
            </label>
            <input
              id="profile-contact-email"
              type="email"
              value={form.contact_email}
              onChange={handleChange('contact_email')}
              className={inputClass}
            />
            {fieldErrors.contact_email && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{fieldErrors.contact_email.join(' ')}</p>
            )}
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-5">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Betaalinstellingen</h3>
            <label className="flex items-start gap-3 cursor-pointer" htmlFor="pass-stripe-fee">
              <div className="relative mt-0.5">
                <input
                  id="pass-stripe-fee"
                  type="checkbox"
                  className="sr-only"
                  checked={form.pass_stripe_fee_to_member}
                  onChange={handleToggle('pass_stripe_fee_to_member')}
                />
                <div
                  className={`w-10 h-6 rounded-full transition-colors ${form.pass_stripe_fee_to_member ? 'bg-aidatim-blue' : 'bg-gray-300 dark:bg-gray-600'}`}
                />
                <div
                  className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.pass_stripe_fee_to_member ? 'translate-x-4' : 'translate-x-0'}`}
                />
              </div>
              <div>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  Stripe transactiekosten doorberekenen aan leden
                </span>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Stripe rekent 0,35% + €0,25 per incasso. Als dit aan staat, wordt het contributiebedrag verhoogd zodat de organisatie het volledige bedrag ontvangt.
                </p>
              </div>
            </label>
          </div>

          <div className="pt-2">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Opslaan...' : 'Opslaan'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}

export default OrganisationProfilePage
