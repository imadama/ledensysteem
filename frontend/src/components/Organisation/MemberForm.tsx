import { useEffect, useState } from 'react'

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

  return (
    <form onSubmit={handleSubmit} className="form">
      {generalError && <div className="alert alert--error">{generalError}</div>}

      <div className="form-grid">
        <div className="form-group">
          <label htmlFor="member_number">Lidnummer</label>
          <input
            id="member_number"
            type="text"
            value={values.member_number}
            onChange={handleChange('member_number')}
            className={errors.member_number ? 'input input--error' : 'input'}
          />
          {errors.member_number && <span className="form-error">{errors.member_number}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="first_name">
            Voornaam <span className="required">*</span>
          </label>
          <input
            id="first_name"
            required
            type="text"
            value={values.first_name}
            onChange={handleChange('first_name')}
            className={errors.first_name ? 'input input--error' : 'input'}
          />
          {errors.first_name && <span className="form-error">{errors.first_name}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="last_name">
            Achternaam <span className="required">*</span>
          </label>
          <input
            id="last_name"
            required
            type="text"
            value={values.last_name}
            onChange={handleChange('last_name')}
            className={errors.last_name ? 'input input--error' : 'input'}
          />
          {errors.last_name && <span className="form-error">{errors.last_name}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="gender">
            Geslacht <span className="required">*</span>
          </label>
          <select
            id="gender"
            required
            value={values.gender}
            onChange={handleChange('gender')}
            className={errors.gender ? 'input input--error' : 'input'}
          >
            <option value="m">Man</option>
            <option value="f">Vrouw</option>
          </select>
          {errors.gender && <span className="form-error">{errors.gender}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="birth_date">Geboortedatum</label>
          <input
            id="birth_date"
            type="date"
            value={values.birth_date}
            onChange={handleChange('birth_date')}
            className={errors.birth_date ? 'input input--error' : 'input'}
          />
          {errors.birth_date && <span className="form-error">{errors.birth_date}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="email">E-mail</label>
          <input
            id="email"
            type="email"
            value={values.email}
            onChange={handleChange('email')}
            className={errors.email ? 'input input--error' : 'input'}
          />
          {errors.email && <span className="form-error">{errors.email}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="phone">Telefoonnummer</label>
          <input
            id="phone"
            type="text"
            value={values.phone}
            onChange={handleChange('phone')}
            className={errors.phone ? 'input input--error' : 'input'}
          />
          {errors.phone && <span className="form-error">{errors.phone}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="street_address">Adres</label>
          <input
            id="street_address"
            type="text"
            value={values.street_address}
            onChange={handleChange('street_address')}
            className={errors.street_address ? 'input input--error' : 'input'}
          />
          {errors.street_address && <span className="form-error">{errors.street_address}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="postal_code">Postcode</label>
          <input
            id="postal_code"
            type="text"
            value={values.postal_code}
            onChange={handleChange('postal_code')}
            className={errors.postal_code ? 'input input--error' : 'input'}
          />
          {errors.postal_code && <span className="form-error">{errors.postal_code}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="city">Plaats</label>
          <input
            id="city"
            type="text"
            value={values.city}
            onChange={handleChange('city')}
            className={errors.city ? 'input input--error' : 'input'}
          />
          {errors.city && <span className="form-error">{errors.city}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="iban">IBAN</label>
          <input
            id="iban"
            type="text"
            value={values.iban}
            onChange={handleChange('iban')}
            className={errors.iban ? 'input input--error' : 'input'}
          />
          {errors.iban && <span className="form-error">{errors.iban}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="contribution_amount">Contributiebedrag</label>
          <input
            id="contribution_amount"
            type="number"
            step="0.01"
            value={values.contribution_amount}
            onChange={handleChange('contribution_amount')}
            className={errors.contribution_amount ? 'input input--error' : 'input'}
          />
          {errors.contribution_amount && <span className="form-error">{errors.contribution_amount}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="contribution_frequency">Contributiefrequentie</label>
          <select
            id="contribution_frequency"
            value={values.contribution_frequency}
            onChange={handleChange('contribution_frequency')}
            className={errors.contribution_frequency ? 'input input--error' : 'input'}
          >
            {defaultFrequencyOption.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {errors.contribution_frequency && <span className="form-error">{errors.contribution_frequency}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="contribution_start_date">Startdatum contributie</label>
          <input
            id="contribution_start_date"
            type="date"
            value={values.contribution_start_date}
            onChange={handleChange('contribution_start_date')}
            className={errors.contribution_start_date ? 'input input--error' : 'input'}
          />
          {errors.contribution_start_date && <span className="form-error">{errors.contribution_start_date}</span>}
        </div>

        <div className="form-group form-group--full">
          <label htmlFor="contribution_note">Opmerking contributie</label>
          <textarea
            id="contribution_note"
            rows={4}
            value={values.contribution_note}
            onChange={handleChange('contribution_note')}
            className={errors.contribution_note ? 'textarea textarea--error' : 'textarea'}
          />
          {errors.contribution_note && <span className="form-error">{errors.contribution_note}</span>}
        </div>
      </div>

      <button type="submit" className="button" disabled={isSubmitting}>
        {isSubmitting ? 'Bezig...' : submitLabel}
      </button>
    </form>
  )
}

export default MemberForm

