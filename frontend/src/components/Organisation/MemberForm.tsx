import { useEffect, useState } from 'react'
import { Button } from '../ui/Button'

export type MemberFormValues = {
  member_number: string
  first_name: string
  last_name: string
  gender: 'm' | 'f'
  birth_date: string
  email: string
  phone: string
  street_address: string
  postal_code: string
  city: string
  iban: string
  contribution_amount: string
  contribution_frequency: 'monthly' | 'yearly' | 'none'
  contribution_start_date: string
  contribution_note: string
  status?: 'active' | 'inactive'
}

export type MemberFormErrors = Partial<Record<keyof MemberFormValues, string>>

type MemberFormProps = {
  initialValues: MemberFormValues
  onSubmit: (values: MemberFormValues) => Promise<void> | void
  errors: MemberFormErrors
  generalError?: string | null
  isSubmitting: boolean
  submitLabel: string
}

const defaultFrequencyOption = [
  { value: 'none', label: 'Geen' },
  { value: 'monthly', label: 'Maandelijks' },
  { value: 'yearly', label: 'Jaarlijks' },
]

const MemberForm: React.FC<MemberFormProps> = ({
  initialValues,
  onSubmit,
  errors,
  generalError,
  isSubmitting,
  submitLabel,
}) => {
  const [values, setValues] = useState<MemberFormValues>(initialValues)

  useEffect(() => {
    setValues(initialValues)
  }, [initialValues])

  const handleChange = (field: keyof MemberFormValues) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setValues((prev) => ({
      ...prev,
      [field]: event.target.value,
    }))
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await onSubmit(values)
  }

  const inputClassName = (hasError: boolean) =>
    `w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-aidatim-blue transition-colors ${
      hasError
        ? 'border-red-300 dark:border-red-600 focus:ring-red-500'
        : 'border-gray-300 dark:border-gray-600'
    }`

  const labelClassName = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {generalError && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-400 px-4 py-3 rounded-lg">
          {generalError}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="member_number" className={labelClassName}>
            Lidnummer
          </label>
          <input
            id="member_number"
            type="text"
            value={values.member_number}
            onChange={handleChange('member_number')}
            className={inputClassName(!!errors.member_number)}
          />
          {errors.member_number && (
            <span className="mt-1 text-sm text-red-600 dark:text-red-400 block">{errors.member_number}</span>
          )}
        </div>

        <div>
          <label htmlFor="first_name" className={labelClassName}>
            Voornaam <span className="text-red-500">*</span>
          </label>
          <input
            id="first_name"
            required
            type="text"
            value={values.first_name}
            onChange={handleChange('first_name')}
            className={inputClassName(!!errors.first_name)}
          />
          {errors.first_name && (
            <span className="mt-1 text-sm text-red-600 dark:text-red-400 block">{errors.first_name}</span>
          )}
        </div>

        <div>
          <label htmlFor="last_name" className={labelClassName}>
            Achternaam <span className="text-red-500">*</span>
          </label>
          <input
            id="last_name"
            required
            type="text"
            value={values.last_name}
            onChange={handleChange('last_name')}
            className={inputClassName(!!errors.last_name)}
          />
          {errors.last_name && (
            <span className="mt-1 text-sm text-red-600 dark:text-red-400 block">{errors.last_name}</span>
          )}
        </div>

        <div>
          <label htmlFor="gender" className={labelClassName}>
            Geslacht <span className="text-red-500">*</span>
          </label>
          <select
            id="gender"
            required
            value={values.gender}
            onChange={handleChange('gender')}
            className={inputClassName(!!errors.gender)}
          >
            <option value="m">Man</option>
            <option value="f">Vrouw</option>
          </select>
          {errors.gender && (
            <span className="mt-1 text-sm text-red-600 dark:text-red-400 block">{errors.gender}</span>
          )}
        </div>

        <div>
          <label htmlFor="birth_date" className={labelClassName}>
            Geboortedatum
          </label>
          <input
            id="birth_date"
            type="date"
            value={values.birth_date}
            onChange={handleChange('birth_date')}
            className={inputClassName(!!errors.birth_date)}
          />
          {errors.birth_date && (
            <span className="mt-1 text-sm text-red-600 dark:text-red-400 block">{errors.birth_date}</span>
          )}
        </div>

        <div>
          <label htmlFor="email" className={labelClassName}>
            E-mail
          </label>
          <input
            id="email"
            type="email"
            value={values.email}
            onChange={handleChange('email')}
            className={inputClassName(!!errors.email)}
          />
          {errors.email && (
            <span className="mt-1 text-sm text-red-600 dark:text-red-400 block">{errors.email}</span>
          )}
        </div>

        <div>
          <label htmlFor="phone" className={labelClassName}>
            Telefoonnummer
          </label>
          <input
            id="phone"
            type="text"
            value={values.phone}
            onChange={handleChange('phone')}
            className={inputClassName(!!errors.phone)}
          />
          {errors.phone && (
            <span className="mt-1 text-sm text-red-600 dark:text-red-400 block">{errors.phone}</span>
          )}
        </div>

        <div className="md:col-span-2">
          <label htmlFor="street_address" className={labelClassName}>
            Adres
          </label>
          <input
            id="street_address"
            type="text"
            value={values.street_address}
            onChange={handleChange('street_address')}
            className={inputClassName(!!errors.street_address)}
          />
          {errors.street_address && (
            <span className="mt-1 text-sm text-red-600 dark:text-red-400 block">{errors.street_address}</span>
          )}
        </div>

        <div>
          <label htmlFor="postal_code" className={labelClassName}>
            Postcode
          </label>
          <input
            id="postal_code"
            type="text"
            value={values.postal_code}
            onChange={handleChange('postal_code')}
            className={inputClassName(!!errors.postal_code)}
          />
          {errors.postal_code && (
            <span className="mt-1 text-sm text-red-600 dark:text-red-400 block">{errors.postal_code}</span>
          )}
        </div>

        <div>
          <label htmlFor="city" className={labelClassName}>
            Plaats
          </label>
          <input
            id="city"
            type="text"
            value={values.city}
            onChange={handleChange('city')}
            className={inputClassName(!!errors.city)}
          />
          {errors.city && (
            <span className="mt-1 text-sm text-red-600 dark:text-red-400 block">{errors.city}</span>
          )}
        </div>

        <div>
          <label htmlFor="iban" className={labelClassName}>
            IBAN
          </label>
          <input
            id="iban"
            type="text"
            value={values.iban}
            onChange={handleChange('iban')}
            className={inputClassName(!!errors.iban)}
          />
          {errors.iban && (
            <span className="mt-1 text-sm text-red-600 dark:text-red-400 block">{errors.iban}</span>
          )}
        </div>

        <div>
          <label htmlFor="contribution_amount" className={labelClassName}>
            Contributiebedrag
          </label>
          <input
            id="contribution_amount"
            type="number"
            step="0.01"
            value={values.contribution_amount}
            onChange={handleChange('contribution_amount')}
            className={inputClassName(!!errors.contribution_amount)}
          />
          {errors.contribution_amount && (
            <span className="mt-1 text-sm text-red-600 dark:text-red-400 block">{errors.contribution_amount}</span>
          )}
        </div>

        <div>
          <label htmlFor="contribution_frequency" className={labelClassName}>
            Contributiefrequentie
          </label>
          <select
            id="contribution_frequency"
            value={values.contribution_frequency}
            onChange={handleChange('contribution_frequency')}
            className={inputClassName(!!errors.contribution_frequency)}
          >
            {defaultFrequencyOption.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {errors.contribution_frequency && (
            <span className="mt-1 text-sm text-red-600 dark:text-red-400 block">{errors.contribution_frequency}</span>
          )}
        </div>

        <div>
          <label htmlFor="contribution_start_date" className={labelClassName}>
            Startdatum contributie
          </label>
          <input
            id="contribution_start_date"
            type="date"
            value={values.contribution_start_date}
            onChange={handleChange('contribution_start_date')}
            className={inputClassName(!!errors.contribution_start_date)}
          />
          {errors.contribution_start_date && (
            <span className="mt-1 text-sm text-red-600 dark:text-red-400 block">{errors.contribution_start_date}</span>
          )}
        </div>

        <div className="md:col-span-2">
          <label htmlFor="contribution_note" className={labelClassName}>
            Opmerking contributie
          </label>
          <textarea
            id="contribution_note"
            rows={4}
            value={values.contribution_note}
            onChange={handleChange('contribution_note')}
            className={inputClassName(!!errors.contribution_note)}
          />
          {errors.contribution_note && (
            <span className="mt-1 text-sm text-red-600 dark:text-red-400 block">{errors.contribution_note}</span>
          )}
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Bezig...' : submitLabel}
        </Button>
      </div>
    </form>
  )
}

export default MemberForm

