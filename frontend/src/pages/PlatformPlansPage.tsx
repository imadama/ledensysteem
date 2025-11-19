import { useCallback, useEffect, useMemo, useState } from 'react'
import { apiClient } from '../api/axios'

export type Plan = {
  id: number
  name: string
  stripe_price_id: string
  monthly_price: number
  currency: string
  description: string | null
  is_active: boolean
}

const emptyPlan: Omit<Plan, 'id'> = {
  name: '',
  stripe_price_id: '',
  monthly_price: 0,
  currency: 'EUR',
  description: '',
  is_active: true,
}

const PlatformPlansPage: React.FC = () => {
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null)
  const [form, setForm] = useState<Omit<Plan, 'id'>>(emptyPlan)
  const [saving, setSaving] = useState(false)

  const loadPlans = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data } = await apiClient.get<{ data: Plan[] }>('/api/platform/plans')
      setPlans(data.data)
    } catch (err: any) {
      console.error('Plannen laden mislukt', err)
      setError(err.response?.data?.message ?? 'Kon plannen niet laden.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadPlans()
  }, [loadPlans])

  const handleEdit = (plan: Plan) => {
    setEditingPlan(plan)
    setForm({
      name: plan.name,
      stripe_price_id: plan.stripe_price_id,
      monthly_price: plan.monthly_price,
      currency: plan.currency,
      description: plan.description,
      is_active: plan.is_active,
    })
  }

  const handleNew = () => {
    setEditingPlan(null)
    setForm(emptyPlan)
  }

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const target = event.target as HTMLInputElement | HTMLTextAreaElement
    const { name, value } = target

    if (target instanceof HTMLInputElement && target.type === 'checkbox') {
      const checked = target.checked
      setForm((prev) => ({
        ...prev,
        [name]: checked,
      }))
      return
    }

    setForm((prev) => ({
      ...prev,
      [name]: name === 'monthly_price' ? Number(value) || 0 : value,
    }))
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const payload = {
        ...form,
        currency: form.currency.toUpperCase(),
      }

      if (editingPlan) {
        const { data } = await apiClient.put<Plan>(`/api/platform/plans/${editingPlan.id}`, payload)
        setPlans((prev) => prev.map((plan) => (plan.id === editingPlan.id ? data : plan)))
      } else {
        const { data } = await apiClient.post<Plan>('/api/platform/plans', payload)
        setPlans((prev) => [...prev, data])
      }

      setEditingPlan(null)
      setForm(emptyPlan)
    } catch (err: any) {
      console.error('Plan opslaan mislukt', err)
      const msg =
        err.response?.data?.message ??
        (err.response?.status === 422 ? 'Controleer de invoer van het formulier.' : 'Kon plan niet opslaan.')
      setError(msg)
    } finally {
      setSaving(false)
    }
  }

  const sortedPlans = useMemo(
    () => plans.slice().sort((a, b) => a.monthly_price - b.monthly_price || a.name.localeCompare(b.name)),
    [plans],
  )

  return (
    <div>
      <div className="page-header">
        <h1>Abonnementen (plannen)</h1>
      </div>

      {error && <div className="alert alert--error">{error}</div>}

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h2>{editingPlan ? 'Plan bewerken' : 'Nieuw plan'}</h2>
        <form className="form" onSubmit={handleSubmit}>
          <div className="form__group">
            <label htmlFor="plan-name">Naam</label>
            <input
              id="plan-name"
              name="name"
              value={form.name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-row">
            <div className="form__group">
              <label htmlFor="plan-price">Maandbedrag</label>
              <input
                id="plan-price"
                name="monthly_price"
                type="number"
                step="0.01"
                min="0"
                value={form.monthly_price}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form__group">
              <label htmlFor="plan-currency">Valuta</label>
              <input
                id="plan-currency"
                name="currency"
                value={form.currency}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form__group">
            <label htmlFor="plan-stripe-price">Stripe prijs-ID</label>
            <input
              id="plan-stripe-price"
              name="stripe_price_id"
              value={form.stripe_price_id}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form__group">
            <label htmlFor="plan-description">Omschrijving</label>
            <textarea
              id="plan-description"
              name="description"
              value={form.description ?? ''}
              onChange={handleChange}
            />
          </div>

          <div className="form__group">
            <label>
              <input
                type="checkbox"
                name="is_active"
                checked={form.is_active}
                onChange={handleChange}
              />{' '}
              Plan is actief
            </label>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button type="submit" className="button" disabled={saving}>
              {saving ? 'Bezig...' : 'Opslaan'}
            </button>
            {editingPlan && (
              <button
                type="button"
                className="button button--secondary"
                onClick={handleNew}
                disabled={saving}
              >
                Nieuw plan
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="card">
        <h2>Bestaande plannen</h2>
        {loading ? (
          <p>Plannen worden geladen...</p>
        ) : sortedPlans.length === 0 ? (
          <p>Er zijn nog geen plannen aangemaakt.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Naam</th>
                  <th>Prijs</th>
                  <th>Stripe prijs-ID</th>
                  <th>Actief</th>
                  <th>Acties</th>
                </tr>
              </thead>
              <tbody>
                {sortedPlans.map((plan) => (
                  <tr key={plan.id}>
                    <td>{plan.name}</td>
                    <td>
                      € {plan.monthly_price.toLocaleString('nl-NL', { minimumFractionDigits: 2 })}{' '}
                      {plan.currency}
                    </td>
                    <td>{plan.stripe_price_id}</td>
                    <td>
                      <span className={`badge ${plan.is_active ? 'badge--success' : 'badge--secondary'}`}>
                        {plan.is_active ? 'Actief' : 'Inactief'}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="button button--secondary"
                        onClick={() => handleEdit(plan)}
                      >
                        Bewerken
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default PlatformPlansPage
