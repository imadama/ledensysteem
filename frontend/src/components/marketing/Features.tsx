import React from 'react'
import { Users, CreditCard, Shield, Globe, BarChart3, FileText } from 'lucide-react'
import { Card } from '../ui/Card'

const features = [
  {
    icon: Users,
    title: 'Ledenbeheer',
    description: 'Beheer al je leden op één plek. Importeer vanuit Excel, voeg handmatig toe of laat leden zichzelf registreren.',
  },
  {
    icon: CreditCard,
    title: 'Contributiebeheer',
    description: 'Automatische incasso\'s via SEPA. Stel contributiebedragen in en het systeem regelt de rest.',
  },
  {
    icon: Shield,
    title: 'Member Portal',
    description: 'Leden kunnen zelf inloggen om hun gegevens te bekijken, contributies te betalen en hun profiel bij te werken.',
  },
  {
    icon: Globe,
    title: 'Eigen Subdomein',
    description: 'Elke organisatie krijgt een eigen subdomein (bijv. jouworganisatie.aidatim.nl) voor professionele branding.',
  },
  {
    icon: BarChart3,
    title: 'Dashboard & Rapportages',
    description: 'Overzicht van alle belangrijke statistieken, betalingen en contributies op één dashboard.',
  },
  {
    icon: FileText,
    title: 'Import & Export',
    description: 'Importeer leden vanuit Excel-bestanden en exporteer data wanneer je dat nodig hebt.',
  },
]

export const Features: React.FC = () => {
  return (
    <section id="features" className="py-20 bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Alles wat je nodig hebt voor ledenbeheer
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Een compleet systeem dat speciaal is ontwikkeld voor moskeeën, stichtingen en verenigingen.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon
            return (
              <Card key={index} className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-center mb-4">
                  <div className="p-3 bg-aidatim-blue/10 dark:bg-aidatim-blue/20 rounded-lg">
                    <Icon className="text-aidatim-blue dark:text-aidatim-blue" size={24} />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white ml-4">
                    {feature.title}
                  </h3>
                </div>
                <p className="text-gray-600 dark:text-gray-400">
                  {feature.description}
                </p>
              </Card>
            )
          })}
        </div>
      </div>
    </section>
  )
}

