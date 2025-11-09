import { type FormEvent, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { apiClient } from '../api/axios'

const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token') ?? ''
  const emailParam = searchParams.get('email') ?? ''

  const [email, setEmail] = useState(emailParam)
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setLoading(true)

    try {
      await apiClient.post('/api/auth/reset-password', {
        token,
        email,
        password,
        password_confirmation: passwordConfirmation,
      })
      setMessage('Je wachtwoord is aangepast. Je kunt nu inloggen.')
      setTimeout(() => navigate('/login'), 2000)
    } catch (err) {
      console.error(err)
      setError('Resetten mislukt. Controleer de link of probeer opnieuw.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card" style={{ maxWidth: 420, margin: '3rem auto' }}>
      <h1>Wachtwoord resetten</h1>
      <p>Kies een nieuw wachtwoord voor je account.</p>

      {message && <div className="alert alert--success">{message}</div>}
      {error && <div className="alert alert--error">{error}</div>}

      <form className="form" onSubmit={handleSubmit}>
        <div className="form__group">
          <label htmlFor="reset-email">E-mailadres</label>
          <input
            id="reset-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>
        <div className="form__group">
          <label htmlFor="reset-password">Nieuw wachtwoord</label>
          <input
            id="reset-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={8}
          />
        </div>
        <div className="form__group">
          <label htmlFor="reset-password-confirm">Bevestig wachtwoord</label>
          <input
            id="reset-password-confirm"
            type="password"
            value={passwordConfirmation}
            onChange={(event) => setPasswordConfirmation(event.target.value)}
            required
            minLength={8}
          />
        </div>
        <button className="button" type="submit" disabled={loading}>
          {loading ? 'Bezig...' : 'Reset wachtwoord'}
        </button>
      </form>

      <div style={{ marginTop: '1rem' }}>
        <Link to="/login">Terug naar inloggen</Link>
      </div>
    </div>
  )
}

export default ResetPasswordPage

