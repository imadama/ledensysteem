import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiClient } from '../api/axios'

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

  return (
    <div>
      <div className="page-header">
        <h1>Ledenoverzicht</h1>
        <div className="page-header__actions">
          <Link className="button" to="/organisation/members/new">
            Nieuw lid
          </Link>
          <Link className="button button--secondary" to="/organisation/members/import">
            Bulk upload
          </Link>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <form onSubmit={handleSearchSubmit} className="form-inline">
          <input
            type="text"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Zoek op lidnummer, naam of e-mail"
            className="input"
            style={{ flex: 1 }}
          />
          <select value={statusFilter} onChange={handleStatusChange} className="input">
            <option value="active">Actief</option>
            <option value="inactive">Inactief</option>
            <option value="all">Alle statussen</option>
          </select>
          <button type="submit" className="button">
            Zoeken
          </button>
        </form>
      </div>

      {isLoading && <div>Bezig met laden...</div>}
      {error && <div className="alert alert--error">{error}</div>}
      {successMessage && <div className="alert alert--success">{successMessage}</div>}

      {!isLoading && members.length === 0 && !error && (
        <div className="card">Geen leden gevonden voor deze filters.</div>
      )}

      {!isLoading && members.length > 0 && (
        <div className="card">
          <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>
                  <button type="button" className="table-sort" onClick={() => handleSort('member_number')}>
                    Lidnummer {sortBy === 'member_number' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </button>
                </th>
                <th>
                  <button type="button" className="table-sort" onClick={() => handleSort('full_name')}>
                    Naam {sortBy === 'full_name' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </button>
                </th>
                <th>
                  <button type="button" className="table-sort" onClick={() => handleSort('city')}>
                    Plaats {sortBy === 'city' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </button>
                </th>
                <th>Contributie</th>
                <th>Status</th>
                <th>Accountstatus</th>
                <th>Acties</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.id}>
                  <td>{member.member_number ?? '-'}</td>
                  <td>{member.full_name}</td>
                  <td>{member.city ?? '-'}</td>
                  <td>
                    {member.contribution_amount
                      ? `€ ${Number(member.contribution_amount).toFixed(2)}`
                      : '-'}
                  </td>
                  <td>
                    <span className={`badge badge--${member.status === 'active' ? 'success' : 'secondary'}`}>
                      {member.status === 'active' ? 'Actief' : 'Inactief'}
                    </span>
                  </td>
                  <td>
                    <div className="chip">{getAccountStatusLabel(member.account_status)}</div>
                    {member.last_invitation_sent_at && (
                      <div className="text-muted">
                        Laatste uitnodiging: {formatDateTime(member.last_invitation_sent_at)}
                      </div>
                    )}
                  </td>
                  <td className="table-actions">
                    <Link className="button button--small" to={`/organisation/members/${member.id}`}>
                      Details
                    </Link>
                    <button
                      className="button button--small button--secondary"
                      type="button"
                      onClick={() => handleToggleStatus(member)}
                    >
                      {member.status === 'active' ? 'Deactiveer' : 'Activeer'}
                    </button>
                    {member.account_status === 'none' && !!member.email && (
                      <button
                        className="button button--small"
                        type="button"
                        disabled={rowLoading[member.id]}
                        onClick={() => handleInviteMember(member)}
                      >
                        {rowLoading[member.id] ? 'Versturen...' : 'Uitnodigen'}
                      </button>
                    )}
                    {member.account_status === 'invited' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span className="badge badge--info">Uitnodiging verstuurd</span>
                        {member.email && (
                          <button
                            className="button button--small button--secondary"
                            type="button"
                            disabled={rowLoading[member.id]}
                            onClick={() => handleInviteMember(member)}
                          >
                            {rowLoading[member.id] ? 'Bezig...' : 'Opnieuw versturen'}
                          </button>
                        )}
                      </div>
                    )}
                    {member.account_status === 'active' && (
                      <button
                        className="button button--small button--danger"
                        type="button"
                        disabled={rowLoading[member.id]}
                        onClick={() => handleBlockAccount(member)}
                      >
                        {rowLoading[member.id] ? 'Bezig...' : 'Blokkeer toegang'}
                      </button>
                    )}
                    {member.account_status === 'blocked' && (
                      <button
                        className="button button--small"
                        type="button"
                        disabled={rowLoading[member.id]}
                        onClick={() => handleUnblockAccount(member)}
                      >
                        {rowLoading[member.id] ? 'Bezig...' : 'Deblokkeer toegang'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>

          {meta && meta.last_page > 1 && (
            <div className="pagination">
              <button
                type="button"
                className="button button--small"
                disabled={page <= 1}
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              >
                Vorige
              </button>
              {paginationPages.map((pageNumber) => (
                <button
                  key={pageNumber}
                  type="button"
                  className={`button button--small ${pageNumber === page ? 'button--primary' : 'button--secondary'}`}
                  onClick={() => setPage(pageNumber)}
                >
                  {pageNumber}
                </button>
              ))}
              <button
                type="button"
                className="button button--small"
                disabled={page >= totalPages}
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              >
                Volgende
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default OrganisationMembersListPage


