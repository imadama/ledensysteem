import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { KeyRound, ArrowLeft, User } from 'lucide-react'
import { apiClient } from '../../api/axios'
import { useMemberAuth } from '../../context/MemberAuthContext'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'

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
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <Card className="w-full max-w-md p-8 text-center">
          <div className="text-gray-600 dark:text-gray-400">Bezig met laden...</div>
        </Card>
      </div>
    )
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <Card className="w-full max-w-md p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Uitnodiging ongeldig</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">Deze link lijkt ongeldig. Vraag een nieuwe uitnodiging aan bij je vereniging.</p>
          <Link to="/portal/login">
            <Button className="w-full">
              <ArrowLeft size={16} />
              Naar inloggen
            </Button>
          </Link>
        </Card>
      </div>
    )
  }

  if (!canActivate) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <Card className="w-full max-w-md p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Uitnodiging ongeldig</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{error ?? 'Deze uitnodiging kan niet meer worden gebruikt.'}</p>
          <Link to="/portal/login">
            <Button className="w-full">
              <ArrowLeft size={16} />
              Naar inloggen
            </Button>
          </Link>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md p-8">
        <div className="text-center mb-6">
          <div className="mx-auto w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mb-4">
            <User className="text-indigo-600 dark:text-indigo-400" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Account activeren</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Je bent uitgenodigd voor het ledenportaal van {info?.organisation_name ?? 'je vereniging'}.
            Maak hieronder een wachtwoord aan om je account te activeren.
          </p>
        </div>

        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 mb-6 space-y-2">
          <div className="flex justify-between">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Naam</span>
            <span className="text-sm text-gray-900 dark:text-white">{info?.member_name ?? 'Onbekend lid'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">E-mailadres</span>
            <span className="text-sm text-gray-900 dark:text-white">{info?.email ?? 'Onbekend'}</span>
          </div>
          {info?.expires_at && (
            <div className="flex justify-between">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Verloopt op</span>
              <span className="text-sm text-gray-900 dark:text-white">{new Date(info.expires_at).toLocaleString('nl-NL')}</span>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-400 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="activation-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Wachtwoord
            </label>
            <input
              id="activation-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={8}
              required
              aria-invalid={fieldErrors.password ? 'true' : 'false'}
              className={`w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                fieldErrors.password ? 'border-red-300 dark:border-red-700' : 'border-gray-300 dark:border-gray-600'
              }`}
            />
            {fieldErrors.password && (
              <div className="text-sm text-red-600 dark:text-red-400 mt-1">{fieldErrors.password.join(' ')}</div>
            )}
          </div>
          <div>
            <label htmlFor="activation-password-confirmation" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Bevestig wachtwoord
            </label>
            <input
              id="activation-password-confirmation"
              type="password"
              value={passwordConfirmation}
              onChange={(event) => setPasswordConfirmation(event.target.value)}
              minLength={8}
              required
              aria-invalid={fieldErrors.password_confirmation ? 'true' : 'false'}
              className={`w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                fieldErrors.password_confirmation ? 'border-red-300 dark:border-red-700' : 'border-gray-300 dark:border-gray-600'
              }`}
            />
            {fieldErrors.password_confirmation && (
              <div className="text-sm text-red-600 dark:text-red-400 mt-1">{fieldErrors.password_confirmation.join(' ')}</div>
            )}
          </div>
          <Button type="submit" disabled={submitting} className="w-full" size="lg">
            <KeyRound size={16} />
            {submitting ? 'Bezig...' : 'Account activeren'}
          </Button>
        </form>
      </Card>
    </div>
  )
}

export default MemberActivationPage


