import React from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../ui/Button'
import { ArrowRight, CheckCircle, Users, CreditCard } from 'lucide-react'

export const Hero: React.FC = () => {
  return (
    <section className="relative overflow-hidden bg-white dark:bg-slate-900 pb-16 pt-20 sm:pb-24 sm:pt-32 lg:pb-32 xl:pb-36">
      <div className="container relative z-10 mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
          
          {/* Tekst Content (Links) */}
          <div className="flex-1 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-aidatim-blue/10 text-aidatim-blue dark:bg-aidatim-blue/20 text-sm font-medium mb-6">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-aidatim-blue opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-aidatim-blue"></span>
              </span>
              Nieuw: Automatische SEPA Incasso
            </div>
            
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-6 leading-tight">
              Ledenbeheer <span className="text-aidatim-blue">zonder gedoe</span> voor jouw organisatie.
            </h1>
            
            <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-300 mb-8 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
              Van ledenadministratie tot automatische incasso's. Aidatim helpt stichtingen, verenigingen en moskeeën om professioneel en efficiënt te werken.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Link to="/register-organisation" className="w-full sm:w-auto">
                <Button 
                  size="lg"
                  className="w-full bg-aidatim-blue hover:bg-aidatim-blue-dark text-white shadow-lg shadow-aidatim-blue/25 transition-all hover:-translate-y-0.5"
                >
                  Start gratis proefperiode
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <a href="#features" className="w-full sm:w-auto">
                <Button 
                  variant="outline" 
                  size="lg"
                  className="w-full border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Bekijk alle functies
                </Button>
              </a>
            </div>

            <div className="mt-8 flex items-center justify-center lg:justify-start gap-6 text-sm text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Geen creditcard nodig</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>14 dagen gratis</span>
              </div>
            </div>
          </div>

          {/* Afbeelding / Mockup (Rechts) */}
          <div className="flex-1 relative w-full max-w-lg lg:max-w-none">
            <div className="relative rounded-2xl bg-slate-100 dark:bg-slate-800 p-2 ring-1 ring-slate-200/50 dark:ring-slate-700/50 shadow-2xl lg:rotate-2 hover:rotate-0 transition-transform duration-500 ease-out">
              <div className="aspect-[4/3] rounded-xl bg-white dark:bg-slate-900 overflow-hidden relative border border-slate-200 dark:border-slate-700 flex flex-col">
                {/* Nep Dashboard Header */}
                <div className="h-12 border-b border-slate-100 dark:border-slate-800 flex items-center px-4 gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-400"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                  <div className="w-3 h-3 rounded-full bg-green-400"></div>
                </div>
                {/* Nep Dashboard Content */}
                <div className="p-6 flex-1 bg-slate-50/50 dark:bg-slate-900/50">
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm border border-slate-100 dark:border-slate-700">
                      <div className="text-slate-500 text-xs mb-1">Actieve Leden</div>
                      <div className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        248 <span className="text-xs font-normal text-green-500 bg-green-50 px-1.5 py-0.5 rounded-full">+12%</span>
                      </div>
                    </div>
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm border border-slate-100 dark:border-slate-700">
                      <div className="text-slate-500 text-xs mb-1">Contributie deze maand</div>
                      <div className="text-2xl font-bold text-slate-900 dark:text-white">€ 3.450</div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
                    <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded w-full"></div>
                    <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded w-5/6"></div>
                    <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded w-2/3"></div>
                  </div>
                  
                  {/* Drijvende iconen */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full pointer-events-none flex items-center justify-center">
                     <div className="absolute top-10 right-10 bg-white dark:bg-slate-800 p-3 rounded-xl shadow-lg border border-slate-100 dark:border-slate-700 animate-bounce delay-1000">
                        <Users className="w-6 h-6 text-blue-500" />
                     </div>
                     <div className="absolute bottom-10 left-10 bg-white dark:bg-slate-800 p-3 rounded-xl shadow-lg border border-slate-100 dark:border-slate-700 animate-bounce delay-700">
                        <CreditCard className="w-6 h-6 text-purple-500" />
                     </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Achtergrond gloed */}
            <div className="absolute -top-20 -right-20 w-72 h-72 bg-aidatim-blue/20 rounded-full blur-3xl -z-10"></div>
            <div className="absolute -bottom-20 -left-20 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl -z-10"></div>
          </div>
        </div>
      </div>
    </section>
  )
}

