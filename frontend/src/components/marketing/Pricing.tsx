import React from 'react'
import { Link } from 'react-router-dom'
import { Check, X } from 'lucide-react'

type Plan = {
  id: number
  name: string
  monthly_price: number | string
  currency: string
  description: string
  features: string[]
  popular?: boolean
}

const plans: Plan[] = [
  {
    id: 1,
    name: 'Basis',
    monthly_price: 19,
    currency: 'EUR',
    description: 'Voor kleine verenigingen die willen starten met professionaliseren.',
    features: [
      'Tot 100 leden',
      'Ledenadministratie',
      'Handmatige betalingen',
      'Basis rapportages',
      'Eigen subdomein',
    ]
  },
  {
    id: 2,
    name: 'Plus',
    monthly_price: 39,
    currency: 'EUR',
    description: 'Alles wat je nodig hebt voor een groeiende organisatie.',
    features: [
      'Onbeperkt aantal leden',
      'Automatische SEPA Incasso',
      'Ledenportaal (Mijn Omgeving)',
      'Uitgebreide rapportages',
      'Betaallinks voor donaties',
      'Prioriteit support',
    ],
    popular: true
  },
  {
    id: 3,
    name: 'Enterprise',
    monthly_price: 'Op aanvraag',
    currency: 'EUR',
    description: 'Voor grote stichtingen met specifieke wensen.',
    features: [
      'Alles in Plus',
      'Custom domeinnaam',
      'SLA & Contract',
      'Import service',
      'Meerdere administraties',
    ]
  }
]

export const Pricing: React.FC = () => {
  const formatPrice = (price: number | string, currency: string) => {
    if (typeof price === 'string') return price
    
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: currency || 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price)
  }

  return (
    <div id="pricing" className="bg-white dark:bg-slate-900 py-24 sm:py-32">
      <div className="container mx-auto px-6 lg:px-8">
        <div className="mx-auto max-w-2xl sm:text-center">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
            Eerlijke, transparante prijzen
          </h2>
          <p className="mt-6 text-lg leading-8 text-slate-600 dark:text-slate-400">
            Geen verborgen kosten. Kies het pakket dat bij jouw organisatie past.
            <br />
            Je kunt op elk moment opzeggen of upgraden.
          </p>
        </div>
        
        <div className="mx-auto mt-16 grid max-w-lg grid-cols-1 items-center gap-y-6 sm:mt-20 sm:gap-y-0 lg:max-w-4xl lg:grid-cols-3">
          {plans.map((plan, planIdx) => {
            const isPopular = plan.popular
            
            return (
              <div
                key={plan.id}
                className={`
                  ${isPopular 
                    ? 'relative bg-aidatim-blue-dark dark:bg-slate-800 shadow-2xl ring-2 ring-aidatim-orange sm:mx-0 lg:z-10 rounded-3xl' 
                    : 'bg-white/60 dark:bg-slate-800/60 sm:mx-8 lg:mx-0 ring-1 ring-slate-200 dark:ring-slate-700 rounded-3xl lg:rounded-none'
                  }
                  ${planIdx === 0 ? 'lg:rounded-l-3xl lg:border-r-0' : ''}
                  ${planIdx === plans.length - 1 ? 'lg:rounded-r-3xl lg:border-l-0' : ''}
                  p-8 xl:p-10
                `}
              >
                {isPopular && (
                  <div className="absolute -top-5 left-0 right-0 mx-auto w-32 rounded-full bg-gradient-to-r from-aidatim-orange to-aidatim-orange-dark px-3 py-1 text-sm font-medium text-white text-center shadow-md">
                    Meest gekozen
                  </div>
                )}

                <h3
                  id={`tier-${plan.id}`}
                  className={`text-lg font-semibold leading-8 ${isPopular ? 'text-white' : 'text-aidatim-blue-dark dark:text-white'}`}
                >
                  {plan.name}
                </h3>
                
                <div className="mt-4 flex items-baseline gap-x-2">
                  <span className={`text-4xl font-bold tracking-tight ${isPopular ? 'text-white' : 'text-aidatim-blue-dark dark:text-white'}`}>
                    {formatPrice(plan.monthly_price, plan.currency)}
                  </span>
                  {typeof plan.monthly_price === 'number' && (
                    <span className={`text-sm font-semibold leading-6 ${isPopular ? 'text-blue-100' : 'text-aidatim-gray dark:text-slate-400'}`}>
                      /maand
                    </span>
                  )}
                </div>
                
                <p className={`mt-6 text-sm leading-6 ${isPopular ? 'text-blue-100' : 'text-aidatim-gray dark:text-slate-400'}`}>
                  {plan.description}
                </p>
                
                <ul role="list" className={`mt-8 space-y-3 text-sm leading-6 ${isPopular ? 'text-blue-100' : 'text-aidatim-gray dark:text-slate-400'}`}>
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex gap-x-3">
                      <Check className={`h-6 w-5 flex-none ${isPopular ? 'text-aidatim-orange' : 'text-aidatim-green'}`} aria-hidden="true" />
                      {feature}
                    </li>
                  ))}
                  {!isPopular && plan.name === 'Basis' && (
                     <li className="flex gap-x-3 text-slate-400 opacity-75">
                        <X className="h-6 w-5 flex-none" />
                        Geen automatische incasso
                     </li>
                  )}
                </ul>
                
                <Link
                  to="/register-organisation"
                  aria-describedby={`tier-${plan.id}`}
                  className={`mt-8 block rounded-md px-3 py-2 text-center text-sm font-semibold leading-6 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 shadow-sm transition-all
                    ${isPopular 
                      ? 'bg-aidatim-green text-white hover:bg-aidatim-green-dark focus-visible:outline-aidatim-green' 
                      : 'bg-white dark:bg-slate-700 text-aidatim-blue ring-1 ring-inset ring-aidatim-blue/20 dark:ring-blue-900 hover:ring-aidatim-blue/40 dark:hover:ring-blue-800'
                    }
                  `}
                >
                  {typeof plan.monthly_price === 'string' ? 'Neem contact op' : 'Start gratis proefperiode'}
                </Link>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
