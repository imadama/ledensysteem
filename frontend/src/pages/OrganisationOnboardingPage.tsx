import { useNavigate } from 'react-router-dom'
import { CheckCircle, Circle, CreditCard, Users } from 'lucide-react'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'

const OrganisationOnboardingPage: React.FC = () => {
  const navigate = useNavigate()

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Welkom bij Aidatim!</h2>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Volg de stappen hieronder om je organisatie klaar te maken voor gebruik.
        </p>
      </div>

      <div className="space-y-4">
        {/* Step 1 — completed */}
        <Card className="p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 mt-0.5">
              <CheckCircle className="text-green-500 dark:text-green-400" size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-green-600 dark:text-green-400">
                  Stap 1 — Voltooid
                </span>
              </div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                Abonnement geactiveerd
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Welkom bij Aidatim! Je abonnement is actief.
              </p>
            </div>
          </div>
        </Card>

        {/* Step 2 */}
        <Card className="p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 mt-0.5">
              <Circle className="text-gray-400 dark:text-gray-500" size={24} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Stap 2
                </span>
              </div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                Stripe Connect instellen
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 mb-4">
                Koppel je bankrekening om contributiebetalingen te ontvangen van leden.
              </p>
              <Button onClick={() => navigate('/organisation/settings/payments')}>
                <CreditCard size={16} />
                Koppel bankrekening
              </Button>
            </div>
          </div>
        </Card>

        {/* Step 3 */}
        <Card className="p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 mt-0.5">
              <Circle className="text-gray-400 dark:text-gray-500" size={24} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Stap 3
                </span>
              </div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                Eerste leden toevoegen
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 mb-4">
                Voeg je eerste leden toe of importeer ze vanuit een CSV-bestand.
              </p>
              <Button onClick={() => navigate('/organisation/members')}>
                <Users size={16} />
                Leden beheren
              </Button>
            </div>
          </div>
        </Card>
      </div>

      <div className="pt-2">
        <Button variant="outline" onClick={() => navigate('/organisation/dashboard')}>
          Ga naar dashboard
        </Button>
      </div>
    </div>
  )
}

export default OrganisationOnboardingPage
