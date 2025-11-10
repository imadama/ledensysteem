import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { useMemberAuth } from '../../context/MemberAuthContext'
import { apiClient } from '../../api/axios'

const MemberProfilePage: React.FC = () => {
  const { memberUser, isLoading, loadCurrentMember } = useMemberAuth()
  const [form, setForm] = useState({
    email: '',
    street_address: '',
    postal_code: '',
    city: '',
    phone: '',
    iban: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (!memberUser) {
      return
    }

    setForm({
      email: memberUser.user.email ?? '',
      street_address: memberUser.member.street_address ?? '',
      postal_code: memberUser.member.postal_code ?? '',
      city: memberUser.member.city ?? '',
      phone: memberUser.member.phone ?? '',
      iban: memberUser.member.iban ?? '',
    })
  }, [memberUser])

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  useEffect(() => {
    if (!memberUser) {
      void loadCurrentMember()
    }
  }, [loadCurrentMember, memberUser])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const payload = {
        email: form.email,
        street_address: form.street_address,
        postal_code: form.postal_code,
        city: form.city,
        phone: form.phone,
        iban: form.iban,
      }

      await apiClient.put('/api/member/profile', payload)
      await loadCurrentMember()
      setSuccess('Je gegevens zijn bijgewerkt.')
    } catch (err: any) {
      console.error('Bijwerken mislukt', err)
      if (err.response?.status === 422) {
        const messages = Object.values(err.response?.data?.errors ?? {})
          .flat()
          .join(' ')
        setError(messages || 'Validatiefout.')
      } else {
        setError(err.response?.data?.message ?? 'Bijwerken mislukt. Probeer het later opnieuw.')
      }
    } finally {
      setSaving(false)
    }
  }

  const readOnlyInfo = useMemo(() => {
    if (!memberUser) {
      return null
    }

    const { first_name, last_name, birth_date } = memberUser.member

    return [
      { label: 'Naam', value: `${first_name} ${last_name}`.trim() || 'Onbekend' },
      { label: 'Geboortedatum', value: birth_date ?? 'Onbekend' },
    ]
  }, [memberUser])

  if (isLoading && !memberUser) {
    return <div className="card">Bezig met laden...</div>
  }

  if (!memberUser) {
    return (
      <div className="card">
        <h1>Mijn gegevens</h1>
        <p>De gegevens konden niet worden geladen. Probeer het later opnieuw.</p>
      </div>
    )
  }

  const member = memberUser.member

  return (
    <div className="card">
      <h1>Mijn gegevens</h1>
      <p>
        Pas je contactgegevens aan. Naam en geboortedatum worden beheerd door de organisatie en zijn alleen-lezen.
      </p>

      {readOnlyInfo && (
        <div className="card card--subtle">
          <div className="info-grid">
            {readOnlyInfo.map((item) => (
              <div key={item.label}>
                <strong>{item.label}</strong>
                <div>{item.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && <div className="alert alert--error">{error}</div>}
      {success && <div className="alert alert--success">{success}</div>}

      <form className="form" onSubmit={handleSubmit}>
        <div className="form__group">
          <label htmlFor="member-email">E-mailadres</label>
          <input
            id="member-email"
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            required
          />
        </div>
        <div className="form__group">
          <label htmlFor="member-street">Straat en huisnummer</label>
          <input
            id="member-street"
            name="street_address"
            value={form.street_address}
            onChange={handleChange}
          />
        </div>
        <div className="form-row">
          <div className="form__group">
            <label htmlFor="member-postal">Postcode</label>
            <input
              id="member-postal"
              name="postal_code"
              value={form.postal_code}
              onChange={handleChange}
            />
          </div>
          <div className="form__group">
            <label htmlFor="member-city">Plaats</label>
            <input
              id="member-city"
              name="city"
              value={form.city}
              onChange={handleChange}
            />
          </div>
        </div>
        <div className="form-row">
          <div className="form__group">
            <label htmlFor="member-phone">Telefoonnummer</label>
            <input
              id="member-phone"
              name="phone"
              value={form.phone}
              onChange={handleChange}
            />
          </div>
          <div className="form__group">
            <label htmlFor="member-iban">IBAN</label>
            <input
              id="member-iban"
              name="iban"
              value={form.iban}
              onChange={handleChange}
            />
          </div>
        </div>
        <button className="button" type="submit" disabled={saving}>
          {saving ? 'Bezig...' : 'Opslaan'}
        </button>
      </form>
    </div>
  )
}

export default MemberProfilePage


