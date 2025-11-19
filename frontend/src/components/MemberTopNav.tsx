import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useMemberAuth } from '../context/MemberAuthContext'
import { useState, useEffect } from 'react'

const MemberTopNav: React.FC = () => {
  const { memberUser, memberLogout } = useMemberAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const handleLogout = async () => {
    try {
      setIsMenuOpen(false)
      await memberLogout()
      navigate('/portal/login', { replace: true })
    } catch (error) {
      console.error('Error logging out', error)
    }
  }

  useEffect(() => {
    setIsMenuOpen(false)
  }, [location.pathname])

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/')
  }

  return (
    <nav className="top-nav top-nav--member">
      <div className="top-nav__inner">
        <div className="top-nav__container">
          <div className="top-nav__brand-wrapper">
            <Link to="/portal/dashboard" className="top-nav__brand">
              Ledenportaal
            </Link>
            {memberUser?.organisation?.name && (
              <span className="top-nav__organisation">{memberUser.organisation.name}</span>
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
          <Link to="/portal/dashboard" className={isActive('/portal/dashboard') ? 'active' : ''}>
            Dashboard
          </Link>
          <Link to="/portal/profile" className={isActive('/portal/profile') ? 'active' : ''}>
            Mijn gegevens
          </Link>
          <Link to="/portal/contribution" className={isActive('/portal/contribution') ? 'active' : ''}>
            Mijn contributie
          </Link>

          <div className="top-nav__account">
            {memberUser && (
              <span>
                {memberUser.member.first_name} {memberUser.member.last_name}
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

export default MemberTopNav


