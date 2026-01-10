import { type FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, ArrowLeft } from 'lucide-react'
import { apiClient } from '../api/axios'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'

const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setMessage(null)
    setError(null)
    setLoading(true)

    try {
      await apiClient.post('/api/auth/forgot-password', { email })
      setMessage('Als dit e-mailadres bekend is, ontvang je zo een e-mail met instructies.')
      setEmail('')
    } catch (err) {
      console.error(err)
      setError('Er ging iets mis. Probeer het later opnieuw.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md p-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Wachtwoord vergeten</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Vul je e-mailadres in om een resetlink te ontvangen.</p>
        </div>

        {message && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-400 px-4 py-3 rounded-lg mb-4">
            {message}
          </div>
        )}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-400 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="forgot-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              E-mailadres
            </label>
            <input
              id="forgot-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-aidatim-blue"
            />
          </div>
          <Button type="submit" disabled={loading} className="w-full" size="lg">
            <Mail size={16} />
            {loading ? 'Bezig...' : 'Verstuur resetlink'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <Link to="/login" className="text-sm text-aidatim-blue dark:text-aidatim-blue hover:underline flex items-center justify-center gap-1">
            <ArrowLeft size={16} />
            Terug naar inloggen
          </Link>
        </div>
      </Card>
    </div>
  )
}

export default ForgotPasswordPage

