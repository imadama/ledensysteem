import React from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../ui/Button'
import { ArrowRight } from 'lucide-react'

export const Hero: React.FC = () => {
  return (
    <section className="relative bg-gradient-to-br from-aidatim-blue via-aidatim-blue-dark to-aidatim-blue-dark dark:from-aidatim-blue-dark dark:via-aidatim-blue-dark dark:to-aidatim-blue-dark text-white py-20 md:py-32">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
            Ledenbeheer voor Moskeeën, Stichtingen en Verenigingen
          </h1>
          <p className="text-xl md:text-2xl text-white/90 mb-8 max-w-2xl mx-auto">
            Eenvoudig beheer van leden, contributies en betalingen. Alles op één plek, altijd toegankelijk.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link to="/register-organisation">
              <Button 
                variant="secondary" 
                size="lg"
                className="bg-white text-aidatim-blue hover:bg-gray-100 dark:bg-gray-100 dark:text-aidatim-blue dark:hover:bg-gray-200"
              >
                Start gratis
                <ArrowRight className="ml-2" size={20} />
              </Button>
            </Link>
            <a href="#pricing">
              <Button 
                variant="outline" 
                size="lg"
                className="border-white text-white hover:bg-white/10 dark:border-gray-300 dark:text-gray-100"
              >
                Bekijk prijzen
              </Button>
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}

