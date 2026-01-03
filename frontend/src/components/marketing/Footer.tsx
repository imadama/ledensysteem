import React from 'react'
import { Link } from 'react-router-dom'

export const Footer: React.FC = () => {
  return (
    <footer className="bg-gray-900 text-gray-300 py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          <div>
            <h3 className="text-white font-semibold text-lg mb-4">Aidatim</h3>
            <p className="text-gray-400">
              Ledenbeheer voor moskeeën, stichtingen en verenigingen.
            </p>
          </div>
          <div>
            <h3 className="text-white font-semibold text-lg mb-4">Links</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/register-organisation" className="hover:text-white transition-colors">
                  Registreer organisatie
                </Link>
              </li>
              <li>
                <a href="#features" className="hover:text-white transition-colors">
                  Features
                </a>
              </li>
              <li>
                <a href="#pricing" className="hover:text-white transition-colors">
                  Prijzen
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-white font-semibold text-lg mb-4">Contact</h3>
            <p className="text-gray-400">
              Voor vragen of ondersteuning, neem contact met ons op.
            </p>
          </div>
        </div>
        <div className="border-t border-gray-800 pt-8 text-center text-sm text-gray-400">
          <p>&copy; {new Date().getFullYear()} Aidatim. Alle rechten voorbehouden.</p>
        </div>
      </div>
    </footer>
  )
}

