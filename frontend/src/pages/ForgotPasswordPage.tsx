import { type FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiClient } from '../api/axios'

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
    <div className="card" style={{ maxWidth: 420, margin: '3rem auto' }}>
      <h1>Wachtwoord vergeten</h1>
      <p>Vul je e-mailadres in om een resetlink te ontvangen.</p>

      {message && <div className="alert alert--success">{message}</div>}
      {error && <div className="alert alert--error">{error}</div>}

      <form className="form" onSubmit={handleSubmit}>
        <div className="form__group">
          <label htmlFor="forgot-email">E-mailadres</label>
          <input
            id="forgot-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>
        <button className="button" type="submit" disabled={loading}>
          {loading ? 'Bezig...' : 'Verstuur resetlink'}
        </button>
      </form>

      <div style={{ marginTop: '1rem' }}>
        <Link to="/login">Terug naar inloggen</Link>
      </div>
    </div>
  )
}

export default ForgotPasswordPage

