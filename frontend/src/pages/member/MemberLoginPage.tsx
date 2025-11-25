import { type FormEvent, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { LogIn } from 'lucide-react'
import { useMemberAuth } from '../../context/MemberAuthContext'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'

const MemberLoginPage: React.FC = () => {
  const { memberLogin } = useMemberAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const state = (location.state as { activationSuccess?: string } | null) ?? null
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const successMessage = state?.activationSuccess ?? null

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setLoading(true)

    try {
      await memberLogin({ email, password })
      const from = (location.state as { from?: Location })?.from?.pathname ?? '/portal/dashboard'
      navigate(from, { replace: true })
    } catch (err: any) {
      console.error('Member login failed', {
        error: err,
        message: err?.message,
        response: err?.response?.data,
        status: err?.response?.status,
      })
      setError(err?.message ?? 'Inloggen mislukt. Controleer je gegevens.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md p-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Ledenportaal</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Log in om toegang te krijgen tot jouw ledenportaal.</p>
        </div>

        {successMessage && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-400 px-4 py-3 rounded-lg mb-4">
            {successMessage}
          </div>
        )}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-400 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="member-login-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              E-mailadres
            </label>
            <input
              id="member-login-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label htmlFor="member-login-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Wachtwoord
            </label>
            <input
              id="member-login-password"
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
            <Link to="/login" className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline">
              Naar beheerdersportaal
            </Link>
          </div>
        </div>
      </Card>
    </div>
  )
}

export default MemberLoginPage


