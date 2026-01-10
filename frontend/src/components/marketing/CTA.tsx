import React from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../ui/Button'
import { ArrowRight } from 'lucide-react'

export const CTA: React.FC = () => {
  return (
    <section className="py-20 bg-aidatim-blue dark:bg-aidatim-blue-dark">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Klaar om te beginnen?
          </h2>
          <p className="text-xl text-white/90 mb-8">
            Registreer je organisatie en start vandaag nog met het beheren van je leden.
          </p>
          <Link to="/register-organisation">
            <Button 
              variant="secondary" 
              size="lg"
              className="bg-white text-aidatim-blue hover:bg-gray-100 dark:bg-gray-100 dark:text-aidatim-blue dark:hover:bg-gray-200"
            >
              Registreer nu
              <ArrowRight className="ml-2" size={20} />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  )
}

