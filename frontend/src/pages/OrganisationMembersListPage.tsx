import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiClient } from '../api/axios'

type Member = {
  id: number
  member_number: string | null
  full_name: string
  city: string | null
  contribution_amount: string | null
  status: 'active' | 'inactive'
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
        <form onSubmit={handleSearchSubmit} className="form-inline" style={{ gap: '1rem' }}>
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

      {!isLoading && members.length === 0 && !error && (
        <div className="card">Geen leden gevonden voor deze filters.</div>
      )}

      {!isLoading && members.length > 0 && (
        <div className="card">
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

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


