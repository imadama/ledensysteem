import { useMemo, useState, useEffect, useRef } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const AppHeader: React.FC = () => {
  const { user, organisation, roles, logout } = useAuth()
  const location = useLocation()
  const [isNavOpen, setIsNavOpen] = useState(false)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement | null>(null)

  const navItems = useMemo(() => {
    const items: Array<{ to: string; label: string }> = [
      { to: '/dashboard', label: 'Dashboard' },
    ]

    if (roles.includes('org_admin')) {
      items.push(
        { to: '/organisation/dashboard', label: 'Organisatie' },
        { to: '/organisation/users', label: 'Beheerders' },
        { to: '/organisation/members', label: 'Leden' },
        { to: '/organisation/members/new', label: 'Nieuw lid' },
        { to: '/organisation/members/import', label: 'Import' },
        { to: '/organisation/contributions', label: 'Contributies' },
      )
    }

    if (roles.includes('platform_admin')) {
      items.push(
        { to: '/platform/organisations', label: 'Platform' },
        { to: '/platform/plans', label: 'Plannen' },
      )
    }

    return items
      .filter(
        (item, index, array) => array.findIndex((existingItem) => existingItem.to === item.to) === index,
      )
      .map((item) => ({
        ...item,
        label: item.label,
      }))
  }, [roles])

  const initials = useMemo(() => {
    if (!user) {
      return '?'
    }

    const first = user.first_name?.trim().charAt(0) ?? ''
    const last = user.last_name?.trim().charAt(0) ?? ''

    return `${first}${last}`.toUpperCase() || user.email?.charAt(0).toUpperCase() || '?'
  }, [user])

  const handleLogout = async () => {
    try {
      setIsDropdownOpen(false)
      await logout()
    } catch (error) {
      console.error('Kon niet uitloggen', error)
    }
  }

  useEffect(() => {
    setIsNavOpen(false)
    setIsDropdownOpen(false)
  }, [location.pathname])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!dropdownRef.current) {
        return
      }

      if (!dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isDropdownOpen])

  const hasRoutes = navItems.length > 0

  if (!user || !hasRoutes) {
    return null
  }

  return (
    <header className="app-header">
      <div className="app-header__inner">
        <div className="app-header__branding">
          <Link to="/dashboard" className="app-header__logo" aria-label="Ga naar dashboard">
            <span className="app-header__logo-mark">LS</span>
            <span className="app-header__logo-text">LedenSysteem</span>
          </Link>
          {organisation?.name && <span className="app-header__organisation">{organisation.name}</span>}
        </div>

        <button
          type="button"
          className="app-header__menu-toggle"
          aria-label="Navigatie openen of sluiten"
          aria-expanded={isNavOpen}
          onClick={() => setIsNavOpen((prev) => !prev)}
        >
          <span />
          <span />
          <span />
        </button>

        <nav className={`app-header__nav ${isNavOpen ? 'app-header__nav--open' : ''}`} aria-label="Hoofdmenu">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `app-header__nav-link ${isActive ? 'app-header__nav-link--active' : ''}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="app-header__actions" ref={dropdownRef}>
          <button
            type="button"
            className="app-header__avatar-button"
            aria-haspopup="menu"
            aria-expanded={isDropdownOpen}
            onClick={() => setIsDropdownOpen((prev) => !prev)}
          >
            <div className="app-header__avatar" aria-hidden="true">
              {initials}
            </div>
            <div className="app-header__user-info">
              <span className="app-header__user-name">
                {user.first_name} {user.last_name}
              </span>
              <span className="app-header__user-role">
                {roles.includes('platform_admin')
                  ? 'Platform admin'
                  : roles.includes('org_admin')
                    ? 'Organisatie admin'
                    : 'Gebruiker'}
              </span>
            </div>
          </button>

          <div className={`app-header__dropdown ${isDropdownOpen ? 'app-header__dropdown--open' : ''}`}>
            {roles.includes('org_admin') && (
              <NavLink to="/organisation/subscription" className="app-header__dropdown-link">
                Abonnement
              </NavLink>
            )}
            {roles.includes('org_admin') && (
              <NavLink to="/organisation/settings/payments" className="app-header__dropdown-link">
                Instellingen
              </NavLink>
            )}
            <button type="button" className="app-header__dropdown-link app-header__dropdown-link--danger" onClick={handleLogout}>
              Uitloggen
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}

export default AppHeader

