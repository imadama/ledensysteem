import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { apiClient } from '../../api/axios'
import { useMemberAuth } from '../../context/MemberAuthContext'

type ActivationInfo = {
  member_name: string | null
  organisation_name: string | null
  email: string | null
  expires_at: string | null
}

const MemberActivationPage: React.FC = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token')
  const { loadCurrentMember } = useMemberAuth()
  const [loading, setLoading] = useState(true)
  const [canActivate, setCanActivate] = useState(false)
  const [info, setInfo] = useState<ActivationInfo | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})

  useEffect(() => {
    const loadInvitation = async () => {
      if (!token) {
        setError('Geen token gevonden.')
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)
      setFieldErrors({})

      try {
        const { data } = await apiClient.get<{ can_activate: boolean; data: ActivationInfo }>(
          `/api/member-activation/${token}`,
        )
        setCanActivate(data.can_activate)
        setInfo(data.data)
      } catch (err: any) {
        console.error('Activatietoken ongeldig', err)
        const message = err.response?.data?.message ?? 'Deze uitnodiging is ongeldig of verlopen.'
        setError(message)
        setCanActivate(false)
      } finally {
        setLoading(false)
      }
    }

    void loadInvitation()
  }, [token])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!token) {
      setError('Geen token gevonden.')
      return
    }

    setSubmitting(true)
    setError(null)
    setFieldErrors({})

    try {
      await apiClient.post(`/api/member-activation/${token}`, {
        password,
        password_confirmation: passwordConfirmation,
      })

      const profile = await loadCurrentMember()

      if (profile) {
        navigate('/portal/dashboard', { replace: true })
        return
      }

      navigate('/portal/login', {
        replace: true,
        state: {
          activationSuccess: 'Je account is geactiveerd. Log in met je e-mailadres en nieuwe wachtwoord.',
        },
      })
    } catch (err: any) {
      console.error('Activatie mislukt', err)
      if (err.response?.status === 422) {
        const rawErrors = err.response?.data?.errors ?? {}
        const normalized: Record<string, string[]> = Object.entries(rawErrors).reduce(
          (acc, [key, value]) => {
            acc[key] = Array.isArray(value) ? value.map(String) : [String(value)]
            return acc
          },
          {} as Record<string, string[]>,
        )
        setFieldErrors(normalized)
        const messages = Object.values(normalized).flat().join(' ')
        if (messages) {
          setError(messages)
        } else {
          setError('Wachtwoord voldoet niet aan de eisen.')
        }
      } else {
        setError(err.response?.data?.message ?? 'Activatie mislukt. Probeer het later opnieuw.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div className="card" style={{ maxWidth: 480, margin: '3rem auto' }}>Bezig met laden...</div>
  }

  if (!token) {
    return (
      <div className="card" style={{ maxWidth: 480, margin: '3rem auto' }}>
        <h1>Uitnodiging ongeldig</h1>
        <p>Deze link lijkt ongeldig. Vraag een nieuwe uitnodiging aan bij je vereniging.</p>
        <Link className="button" to="/portal/login">
          Naar inloggen
        </Link>
      </div>
    )
  }

  if (!canActivate) {
    return (
      <div className="card" style={{ maxWidth: 480, margin: '3rem auto' }}>
        <h1>Uitnodiging ongeldig</h1>
        <p>{error ?? 'Deze uitnodiging kan niet meer worden gebruikt.'}</p>
        <Link className="button" to="/portal/login">
          Naar inloggen
        </Link>
      </div>
    )
  }

  return (
    <div className="card" style={{ maxWidth: 480, margin: '3rem auto' }}>
      <h1>Account activeren</h1>
      <p>
        Je bent uitgenodigd voor het ledenportaal van {info?.organisation_name ?? 'je vereniging'}.
        Maak hieronder een wachtwoord aan om je account te activeren.
      </p>

      <dl style={{ display: 'grid', gap: '0.5rem', marginBottom: '1rem' }}>
        <div>
          <dt>Naam</dt>
          <dd>{info?.member_name ?? 'Onbekend lid'}</dd>
        </div>
        <div>
          <dt>E-mailadres</dt>
          <dd>{info?.email ?? 'Onbekend'}</dd>
        </div>
        {info?.expires_at && (
        <div>
          <dt>Verloopt op</dt>
          <dd>{new Date(info.expires_at).toLocaleString('nl-NL')}</dd>
        </div>
        )}
      </dl>

      {error && <div className="alert alert--error">{error}</div>}
      <form className="form" onSubmit={handleSubmit}>
        <div className="form__group">
          <label htmlFor="activation-password">Wachtwoord</label>
          <input
            id="activation-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={8}
            required
            aria-invalid={fieldErrors.password ? 'true' : 'false'}
          />
          {fieldErrors.password && (
            <div className="form__error">{fieldErrors.password.join(' ')}</div>
          )}
        </div>
        <div className="form__group">
          <label htmlFor="activation-password-confirmation">Bevestig wachtwoord</label>
          <input
            id="activation-password-confirmation"
            type="password"
            value={passwordConfirmation}
            onChange={(event) => setPasswordConfirmation(event.target.value)}
            minLength={8}
            required
            aria-invalid={fieldErrors.password_confirmation ? 'true' : 'false'}
          />
          {fieldErrors.password_confirmation && (
            <div className="form__error">{fieldErrors.password_confirmation.join(' ')}</div>
          )}
        </div>
        <button className="button" type="submit" disabled={submitting}>
          {submitting ? 'Bezig...' : 'Account activeren'}
        </button>
      </form>
    </div>
  )
}

export default MemberActivationPage


