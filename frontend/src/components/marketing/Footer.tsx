import React from 'react'
import { Link } from 'react-router-dom'
import { Facebook, Twitter, Linkedin, Instagram } from 'lucide-react'

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-950 text-slate-400 py-12 lg:py-16" aria-labelledby="footer-heading">
      <h2 id="footer-heading" className="sr-only">Footer</h2>
      <div className="container mx-auto px-6 lg:px-8">
        <div className="xl:grid xl:grid-cols-3 xl:gap-8">
          <div className="space-y-8">
            <span className="text-2xl font-bold text-white tracking-tight">Aidatim<span className="text-blue-500">.</span></span>
            <p className="text-sm leading-6 text-slate-400 max-w-xs">
              Professioneel ledenbeheer voor stichtingen, verenigingen en moskeeën. Eenvoudig, veilig en betaalbaar.
            </p>
            <div className="flex space-x-6">
              <a href="#" className="text-slate-500 hover:text-slate-300">
                <span className="sr-only">Facebook</span>
                <Facebook className="h-6 w-6" aria-hidden="true" />
              </a>
              <a href="#" className="text-slate-500 hover:text-slate-300">
                <span className="sr-only">Instagram</span>
                <Instagram className="h-6 w-6" aria-hidden="true" />
              </a>
              <a href="#" className="text-slate-500 hover:text-slate-300">
                <span className="sr-only">Twitter</span>
                <Twitter className="h-6 w-6" aria-hidden="true" />
              </a>
              <a href="#" className="text-slate-500 hover:text-slate-300">
                <span className="sr-only">LinkedIn</span>
                <Linkedin className="h-6 w-6" aria-hidden="true" />
              </a>
            </div>
          </div>
          <div className="mt-16 grid grid-cols-2 gap-8 xl:col-span-2 xl:mt-0">
            <div className="md:grid md:grid-cols-2 md:gap-8">
              <div>
                <h3 className="text-sm font-semibold leading-6 text-white">Product</h3>
                <ul role="list" className="mt-6 space-y-4">
                  <li>
                    <a href="#features" className="text-sm leading-6 hover:text-white">Functies</a>
                  </li>
                  <li>
                    <a href="#pricing" className="text-sm leading-6 hover:text-white">Prijzen</a>
                  </li>
                  <li>
                    <a href="#" className="text-sm leading-6 hover:text-white">Roadmap</a>
                  </li>
                  <li>
                    <a href="#" className="text-sm leading-6 hover:text-white">Changelog</a>
                  </li>
                </ul>
              </div>
              <div className="mt-10 md:mt-0">
                <h3 className="text-sm font-semibold leading-6 text-white">Support</h3>
                <ul role="list" className="mt-6 space-y-4">
                  <li>
                    <a href="#" className="text-sm leading-6 hover:text-white">Documentatie</a>
                  </li>
                  <li>
                    <a href="#" className="text-sm leading-6 hover:text-white">API Status</a>
                  </li>
                  <li>
                    <a href="#" className="text-sm leading-6 hover:text-white">Contact</a>
                  </li>
                </ul>
              </div>
            </div>
            <div className="md:grid md:grid-cols-2 md:gap-8">
              <div>
                <h3 className="text-sm font-semibold leading-6 text-white">Bedrijf</h3>
                <ul role="list" className="mt-6 space-y-4">
                  <li>
                    <a href="#" className="text-sm leading-6 hover:text-white">Over ons</a>
                  </li>
                  <li>
                    <a href="#" className="text-sm leading-6 hover:text-white">Blog</a>
                  </li>
                  <li>
                    <a href="#" className="text-sm leading-6 hover:text-white">Vacatures</a>
                  </li>
                </ul>
              </div>
              <div className="mt-10 md:mt-0">
                <h3 className="text-sm font-semibold leading-6 text-white">Legal</h3>
                <ul role="list" className="mt-6 space-y-4">
                  <li>
                    <Link to="/privacy" className="text-sm leading-6 hover:text-white">Privacy</Link>
                  </li>
                  <li>
                    <Link to="/terms" className="text-sm leading-6 hover:text-white">Voorwaarden</Link>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-16 border-t border-white/10 pt-8 sm:mt-20 lg:mt-24">
          <p className="text-xs leading-5 text-slate-500">&copy; {new Date().getFullYear()} Aidatim. Alle rechten voorbehouden.</p>
        </div>
      </div>
    </footer>
  )
}

