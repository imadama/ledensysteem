import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const TopNav: React.FC = () => {
  const { user, organisation, logout } = useAuth()

  const handleLogout = async () => {
    try {
      await logout()
    } catch (error) {
      console.error('Error logging out', error)
    }
  }

  return (
    <nav className="top-nav">
      <div className="top-nav__left">
        <Link to="/dashboard" className="top-nav__brand">
          Ledenportaal
        </Link>
        {organisation && (
          <span className="top-nav__organisation">{organisation.name}</span>
        )}
      </div>
      <div className="top-nav__right">
        {user && <span className="top-nav__user">{user.first_name} {user.last_name}</span>}
        <button className="top-nav__logout" onClick={handleLogout}>
          Uitloggen
        </button>
      </div>
    </nav>
  )
}

export default TopNav

