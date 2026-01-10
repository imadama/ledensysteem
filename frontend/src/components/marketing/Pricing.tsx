import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check } from 'lucide-react'
import { apiClient } from '../../api/axios'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'

type Plan = {
  id: number
  name: string
  billing_interval?: 'month' | 'year'
  monthly_price: number
  currency: string
  description: string | null
}

export const Pricing: React.FC = () => {
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadPlans = async () => {
      try {
        const { data } = await apiClient.get<{ data: Plan[] }>('/api/plans')
        setPlans(data.data || [])
      } catch (err: any) {
        console.error('Plannen laden mislukt', err)
        setError('Kon prijzen niet laden.')
      } finally {
        setLoading(false)
      }
    }

    void loadPlans()
  }, [])

  const formatPrice = (price: number, currency: string, interval?: string) => {
    const formattedPrice = new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: currency || 'EUR',
      minimumFractionDigits: 2,
    }).format(price)

    if (interval === 'year') {
      return `${formattedPrice}/jaar`
    }
    return `${formattedPrice}/maand`
  }

  if (loading) {
    return (
      <section id="pricing" className="py-20 bg-white dark:bg-gray-800">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Transparante prijzen
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Kies het abonnement dat bij jouw organisatie past
            </p>
          </div>
          <div className="text-center text-gray-600 dark:text-gray-400">Prijzen laden...</div>
        </div>
      </section>
    )
  }

  if (error || plans.length === 0) {
    return null // Verberg sectie als er geen plannen zijn of een fout optreedt
  }

  return (
    <section id="pricing" className="py-20 bg-white dark:bg-gray-800">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Transparante prijzen
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Kies het abonnement dat bij jouw organisatie past. Geen verborgen kosten, geen verrassingen.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className={`p-8 flex flex-col ${
                plan.name.toLowerCase().includes('plus') || plan.name.toLowerCase().includes('pro')
                  ? 'ring-2 ring-aidatim-blue dark:ring-aidatim-blue'
                  : ''
              }`}
            >
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  {plan.name}
                </h3>
                <div className="text-4xl font-bold text-aidatim-blue dark:text-aidatim-blue mb-2">
                  {formatPrice(plan.monthly_price, plan.currency, plan.billing_interval)}
                </div>
                {plan.description && (
                  <p className="text-gray-600 dark:text-gray-400 text-sm">{plan.description}</p>
                )}
              </div>
              <div className="flex-grow mb-6">
                <ul className="space-y-3">
                  <li className="flex items-start gap-2">
                    <Check className="text-green-500 dark:text-green-400 mt-0.5 flex-shrink-0" size={20} />
                    <span className="text-gray-700 dark:text-gray-300">Onbeperkt aantal leden</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="text-green-500 dark:text-green-400 mt-0.5 flex-shrink-0" size={20} />
                    <span className="text-gray-700 dark:text-gray-300">Automatische contributie-incasso's</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="text-green-500 dark:text-green-400 mt-0.5 flex-shrink-0" size={20} />
                    <span className="text-gray-700 dark:text-gray-300">Member portal voor leden</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="text-green-500 dark:text-green-400 mt-0.5 flex-shrink-0" size={20} />
                    <span className="text-gray-700 dark:text-gray-300">Eigen subdomein</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="text-green-500 dark:text-green-400 mt-0.5 flex-shrink-0" size={20} />
                    <span className="text-gray-700 dark:text-gray-300">Dashboard en rapportages</span>
                  </li>
                </ul>
              </div>
              <Link to="/register-organisation" className="mt-auto">
                <Button variant="primary" className="w-full" size="lg">
                  Start nu
                </Button>
              </Link>
            </Card>
          ))}
        </div>
        <div className="text-center mt-12">
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Alle abonnementen kunnen op elk moment worden opgezegd. Geen langlopende contracten.
          </p>
          <Link to="/register-organisation">
            <Button variant="outline" size="lg">
              Of probeer gratis
            </Button>
          </Link>
        </div>
      </div>
    </section>
  )
}

