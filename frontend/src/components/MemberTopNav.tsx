import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useMemberAuth } from '../context/MemberAuthContext'
import { useState, useEffect } from 'react'

const MemberTopNav: React.FC = () => {
  const { memberUser, memberLogout } = useMemberAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const handleLogout = async () => {
    await memberLogout()
    setIsMenuOpen(false)
    navigate('/portal/login', { replace: true })
  }

  useEffect(() => {
    setIsMenuOpen(false)
  }, [location.pathname])

  return (
    <nav className="top-nav top-nav--member">
      <div className="top-nav__inner">
        <div className="top-nav__container">
          <div className="top-nav__brand-wrapper">
            <NavLink to="/portal/dashboard" className="top-nav__brand">
              Ledenportaal
            </NavLink>
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
          <NavLink to="/portal/dashboard">Dashboard</NavLink>
          <NavLink to="/portal/profile">Mijn gegevens</NavLink>
          <NavLink to="/portal/contribution">Mijn contributie</NavLink>
          <div className="top-nav__account">
            {memberUser && (
              <span>
                {memberUser.member.first_name} {memberUser.member.last_name}
              </span>
            )}
            <button className="top-nav__logout" type="button" onClick={handleLogout}>
              Uitloggen
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}

export default MemberTopNav


