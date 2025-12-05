import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus, Edit, Save, X, Trash2 } from 'lucide-react'
import { apiClient } from '../api/axios'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'

export type Plan = {
  id: number
  name: string
  stripe_price_id: string
  billing_interval?: 'month' | 'year'
  monthly_price: number
  currency: string
  description: string | null
  is_active: boolean
}

const emptyPlan: Omit<Plan, 'id'> = {
  name: '',
  stripe_price_id: '',
  billing_interval: 'month',
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
  const [deletingPlanId, setDeletingPlanId] = useState<number | null>(null)

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
      billing_interval: plan.billing_interval ?? 'month',
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

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const target = event.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
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

  const handleDelete = async (planId: number) => {
    if (!confirm('Weet je zeker dat je dit plan wilt verwijderen? Dit kan niet ongedaan worden gemaakt.')) {
      return
    }

    setDeletingPlanId(planId)
    setError(null)

    try {
      const response = await apiClient.delete(`/api/platform/plans/${planId}`)
      console.log('Plan verwijderd:', response)
      setPlans((prev) => prev.filter((plan) => plan.id !== planId))
      if (editingPlan?.id === planId) {
        setEditingPlan(null)
        setForm(emptyPlan)
      }
    } catch (err: any) {
      console.error('Plan verwijderen mislukt', err)
      console.error('Error details:', {
        message: err.message,
        status: err.response?.status,
        data: err.response?.data,
        config: err.config,
      })
      const msg =
        err.response?.data?.message ??
        (err.response?.status === 422 
          ? 'Dit plan kan niet worden verwijderd omdat er nog actieve abonnementen zijn.'
          : err.response?.status === 404
          ? 'Plan niet gevonden.'
          : err.response?.status === 403
          ? 'Je hebt geen toestemming om dit plan te verwijderen.'
          : 'Kon plan niet verwijderen.')
      setError(msg)
    } finally {
      setDeletingPlanId(null)
    }
  }

  const sortedPlans = useMemo(
    () => plans.slice().sort((a, b) => a.monthly_price - b.monthly_price || a.name.localeCompare(b.name)),
    [plans],
  )

  const inputClassName = "w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
  const labelClassName = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Abonnementen (plannen)</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Beheer abonnementsplannen voor organisaties</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-400 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {editingPlan ? 'Plan bewerken' : 'Nieuw plan'}
          </h3>
          {editingPlan && (
            <Button variant="outline" size="sm" onClick={handleNew} disabled={saving}>
              <X size={16} />
              Annuleren
            </Button>
          )}
        </div>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="plan-name" className={labelClassName}>Naam</label>
            <input
              id="plan-name"
              name="name"
              value={form.name}
              onChange={handleChange}
              required
              className={inputClassName}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="plan-price" className={labelClassName}>Maandbedrag (p/m)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">€</span>
                <input
                  id="plan-price"
                  name="monthly_price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.monthly_price}
                  onChange={handleChange}
                  required
                  className={`${inputClassName} pl-8`}
                  placeholder="150.00"
                />
              </div>
            </div>
            <div>
              <label htmlFor="plan-currency" className={labelClassName}>Valuta</label>
              <input
                id="plan-currency"
                name="currency"
                value={form.currency}
                onChange={handleChange}
                required
                className={inputClassName}
                placeholder="EUR"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="plan-billing-interval" className={labelClassName}>Factureringsperiode</label>
              <select
                id="plan-billing-interval"
                name="billing_interval"
                value={form.billing_interval ?? 'month'}
                onChange={handleChange}
                required
                className={inputClassName}
              >
                <option value="month">Maandelijks</option>
                <option value="year">Jaarlijks</option>
              </select>
            </div>
            <div>
              <label htmlFor="plan-stripe-price" className={labelClassName}>Stripe prijs-ID</label>
              <input
                id="plan-stripe-price"
                name="stripe_price_id"
                value={form.stripe_price_id}
                onChange={handleChange}
                required
                className={inputClassName}
              />
            </div>
          </div>

          <div>
            <label htmlFor="plan-description" className={labelClassName}>Omschrijving</label>
            <textarea
              id="plan-description"
              name="description"
              value={form.description ?? ''}
              onChange={handleChange}
              className={inputClassName}
              rows={3}
              placeholder="Bijv: Voor kleine organisaties <150 leden."
            />
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Beschrijf voor welke organisaties dit plan geschikt is (bijv. aantal leden, type organisatie).
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              name="is_active"
              checked={form.is_active}
              onChange={handleChange}
              className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="plan-active" className="text-sm text-gray-700 dark:text-gray-300">
              Plan is actief
            </label>
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={saving}>
              <Save size={16} />
              {saving ? 'Bezig...' : 'Opslaan'}
            </Button>
            {editingPlan && (
              <Button
                type="button"
                variant="outline"
                onClick={handleNew}
                disabled={saving}
              >
                <Plus size={16} />
                Nieuw plan
              </Button>
            )}
          </div>
        </form>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Bestaande plannen</h3>
        {loading ? (
          <div className="text-center py-8 text-gray-600 dark:text-gray-400">Plannen worden geladen...</div>
        ) : sortedPlans.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">Er zijn nog geen plannen aangemaakt.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Naam</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Periode</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Beschrijving</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Prijs</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Stripe prijs-ID</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Actief</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Acties</th>
                </tr>
              </thead>
              <tbody>
                {sortedPlans.map((plan) => (
                  <tr key={plan.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="py-4 px-4">
                      <div className="font-medium text-gray-900 dark:text-white">{plan.name}</div>
                    </td>
                    <td className="py-4 px-4">
                      <Badge variant={plan.billing_interval === 'year' ? 'default' : 'success'}>
                        {plan.billing_interval === 'year' ? 'Jaarlijks' : 'Maandelijks'}
                      </Badge>
                    </td>
                    <td className="py-4 px-4 text-gray-600 dark:text-gray-400">
                      {plan.description || '-'}
                    </td>
                    <td className="py-4 px-4 text-gray-900 dark:text-white">
                      € {plan.monthly_price.toLocaleString('nl-NL', { minimumFractionDigits: 2 })} {plan.currency} {plan.billing_interval === 'year' ? 'p/j' : 'p/m'}
                    </td>
                    <td className="py-4 px-4 text-gray-600 dark:text-gray-400 font-mono text-xs">{plan.stripe_price_id || '-'}</td>
                    <td className="py-4 px-4">
                      {plan.is_active ? (
                        <Badge variant="success">Actief</Badge>
                      ) : (
                        <Badge variant="default">Inactief</Badge>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center justify-end gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleEdit(plan)}
                          disabled={deletingPlanId === plan.id}
                        >
                          <Edit size={16} />
                          Bewerken
                        </Button>
                        <Button 
                          type="button"
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleDelete(plan.id)}
                          disabled={deletingPlanId === plan.id}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 border-red-300 dark:border-red-700"
                        >
                          <Trash2 size={16} />
                          {deletingPlanId === plan.id ? 'Verwijderen...' : 'Verwijderen'}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}

export default PlatformPlansPage
