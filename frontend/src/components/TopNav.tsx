import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useState, useEffect } from 'react'

const TopNav: React.FC = () => {
  const { user, organisation, roles, logout } = useAuth()
  const isOrgAdmin = roles.includes('org_admin')
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const location = useLocation()

  const handleLogout = async () => {
    try {
      setIsMenuOpen(false)
      await logout()
    } catch (error) {
      console.error('Error logging out', error)
    }
  }

  useEffect(() => {
    setIsMenuOpen(false)
  }, [location.pathname])

  return (
    <nav className="top-nav">
      <div className="top-nav__inner">
        <div className="top-nav__container">
          <div className="top-nav__brand-wrapper">
        <Link to="/dashboard" className="top-nav__brand">
          Ledenportaal
        </Link>
        {organisation && (
          <span className="top-nav__organisation">{organisation.name}</span>
        )}
          </div>

          <button
            type="button"
            className="top-nav__toggle"
            aria-label="Menu openen"
            aria-expanded={isMenuOpen}
            onClick={() => setIsMenuOpen((prev) => !prev)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>

        <div className={`top-nav__items ${isMenuOpen ? 'top-nav__items--open' : ''}`}>
        {isOrgAdmin && (
          <>
            <Link to="/organisation/members">Ledenoverzicht</Link>
            <Link to="/organisation/members/new">Nieuw lid</Link>
            <Link to="/organisation/members/import">Bulk upload</Link>
            <Link to="/organisation/settings/payments">Betalingen</Link>
            <Link to="/organisation/contributions">Contributies</Link>
          </>
        )}

          <div className="top-nav__account">
            {user && (
              <span>
                {user.first_name} {user.last_name}
              </span>
            )}
            <button className="top-nav__logout" onClick={handleLogout}>
              Uitloggen
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}

export default TopNav

