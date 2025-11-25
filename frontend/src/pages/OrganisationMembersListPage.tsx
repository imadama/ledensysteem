import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, UserPlus, Upload, Eye, ChevronUp, ChevronDown, Mail, Ban, CheckCircle2 } from 'lucide-react'
import { apiClient } from '../api/axios'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'

type AccountStatus = 'none' | 'invited' | 'active' | 'blocked'

type Member = {
  id: number
  member_number: string | null
  email: string | null
  full_name: string
  city: string | null
  contribution_amount: string | null
  status: 'active' | 'inactive'
  account_status: AccountStatus
  account_email: string | null
  last_invitation_sent_at: string | null
}

type Meta = {
  current_page: number
  last_page: number
  per_page: number
  total: number
}

const OrganisationMembersListPage: React.FC = () => {
  const [members, setMembers] = useState<Member[]>([])
  const [meta, setMeta] = useState<Meta | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [rowLoading, setRowLoading] = useState<Record<number, boolean>>({})

  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive' | 'all'>('active')
  const [page, setPage] = useState(1)
  const [sortBy, setSortBy] = useState<'full_name' | 'member_number' | 'city'>('full_name')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  useEffect(() => {
    let isMounted = true
    const controller = new AbortController()

    const fetchMembers = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const params: Record<string, string | number | undefined> = {
          page,
          sort_by: sortBy === 'full_name' ? 'name' : sortBy,
          sort_direction: sortDirection,
        }

        if (search) {
          params.q = search
        }

        if (statusFilter !== 'all') {
          params.status = statusFilter
        }

        const { data } = await apiClient.get<{
          data: Member[]
          meta: Meta
        }>('/api/organisation/members', {
          params,
          signal: controller.signal,
        })

        if (!isMounted) {
          return
        }

        setMembers(data.data)
        setMeta(data.meta)
        setSuccessMessage(null)
      } catch (err) {
        if (!isMounted || controller.signal.aborted) {
          return
        }
        console.error('Leden ophalen mislukt', err)
        setError('Kon leden niet ophalen. Probeer het later opnieuw.')
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void fetchMembers()

    return () => {
      isMounted = false
      controller.abort()
    }
  }, [page, search, sortBy, sortDirection, statusFilter])

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setPage(1)
    setSearch(searchInput.trim())
  }

  const handleStatusChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value as 'active' | 'inactive' | 'all'
    setStatusFilter(value)
    setPage(1)
  }

  const handleSort = (column: 'full_name' | 'member_number' | 'city') => {
    if (sortBy === column) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortBy(column)
      setSortDirection('asc')
    }
    setPage(1)
  }

  const handleToggleStatus = async (member: Member) => {
    const newStatus = member.status === 'active' ? 'inactive' : 'active'

    try {
      await apiClient.patch(`/api/organisation/members/${member.id}/status`, {
        status: newStatus,
      })

      setMembers((prev) =>
        prev.map((item) =>
          item.id === member.id
            ? {
                ...item,
                status: newStatus,
              }
            : item,
        ),
      )
    } catch (err) {
      console.error('Status bijwerken mislukt', err)
      setError('Kon de status niet bijwerken. Probeer het later opnieuw.')
    }
  }

  const setRowLoadingState = (memberId: number, value: boolean) => {
    setRowLoading((prev) => ({
      ...prev,
      [memberId]: value,
    }))
  }

  const updateMemberRow = (memberId: number, payload: Partial<Member>) => {
    setMembers((prev) =>
      prev.map((item) =>
        item.id === memberId
          ? {
              ...item,
              ...payload,
            }
          : item,
      ),
    )
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

  const formatDateTime = (dateTime: string | null) => {
    if (!dateTime) {
      return null
    }

    try {
      return new Date(dateTime).toLocaleString('nl-NL', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return dateTime
    }
  }

  const handleInviteMember = async (member: Member) => {
    if (rowLoading[member.id]) {
      return
    }

    setError(null)
    setSuccessMessage(null)
    setRowLoadingState(member.id, true)

    try {
      const { data } = await apiClient.post<{ data: { created_at?: string | null } }>(
        `/api/organisation/members/${member.id}/invite`,
      )

      updateMemberRow(member.id, {
        account_status: 'invited',
        last_invitation_sent_at: data.data.created_at ?? new Date().toISOString(),
      })
      setSuccessMessage('Uitnodiging succesvol verstuurd.')
    } catch (err: any) {
      console.error('Uitnodiging versturen mislukt', err)
      const message =
        err.response?.data?.message ??
        (err.response?.status === 422
          ? 'Uitnodiging kon niet worden verstuurd.'
          : 'Kon uitnodiging niet versturen. Probeer het later opnieuw.')
      setError(message)
    } finally {
      setRowLoadingState(member.id, false)
    }
  }

  const handleBlockAccount = async (member: Member) => {
    if (rowLoading[member.id]) {
      return
    }

    setError(null)
    setSuccessMessage(null)
    setRowLoadingState(member.id, true)

    try {
      const { data } = await apiClient.patch<{ data: Member }>(
        `/api/organisation/members/${member.id}/block-account`,
      )

      updateMemberRow(member.id, {
        account_status: data.data.account_status,
        account_email: data.data.account_email,
        last_invitation_sent_at: data.data.last_invitation_sent_at,
      })
      setSuccessMessage('Accounttoegang geblokkeerd.')
    } catch (err: any) {
      console.error('Blokkeren mislukt', err)
      const message =
        err.response?.data?.message ?? 'Kon account niet blokkeren. Probeer het later opnieuw.'
      setError(message)
    } finally {
      setRowLoadingState(member.id, false)
    }
  }

  const handleUnblockAccount = async (member: Member) => {
    if (rowLoading[member.id]) {
      return
    }

    setError(null)
    setSuccessMessage(null)
    setRowLoadingState(member.id, true)

    try {
      const { data } = await apiClient.patch<{ data: Member }>(
        `/api/organisation/members/${member.id}/unblock-account`,
      )

      updateMemberRow(member.id, {
        account_status: data.data.account_status,
        account_email: data.data.account_email,
        last_invitation_sent_at: data.data.last_invitation_sent_at,
      })
      setSuccessMessage('Accounttoegang gedeblokkeerd.')
    } catch (err: any) {
      console.error('Deblokkeren mislukt', err)
      const message =
        err.response?.data?.message ?? 'Kon account niet deblokkeren. Probeer het later opnieuw.'
      setError(message)
    } finally {
      setRowLoadingState(member.id, false)
    }
  }

  const totalPages = meta?.last_page ?? 1

  const paginationPages = useMemo(() => {
    if (!meta) {
      return [1]
    }

    const pages: number[] = []
    for (let i = 1; i <= meta.last_page; i += 1) {
      pages.push(i)
    }

    return pages
  }, [meta])

  const SortButton: React.FC<{ column: 'full_name' | 'member_number' | 'city'; label: string }> = ({ column, label }) => {
    const isActive = sortBy === column
    return (
      <button
        type="button"
        onClick={() => handleSort(column)}
        className="flex items-center gap-1 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
      >
        {label}
        {isActive && (sortDirection === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />)}
      </button>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Ledenoverzicht</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Beheer alle leden van je organisatie</p>
        </div>
        <div className="flex gap-2">
          <Link to="/organisation/members/new">
            <Button>
              <UserPlus size={16} />
              Nieuw lid
            </Button>
          </Link>
          <Link to="/organisation/members/import">
            <Button variant="outline">
              <Upload size={16} />
              Bulk upload
            </Button>
          </Link>
        </div>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSearchSubmit} className="flex gap-2 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Zoek op lidnummer, naam of e-mail"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={handleStatusChange}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="active">Actief</option>
            <option value="inactive">Inactief</option>
            <option value="all">Alle statussen</option>
          </select>
          <Button type="submit">
            <Search size={16} />
            Zoeken
          </Button>
        </form>
      </Card>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-400 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}
      {successMessage && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-400 px-4 py-3 rounded-lg">
          {successMessage}
        </div>
      )}

      {isLoading && (
        <div className="text-center py-8 text-gray-600 dark:text-gray-400">Bezig met laden...</div>
      )}

      {!isLoading && members.length === 0 && !error && (
        <Card className="p-6">
          <div className="text-center text-gray-500 dark:text-gray-400">
            Geen leden gevonden voor deze filters.
          </div>
        </Card>
      )}

      {!isLoading && members.length > 0 && (
        <Card className="p-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">
                    <SortButton column="member_number" label="Lidnummer" />
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">
                    <SortButton column="full_name" label="Naam" />
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">
                    <SortButton column="city" label="Plaats" />
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Contributie</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Accountstatus</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Acties</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr key={member.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="py-4 px-4 text-gray-900 dark:text-white">{member.member_number ?? '-'}</td>
                    <td className="py-4 px-4 text-gray-900 dark:text-white">{member.full_name}</td>
                    <td className="py-4 px-4 text-gray-600 dark:text-gray-400">{member.city ?? '-'}</td>
                    <td className="py-4 px-4 text-gray-900 dark:text-white font-medium">
                      {member.contribution_amount
                        ? `€ ${Number(member.contribution_amount).toFixed(2)}`
                        : '-'}
                    </td>
                    <td className="py-4 px-4">
                      {member.status === 'active' ? (
                        <Badge variant="success">Actief</Badge>
                      ) : (
                        <Badge variant="default">Inactief</Badge>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <div className="space-y-1">
                        <Badge variant={member.account_status === 'active' ? 'success' : member.account_status === 'invited' ? 'warning' : 'default'}>
                          {getAccountStatusLabel(member.account_status)}
                        </Badge>
                        {member.last_invitation_sent_at && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {formatDateTime(member.last_invitation_sent_at)}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center justify-end gap-2 flex-wrap">
                        <Link to={`/organisation/members/${member.id}`}>
                          <Button variant="outline" size="sm">
                            <Eye size={16} />
                            Details
                          </Button>
                        </Link>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleToggleStatus(member)}
                        >
                          {member.status === 'active' ? 'Deactiveer' : 'Activeer'}
                        </Button>
                        {member.account_status === 'none' && !!member.email && (
                          <Button
                            size="sm"
                            disabled={rowLoading[member.id]}
                            onClick={() => handleInviteMember(member)}
                          >
                            <Mail size={16} />
                            {rowLoading[member.id] ? 'Versturen...' : 'Uitnodigen'}
                          </Button>
                        )}
                        {member.account_status === 'invited' && member.email && (
                          <Button
                            variant="secondary"
                            size="sm"
                            disabled={rowLoading[member.id]}
                            onClick={() => handleInviteMember(member)}
                          >
                            {rowLoading[member.id] ? 'Bezig...' : 'Opnieuw versturen'}
                          </Button>
                        )}
                        {member.account_status === 'active' && (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={rowLoading[member.id]}
                            onClick={() => handleBlockAccount(member)}
                            className="text-red-600 hover:text-red-700 border-red-300"
                          >
                            <Ban size={16} />
                            {rowLoading[member.id] ? 'Bezig...' : 'Blokkeer'}
                          </Button>
                        )}
                        {member.account_status === 'blocked' && (
                          <Button
                            size="sm"
                            disabled={rowLoading[member.id]}
                            onClick={() => handleUnblockAccount(member)}
                          >
                            <CheckCircle2 size={16} />
                            {rowLoading[member.id] ? 'Bezig...' : 'Deblokkeer'}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {meta && meta.last_page > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6 flex-wrap">
              <Button
                size="sm"
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              >
                Vorige
              </Button>
              {paginationPages.map((pageNumber) => (
                <Button
                  key={pageNumber}
                  size="sm"
                  variant={pageNumber === page ? 'primary' : 'outline'}
                  onClick={() => setPage(pageNumber)}
                >
                  {pageNumber}
                </Button>
              ))}
              <Button
                size="sm"
                variant="outline"
                disabled={page >= totalPages}
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              >
                Volgende
              </Button>
            </div>
          )}
        </Card>
      )}
    </div>
  )
}

export default OrganisationMembersListPage


