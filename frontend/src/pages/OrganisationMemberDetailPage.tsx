import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import MemberForm, { type MemberFormErrors, type MemberFormValues } from '../components/Organisation/MemberForm'
import { apiClient } from '../api/axios'

type AccountStatus = 'none' | 'invited' | 'active' | 'blocked'

type MemberResponse = {
  id: number
  member_number: string | null
  first_name: string
  last_name: string
  gender: 'm' | 'f'
  birth_date: string | null
  email: string | null
  phone: string | null
  street_address: string | null
  postal_code: string | null
  city: string | null
  iban: string | null
  status: 'active' | 'inactive'
  contribution_amount: string | null
  contribution_frequency: string | null
  contribution_start_date: string | null
  contribution_note: string | null
  created_at: string | null
  updated_at: string | null
  account_status: AccountStatus
  account_email: string | null
  last_invitation_sent_at: string | null
}

const OrganisationMemberDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [initialValues, setInitialValues] = useState<MemberFormValues | null>(null)
  const [status, setStatus] = useState<'active' | 'inactive'>('active')
  const [isLoading, setIsLoading] = useState(true)
  const [errors, setErrors] = useState<MemberFormErrors>({})
  const [generalError, setGeneralError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [statusUpdating, setStatusUpdating] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [accountStatus, setAccountStatus] = useState<AccountStatus>('none')
  const [accountEmail, setAccountEmail] = useState<string | null>(null)
  const [lastInvitationSentAt, setLastInvitationSentAt] = useState<string | null>(null)
  const [accountAction, setAccountAction] = useState<'invite' | 'block' | 'unblock' | null>(null)
  const [accountError, setAccountError] = useState<string | null>(null)
  const [accountSuccess, setAccountSuccess] = useState<string | null>(null)
  const isAccountActionLoading = accountAction !== null

  useEffect(() => {
    let isMounted = true
    const controller = new AbortController()

    const fetchMember = async () => {
      if (!id) {
        return
      }

      setIsLoading(true)
      setLoadError(null)

      try {
        const { data } = await apiClient.get<{ data: MemberResponse }>(`/api/organisation/members/${id}`, {
          signal: controller.signal,
        })

        if (!isMounted) {
          return
        }

        const member = data.data

        setInitialValues({
          member_number: member.member_number ?? '',
          first_name: member.first_name ?? '',
          last_name: member.last_name ?? '',
          gender: member.gender ?? 'm',
          birth_date: member.birth_date ?? '',
          email: member.email ?? '',
          phone: member.phone ?? '',
          street_address: member.street_address ?? '',
          postal_code: member.postal_code ?? '',
          city: member.city ?? '',
          iban: member.iban ?? '',
          contribution_amount: member.contribution_amount ?? '',
          contribution_frequency: (member.contribution_frequency as MemberFormValues['contribution_frequency']) ?? 'none',
          contribution_start_date: member.contribution_start_date ?? '',
          contribution_note: member.contribution_note ?? '',
          status: member.status,
        })
        setStatus(member.status)
        setAccountStatus(member.account_status)
        setAccountEmail(member.account_email)
        setLastInvitationSentAt(member.last_invitation_sent_at)
        setAccountError(null)
        setAccountSuccess(null)
      } catch (error: any) {
        if (!isMounted || controller.signal.aborted) {
          return
        }
        if (error.response?.status === 404) {
          setLoadError('Lid niet gevonden.')
        } else {
          setLoadError('Kon lid niet ophalen. Probeer het later opnieuw.')
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void fetchMember()

    return () => {
      isMounted = false
      controller.abort()
    }
  }, [id])

  const handleSubmit = async (values: MemberFormValues) => {
    if (!id) {
      return
    }

    setErrors({})
    setGeneralError(null)
    setIsSubmitting(true)

    try {
      const payload = {
        ...values,
        birth_date: values.birth_date || null,
        contribution_amount: values.contribution_amount ? Number(values.contribution_amount) : null,
        contribution_frequency: values.contribution_frequency === 'none' ? null : values.contribution_frequency,
        contribution_start_date: values.contribution_start_date || null,
        contribution_note: values.contribution_note || null,
      }

      await apiClient.put(`/api/organisation/members/${id}`, payload)

      setGeneralError(null)
      setErrors({})
    } catch (error: any) {
      if (error.response?.status === 422) {
        setErrors(error.response.data.errors ?? {})
      } else if (error.response?.status === 404) {
        setGeneralError('Lid niet gevonden.')
      } else {
        setGeneralError('Opslaan mislukt. Probeer het later opnieuw.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleToggleStatus = async () => {
    if (!id) {
      return
    }

    const newStatus = status === 'active' ? 'inactive' : 'active'

    try {
      setStatusUpdating(true)
      await apiClient.patch(`/api/organisation/members/${id}/status`, { status: newStatus })
      setStatus(newStatus)
      setInitialValues((prev) =>
        prev
          ? {
              ...prev,
              status: newStatus,
            }
          : prev,
      )
    } catch (error) {
      console.error('Status bijwerken mislukt', error)
      setGeneralError('Kon de status niet bijwerken. Probeer het later opnieuw.')
    } finally {
      setStatusUpdating(false)
    }
  }

  const getAccountStatusLabel = (status: AccountStatus) => {
    switch (status) {
      case 'invited':
        return 'Uitgenodigd'
      case 'active':
        return 'Actief'
      case 'blocked':
        return 'Geblokkeerd'
      default:
        return 'Geen account'
    }
  }

  const formatDateTime = (value: string | null) => {
    if (!value) {
      return null
    }

    try {
      return new Date(value).toLocaleString('nl-NL', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return value
    }
  }

  const handleInviteMember = async () => {
    if (!id || accountAction) {
      return
    }

    setAccountError(null)
    setAccountSuccess(null)
    setAccountAction('invite')

    try {
      const { data } = await apiClient.post<{ data: { created_at?: string | null } }>(
        `/api/organisation/members/${id}/invite`,
      )

      setAccountStatus('invited')
      setLastInvitationSentAt(data.data.created_at ?? new Date().toISOString())
      setAccountSuccess('Uitnodiging verstuurd.')
    } catch (error: any) {
      console.error('Uitnodiging versturen mislukt', error)
      const message =
        error.response?.data?.message ??
        (error.response?.status === 422
          ? 'Uitnodiging kon niet worden verstuurd.'
          : 'Kon uitnodiging niet versturen. Probeer het later opnieuw.')
      setAccountError(message)
    } finally {
      setAccountAction(null)
    }
  }

  const handleBlockAccount = async () => {
    if (!id || accountAction) {
      return
    }

    setAccountError(null)
    setAccountSuccess(null)
    setAccountAction('block')

    try {
      const { data } = await apiClient.patch<{ data: MemberResponse }>(
        `/api/organisation/members/${id}/block-account`,
      )
      const member = data.data

      setAccountStatus(member.account_status)
      setAccountEmail(member.account_email)
      setLastInvitationSentAt(member.last_invitation_sent_at)
      setAccountSuccess('Accounttoegang geblokkeerd.')
    } catch (error: any) {
      console.error('Account blokkeren mislukt', error)
      const message =
        error.response?.data?.message ?? 'Kon account niet blokkeren. Probeer het later opnieuw.'
      setAccountError(message)
    } finally {
      setAccountAction(null)
    }
  }

  const handleUnblockAccount = async () => {
    if (!id || accountAction) {
      return
    }

    setAccountError(null)
    setAccountSuccess(null)
    setAccountAction('unblock')

    try {
      const { data } = await apiClient.patch<{ data: MemberResponse }>(
        `/api/organisation/members/${id}/unblock-account`,
      )
      const member = data.data

      setAccountStatus(member.account_status)
      setAccountEmail(member.account_email)
      setLastInvitationSentAt(member.last_invitation_sent_at)
      setAccountSuccess('Accounttoegang gedeblokkeerd.')
    } catch (error: any) {
      console.error('Account deblokkeren mislukt', error)
      const message =
        error.response?.data?.message ?? 'Kon account niet deblokkeren. Probeer het later opnieuw.'
      setAccountError(message)
    } finally {
      setAccountAction(null)
    }
  }

  if (isLoading) {
    return <div>Bezig met laden...</div>
  }

  if (loadError) {
    return (
      <div>
        <div className="alert alert--error">{loadError}</div>
        <button className="button" type="button" onClick={() => navigate('/organisation/members')} style={{ marginTop: '1rem' }}>
          Terug naar overzicht
        </button>
      </div>
    )
  }

  if (!initialValues) {
    return null
  }

  return (
    <div>
      <div className="page-header">
        <h1>{initialValues.first_name} {initialValues.last_name}</h1>
        <div className="page-header__actions">
          <span className={`badge badge--${status === 'active' ? 'success' : 'secondary'}`}>
            {status === 'active' ? 'Actief' : 'Inactief'}
          </span>
          <button
            type="button"
            className="button button--secondary"
            disabled={statusUpdating}
            onClick={handleToggleStatus}
          >
            {statusUpdating ? 'Bezig...' : status === 'active' ? 'Deactiveer lid' : 'Activeer lid'}
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h2>Account</h2>
        {accountError && <div className="alert alert--error">{accountError}</div>}
        {accountSuccess && <div className="alert alert--success">{accountSuccess}</div>}
        <div style={{ display: 'grid', gap: '0.75rem', marginBottom: '1rem' }}>
          <div>
            <strong>Status</strong>
            <div>{getAccountStatusLabel(accountStatus)}</div>
          </div>
          <div>
            <strong>Account e-mail</strong>
            <div>{accountEmail ?? initialValues.email ?? 'Niet bekend'}</div>
          </div>
          <div>
            <strong>Laatste uitnodiging</strong>
            <div>{formatDateTime(lastInvitationSentAt) ?? 'Nog niet verstuurd'}</div>
          </div>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {accountStatus === 'none' && (
            initialValues.email ? (
              <button
                type="button"
                className="button"
                disabled={isAccountActionLoading}
                onClick={handleInviteMember}
              >
                {accountAction === 'invite' ? 'Versturen...' : 'Uitnodiging versturen'}
              </button>
            ) : (
              <span className="text-muted">Geen e-mailadres bekend om uit te nodigen.</span>
            )
          )}
          {accountStatus === 'invited' && (
            <>
              <span className="badge badge--info">Uitnodiging verstuurd</span>
              {initialValues.email && (
                <button
                  type="button"
                  className="button button--secondary"
                  disabled={isAccountActionLoading}
                  onClick={handleInviteMember}
                >
                  {accountAction === 'invite' ? 'Versturen...' : 'Opnieuw versturen'}
                </button>
              )}
            </>
          )}
          {accountStatus === 'active' && (
            <button
              type="button"
              className="button button--danger"
              disabled={isAccountActionLoading}
              onClick={handleBlockAccount}
            >
              {accountAction === 'block' ? 'Bezig...' : 'Blokkeer toegang'}
            </button>
          )}
          {accountStatus === 'blocked' && (
            <button
              type="button"
              className="button"
              disabled={isAccountActionLoading}
              onClick={handleUnblockAccount}
            >
              {accountAction === 'unblock' ? 'Bezig...' : 'Deblokkeer toegang'}
            </button>
          )}
        </div>
      </div>

      <div className="card">
        <MemberForm
          initialValues={initialValues}
          onSubmit={handleSubmit}
          errors={errors}
          generalError={generalError}
          isSubmitting={isSubmitting}
          submitLabel="Wijzigingen opslaan"
        />
      </div>
    </div>
  )
}

export default OrganisationMemberDetailPage


