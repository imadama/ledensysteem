import React from 'react'
import { Users, CreditCard, Globe, BarChart3, FileText, Check } from 'lucide-react'

// Kleine features voor onderaan
const moreFeatures = [
  {
    icon: Globe,
    title: 'Eigen Subdomein',
    description: 'Elke organisatie krijgt een eigen subdomein (bijv. stichting.aidatim.nl) voor professionele uitstraling.',
  },
  {
    icon: BarChart3,
    title: 'Dashboard & inzichten',
    description: 'Direct inzicht in groei, openstaande posten en verwachte inkomsten.',
  },
  {
    icon: FileText,
    title: 'Import & Export',
    description: 'Begin direct door je huidige ledenlijst te importeren vanuit Excel.',
  },
]

export const Features: React.FC = () => {
  return (
    <div id="features" className="bg-slate-50 dark:bg-slate-900 py-24 sm:py-32 overflow-hidden">
      
      {/* Sectie 1: Ledenbeheer */}
      <div className="container mx-auto px-6 lg:px-8 mb-32">
        <div className="lg:grid lg:grid-cols-2 lg:gap-16 items-center">
          <div>
            <div className="inline-flex items-center rounded-full bg-aidatim-blue/10 px-3 py-1 text-sm font-medium text-aidatim-blue ring-1 ring-inset ring-aidatim-blue/20 mb-6">
              Ledenadministratie
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-aidatim-blue-dark dark:text-white sm:text-4xl mb-6">
              Al je leden op één plek.
              <br className="hidden sm:block" />
              Overzichtelijk en veilig.
            </h2>
            <p className="text-lg leading-8 text-aidatim-gray dark:text-slate-300 mb-8">
              Weg met rondslingerende Excel-lijsten. Beheer al je leden in een veilige, centrale database. Zoek direct op naam, status of betaalhistorie.
            </p>
            <ul className="space-y-4 mb-8">
              {['Onbeperkt aantal leden', 'Slimme zoekfilters', 'Gezinskoppelingen', 'Direct inzicht in betaalstatus'].map((item) => (
                <li key={item} className="flex gap-3 text-aidatim-gray-dark dark:text-slate-300">
                  <Check className="h-6 w-5 flex-none text-aidatim-green" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="relative mt-12 lg:mt-0">
            <div className="absolute -inset-4 bg-gradient-to-r from-aidatim-blue/20 to-aidatim-green/20 dark:from-aidatim-blue/10 dark:to-aidatim-green/10 rounded-2xl blur-2xl -z-10"></div>
            <div className="relative rounded-xl bg-white dark:bg-slate-800 shadow-2xl ring-1 ring-slate-900/10 dark:ring-white/10 overflow-hidden">
              {/* Fake UI: Ledenlijst */}
              <div className="border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-4 flex items-center justify-between">
                <div className="flex gap-2">
                   <div className="w-3 h-3 rounded-full bg-red-400"></div>
                   <div className="w-3 h-3 rounded-full bg-aidatim-orange"></div>
                   <div className="w-3 h-3 rounded-full bg-aidatim-green"></div>
                </div>
                <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded"></div>
              </div>
              <div className="p-6 space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-lg transition-colors border border-transparent hover:border-slate-100 dark:hover:border-slate-700">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-aidatim-blue/10 dark:bg-slate-700 flex items-center justify-center text-aidatim-blue">
                        <Users className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="h-3 w-24 bg-slate-800 dark:bg-slate-200 rounded mb-1.5"></div>
                        <div className="h-2 w-32 bg-slate-400 dark:bg-slate-500 rounded"></div>
                      </div>
                    </div>
                    <div className="px-2 py-1 bg-aidatim-green/10 dark:bg-green-900/30 text-aidatim-green dark:text-green-400 text-xs rounded-full font-medium">
                      Actief
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sectie 2: Betalingen (Omgedraaid) */}
      <div className="container mx-auto px-6 lg:px-8 mb-32">
        <div className="lg:grid lg:grid-cols-2 lg:gap-16 items-center">
          <div className="order-2 lg:order-1 relative mt-12 lg:mt-0">
             <div className="absolute -inset-4 bg-gradient-to-r from-aidatim-orange/20 to-purple-100 dark:from-aidatim-orange/10 dark:to-purple-900/20 rounded-2xl blur-2xl -z-10"></div>
             <div className="relative rounded-xl bg-white dark:bg-slate-800 shadow-2xl ring-1 ring-slate-900/10 dark:ring-white/10 overflow-hidden p-8 flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-aidatim-blue/10 dark:bg-aidatim-blue/20 rounded-full flex items-center justify-center text-aidatim-blue mb-6">
                   <CreditCard className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-aidatim-blue-dark dark:text-white mb-2">Automatische Incasso</h3>
                <p className="text-aidatim-gray text-sm mb-6">Uw betaling wordt verwerkt...</p>
                <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2 mb-2 overflow-hidden">
                   <div className="bg-aidatim-green h-2 rounded-full w-3/4 animate-pulse"></div>
                </div>
                <div className="flex justify-between w-full text-xs text-aidatim-gray/60">
                   <span>Verwerken</span>
                   <span>75%</span>
                </div>
             </div>
          </div>
          <div className="order-1 lg:order-2">
            <div className="inline-flex items-center rounded-full bg-aidatim-orange/10 px-3 py-1 text-sm font-medium text-aidatim-orange-dark ring-1 ring-inset ring-aidatim-orange/20 mb-6">
              Financieel
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-aidatim-blue-dark dark:text-white sm:text-4xl mb-6">
              Incasseren zonder omkijken.
            </h2>
            <p className="text-lg leading-8 text-aidatim-gray dark:text-slate-300 mb-8">
              Geen handmatige overboekingen meer controleren. Met onze automatische SEPA incasso worden contributies op tijd geïnd.
            </p>
            <ul className="space-y-4 mb-8">
              {['Automatische incasso batches', 'Storno opvolging', 'Betaallinks voor losse donaties', 'Veilig via Stripe & Mollie'].map((item) => (
                <li key={item} className="flex gap-3 text-aidatim-gray-dark dark:text-slate-300">
                  <Check className="h-6 w-5 flex-none text-aidatim-orange" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Sectie 3: Grid met overige features */}
      <div className="container mx-auto px-6 lg:px-8">
        <div className="mx-auto max-w-2xl lg:text-center mb-16">
          <h2 className="text-base font-semibold leading-7 text-aidatim-blue">En nog veel meer</h2>
          <p className="mt-2 text-3xl font-bold tracking-tight text-aidatim-blue-dark dark:text-white sm:text-4xl">
            Alles om jouw organisatie te laten groeien
          </p>
        </div>
        <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
          <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3">
            {moreFeatures.map((feature) => (
              <div key={feature.title} className="flex flex-col items-start">
                <div className="rounded-lg bg-slate-100 dark:bg-slate-800 p-2 ring-1 ring-slate-900/5 dark:ring-white/10 mb-6">
                  <feature.icon className="h-6 w-6 text-aidatim-gray dark:text-slate-300" aria-hidden="true" />
                </div>
                <dt className="text-lg font-semibold leading-7 text-aidatim-blue-dark dark:text-white">
                  {feature.title}
                </dt>
                <dd className="mt-1 flex flex-auto flex-col text-base leading-7 text-aidatim-gray dark:text-slate-400">
                  <p className="flex-auto">{feature.description}</p>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  )
}

