import { type FormEvent, useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { apiClient } from '../api/axios'

const LoginPage: React.FC = () => {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setLoading(true)

    try {
      await apiClient.get('/sanctum/csrf-cookie')
      await login({ email, password })

      const from = (location.state as { from?: Location })?.from?.pathname ?? '/dashboard'
      navigate(from, { replace: true })
    } catch (err) {
      console.error(err)
      setError('Inloggen mislukt. Controleer je gegevens.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card" style={{ maxWidth: 420, margin: '3rem auto' }}>
      <h1>Inloggen</h1>
      <p>Log in om toegang te krijgen tot het ledensysteem.</p>

      {error && <div className="alert alert--error">{error}</div>}

      <form className="form" onSubmit={handleSubmit}>
        <div className="form__group">
          <label htmlFor="login-email">E-mailadres</label>
          <input
            id="login-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>
        <div className="form__group">
          <label htmlFor="login-password">Wachtwoord</label>
          <input
            id="login-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </div>
        <button className="button" type="submit" disabled={loading}>
          {loading ? 'Bezig...' : 'Inloggen'}
        </button>
      </form>

      <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <Link to="/forgot-password">Wachtwoord vergeten?</Link>
        <Link to="/register-organisation">Nieuwe organisatie registreren</Link>
      </div>
    </div>
  )
}

export default LoginPage

