import { type FormEvent, useState, useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { LogIn } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { getSanctumCsrfCookie } from '../api/axios'
import { getCurrentSubdomain } from '../api/config'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'

const LoginPage: React.FC = () => {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const subdomain = getCurrentSubdomain()
  const isPortal = subdomain === 'portal'

  useEffect(() => {
    // Toon error message uit state als die er is (bijv. van ProtectedRoute redirect)
    const state = location.state as { error?: string } | null
    if (state?.error) {
      setError(state.error)
    }
  }, [location.state])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setLoading(true)

    try {
      await getSanctumCsrfCookie()
      await login({ email, password })

      const from = (location.state as { from?: Location })?.from?.pathname ?? '/dashboard'
      navigate(from, { replace: true })
    } catch (err: any) {
      console.error(err)
      
      // Toon specifieke foutmelding als beschikbaar
      if (err?.response?.status === 422) {
        const validationErrors = err?.response?.data?.errors
        if (validationErrors?.email?.[0]) {
          setError(validationErrors.email[0])
        } else {
          setError('Inloggen mislukt. Controleer je gegevens.')
        }
      } else if (err?.message) {
        setError(err.message)
      } else {
        setError('Inloggen mislukt. Controleer je gegevens.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md p-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Inloggen</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Log in om toegang te krijgen tot het ledensysteem.</p>
        </div>

        {isPortal && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-400 px-4 py-3 rounded-lg mb-4">
            <p className="font-medium">Platform Beheerder Portaal</p>
            <p className="text-sm mt-1">Alleen toegankelijk voor platform beheerders.</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-400 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="login-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              E-mailadres
            </label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label htmlFor="login-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Wachtwoord
            </label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <Button type="submit" disabled={loading} className="w-full" size="lg">
            <LogIn size={16} />
            {loading ? 'Bezig...' : 'Inloggen'}
          </Button>
        </form>

        <div className="mt-6 space-y-2 text-center">
          <Link to="/forgot-password" className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline">
            Wachtwoord vergeten?
          </Link>
          <div>
            <Link to="/aanmelden" className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline">
              Nieuwe lid aanmelden
            </Link>
          </div>
        </div>
      </Card>
    </div>
  )
}

export default LoginPage

