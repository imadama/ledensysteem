import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { Save } from 'lucide-react'
import { useMemberAuth } from '../../context/MemberAuthContext'
import { apiClient } from '../../api/axios'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'

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

  const inputClassName = "w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
  const labelClassName = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"

  if (isLoading && !memberUser) {
    return (
      <div className="text-center py-8 text-gray-600 dark:text-gray-400">Bezig met laden...</div>
    )
  }

  if (!memberUser) {
    return (
      <Card className="p-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Mijn gegevens</h2>
        <p className="text-gray-600 dark:text-gray-400 mt-2">De gegevens konden niet worden geladen. Probeer het later opnieuw.</p>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Mijn gegevens</h2>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Pas je contactgegevens aan. Naam en geboortedatum worden beheerd door de organisatie en zijn alleen-lezen.
        </p>
      </div>

      {readOnlyInfo && (
        <Card className="p-6 bg-gray-50 dark:bg-gray-800/50">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {readOnlyInfo.map((item) => (
              <div key={item.label}>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{item.label}</p>
                <p className="text-gray-900 dark:text-white">{item.value}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-400 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-400 px-4 py-3 rounded-lg">
          {success}
        </div>
      )}

      <Card className="p-6">
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="member-email" className={labelClassName}>E-mailadres</label>
            <input
              id="member-email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              required
              className={inputClassName}
            />
          </div>
          <div>
            <label htmlFor="member-street" className={labelClassName}>Straat en huisnummer</label>
            <input
              id="member-street"
              name="street_address"
              value={form.street_address}
              onChange={handleChange}
              className={inputClassName}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="member-postal" className={labelClassName}>Postcode</label>
              <input
                id="member-postal"
                name="postal_code"
                value={form.postal_code}
                onChange={handleChange}
                className={inputClassName}
              />
            </div>
            <div>
              <label htmlFor="member-city" className={labelClassName}>Plaats</label>
              <input
                id="member-city"
                name="city"
                value={form.city}
                onChange={handleChange}
                className={inputClassName}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="member-phone" className={labelClassName}>Telefoonnummer</label>
              <input
                id="member-phone"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                className={inputClassName}
              />
            </div>
            <div>
              <label htmlFor="member-iban" className={labelClassName}>IBAN</label>
              <input
                id="member-iban"
                name="iban"
                value={form.iban}
                onChange={handleChange}
                className={inputClassName}
              />
            </div>
          </div>
          <Button type="submit" disabled={saving}>
            <Save size={16} />
            {saving ? 'Bezig...' : 'Opslaan'}
          </Button>
        </form>
      </Card>
    </div>
  )
}

export default MemberProfilePage


