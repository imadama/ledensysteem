import { type FormEvent, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useMemberAuth } from '../../context/MemberAuthContext'

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
    <div className="card" style={{ maxWidth: 420, margin: '3rem auto' }}>
      <h1>Ledenportaal</h1>
      <p>Log in om toegang te krijgen tot jouw ledenportaal.</p>

      {successMessage && <div className="alert alert--success">{successMessage}</div>}
      {error && <div className="alert alert--error">{error}</div>}

      <form className="form" onSubmit={handleSubmit}>
        <div className="form__group">
          <label htmlFor="member-login-email">E-mailadres</label>
          <input
            id="member-login-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>
        <div className="form__group">
          <label htmlFor="member-login-password">Wachtwoord</label>
          <input
            id="member-login-password"
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
        <Link to="/login">Naar beheerdersportaal</Link>
      </div>
    </div>
  )
}

export default MemberLoginPage


