import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { ArrowLeft, User, Mail, Calendar, Ban, CheckCircle2, UserCheck } from 'lucide-react'
import MemberForm, { type MemberFormErrors, type MemberFormValues } from '../components/Organisation/MemberForm'
import { apiClient } from '../api/axios'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'

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

type ContributionPaymentInfo = {
  transaction_id: number | null
  status: string | null
  type: string | null
  date: string | null
}

type ContributionRecord = {
  id: number
  period: string | null
  amount: number | string | null
  status: string
  payment: ContributionPaymentInfo | null
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
  const [activeTab, setActiveTab] = useState<'details' | 'payments'>('details')
  const [contributions, setContributions] = useState<ContributionRecord[]>([])
  const [contributionsLoading, setContributionsLoading] = useState(false)
  const [contributionsError, setContributionsError] = useState<string | null>(null)
  const [contributionsLoaded, setContributionsLoaded] = useState(false)

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

  const fetchContributions = useCallback(async () => {
    if (!id) {
      return
    }

    setContributionsLoading(true)
    setContributionsError(null)

    try {
      const { data } = await apiClient.get<{ data: ContributionRecord[] }>(
        `/api/organisation/members/${id}/contributions`,
      )
      setContributions(data.data)
      setContributionsLoaded(true)
    } catch (error) {
      console.error('Betalingen ophalen mislukt', error)
      setContributionsError('Kon betalingen niet ophalen. Probeer het later opnieuw.')
    } finally {
      setContributionsLoading(false)
    }
  }, [id])

  useEffect(() => {
    setContributions([])
    setContributionsLoaded(false)
  }, [id])

  useEffect(() => {
    if (activeTab === 'payments' && !contributionsLoaded) {
      void fetchContributions()
    }
  }, [activeTab, contributionsLoaded, fetchContributions])

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

  const formatPeriod = (value: string | null) => {
    if (!value) {
      return 'Onbekend'
    }

    const date = new Date(value)
    if (Number.isNaN(date.getTime())) {
      return value
    }

    return date.toLocaleDateString('nl-NL', {
      year: 'numeric',
      month: 'long',
    })
  }

  const formatAmount = (value: number | string | null) => {
    if (value === null || value === '') {
      return '—'
    }

    const numericValue = typeof value === 'string' ? Number.parseFloat(value) : value

    if (Number.isNaN(numericValue)) {
      return '—'
    }

    return `€ ${numericValue.toLocaleString('nl-NL', { minimumFractionDigits: 2 })}`
  }

  const getContributionStatusLabel = (value: string) => {
    switch (value) {
      case 'open':
        return 'Open'
      case 'processing':
        return 'In behandeling'
      case 'paid':
        return 'Betaald'
      case 'failed':
        return 'Mislukt'
      case 'canceled':
        return 'Geannuleerd'
      default:
        return value
    }
  }

  const getPaymentStatusLabel = (value: string | null) => {
    if (!value) {
      return 'Geen betaling'
    }

    switch (value) {
      case 'processing':
        return 'In behandeling'
      case 'succeeded':
        return 'Gelukt'
      case 'failed':
        return 'Mislukt'
      case 'canceled':
        return 'Geannuleerd'
      default:
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
    return (
      <div className="text-center py-8 text-gray-600 dark:text-gray-400">Bezig met laden...</div>
    )
  }

  if (loadError) {
    return (
      <div className="space-y-4">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-400 px-4 py-3 rounded-lg">
          {loadError}
        </div>
        <Button onClick={() => navigate('/organisation/members')}>
          <ArrowLeft size={16} />
          Terug naar overzicht
        </Button>
      </div>
    )
  }

  if (!initialValues) {
    return null
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Link to="/organisation/members">
            <Button variant="outline" size="sm">
              <ArrowLeft size={16} />
              Terug
            </Button>
          </Link>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {initialValues.first_name} {initialValues.last_name}
            </h2>
            {initialValues.member_number && (
              <p className="text-gray-600 dark:text-gray-400 mt-1">Lidnummer: {initialValues.member_number}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant={status === 'active' ? 'success' : 'default'}>
            {status === 'active' ? 'Actief' : 'Inactief'}
          </Badge>
          <Button
            variant="secondary"
            size="sm"
            disabled={statusUpdating}
            onClick={handleToggleStatus}
          >
            {statusUpdating ? 'Bezig...' : status === 'active' ? 'Deactiveer lid' : 'Activeer lid'}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex gap-4">
          <button
            onClick={() => setActiveTab('details')}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'details'
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            <User size={16} className="inline mr-1" />
            Gegevens
          </button>
          <button
            onClick={() => setActiveTab('payments')}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'payments'
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            <Calendar size={16} className="inline mr-1" />
            Betalingen
          </button>
        </nav>
      </div>

      {/* Error/Success Messages */}
      {generalError && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-400 px-4 py-3 rounded-lg">
          {generalError}
        </div>
      )}

      {activeTab === 'details' ? (
        <div className="space-y-6">
          {/* Account Section */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <User size={20} className="text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Account</h3>
            </div>
            
            {accountError && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-400 px-4 py-3 rounded-lg mb-4">
                {accountError}
              </div>
            )}
            {accountSuccess && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-400 px-4 py-3 rounded-lg mb-4">
                {accountSuccess}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Status</p>
                <div>
                  <Badge
                    variant={
                      accountStatus === 'active'
                        ? 'success'
                        : accountStatus === 'invited'
                        ? 'warning'
                        : accountStatus === 'blocked'
                        ? 'error'
                        : 'default'
                    }
                  >
                    {getAccountStatusLabel(accountStatus)}
                  </Badge>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Account e-mail</p>
                <p className="text-gray-900 dark:text-white">{accountEmail ?? initialValues.email ?? 'Niet bekend'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Laatste uitnodiging</p>
                <p className="text-gray-900 dark:text-white">
                  {formatDateTime(lastInvitationSentAt) ?? 'Nog niet verstuurd'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {accountStatus === 'none' &&
                (initialValues.email ? (
                  <Button
                    disabled={isAccountActionLoading}
                    onClick={handleInviteMember}
                    size="sm"
                  >
                    <Mail size={16} />
                    {accountAction === 'invite' ? 'Versturen...' : 'Uitnodiging versturen'}
                  </Button>
                ) : (
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    Geen e-mailadres bekend om uit te nodigen.
                  </span>
                ))}
              {accountStatus === 'invited' && (
                <>
                  <Badge variant="warning">Uitnodiging verstuurd</Badge>
                  {initialValues.email && (
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={isAccountActionLoading}
                      onClick={handleInviteMember}
                    >
                      {accountAction === 'invite' ? 'Versturen...' : 'Opnieuw versturen'}
                    </Button>
                  )}
                </>
              )}
              {accountStatus === 'active' && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isAccountActionLoading}
                  onClick={handleBlockAccount}
                  className="text-red-600 hover:text-red-700 border-red-300 dark:text-red-400 dark:border-red-600"
                >
                  <Ban size={16} />
                  {accountAction === 'block' ? 'Bezig...' : 'Blokkeer toegang'}
                </Button>
              )}
              {accountStatus === 'blocked' && (
                <Button
                  size="sm"
                  disabled={isAccountActionLoading}
                  onClick={handleUnblockAccount}
                >
                  <UserCheck size={16} />
                  {accountAction === 'unblock' ? 'Bezig...' : 'Deblokkeer toegang'}
                </Button>
              )}
            </div>
          </Card>

          {/* Member Form */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <User size={20} className="text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Lidgegevens</h3>
            </div>
            <MemberForm
              initialValues={initialValues}
              onSubmit={handleSubmit}
              errors={errors}
              generalError={generalError}
              isSubmitting={isSubmitting}
              submitLabel="Wijzigingen opslaan"
            />
          </Card>
        </div>
      ) : (
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Calendar size={20} className="text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Betalingen</h3>
          </div>

          {contributionsError && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-400 px-4 py-3 rounded-lg mb-4">
              {contributionsError}
            </div>
          )}

          {contributionsLoading ? (
            <div className="text-center py-8 text-gray-600 dark:text-gray-400">
              Betalingen worden geladen...
            </div>
          ) : contributions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Periode</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Bedrag</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Status contributie</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Status betaling</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Betaald op</th>
                  </tr>
                </thead>
                <tbody>
                  {contributions.map((record) => (
                    <tr
                      key={record.id}
                      className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    >
                      <td className="py-4 px-4 text-gray-900 dark:text-white">{formatPeriod(record.period)}</td>
                      <td className="py-4 px-4 text-gray-900 dark:text-white font-medium">
                        {formatAmount(record.amount)}
                      </td>
                      <td className="py-4 px-4">
                        <Badge
                          variant={
                            record.status === 'paid'
                              ? 'success'
                              : record.status === 'failed'
                              ? 'error'
                              : record.status === 'processing'
                              ? 'warning'
                              : 'default'
                          }
                        >
                          {getContributionStatusLabel(record.status)}
                        </Badge>
                      </td>
                      <td className="py-4 px-4">
                        {record.payment?.status ? (
                          <Badge
                            variant={
                              record.payment.status === 'succeeded'
                                ? 'success'
                                : record.payment.status === 'failed'
                                ? 'error'
                                : record.payment.status === 'processing'
                                ? 'warning'
                                : 'default'
                            }
                          >
                            {getPaymentStatusLabel(record.payment.status)}
                          </Badge>
                        ) : (
                          <span className="text-gray-500 dark:text-gray-400">Geen betaling</span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-gray-600 dark:text-gray-400">
                        {formatDateTime(record.payment?.date ?? null) ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              Geen contributies gevonden.
            </div>
          )}
        </Card>
      )}
    </div>
  )
}

export default OrganisationMemberDetailPage


