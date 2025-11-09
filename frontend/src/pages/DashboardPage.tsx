import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const DashboardPage: React.FC = () => {
  const { user, roles, isLoading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (isLoading) {
      return
    }

    if (!user) {
      navigate('/login', { replace: true })
      return
    }

    if (roles.includes('platform_admin')) {
      navigate('/platform/organisations', { replace: true })
      return
    }

    if (roles.includes('org_admin')) {
      navigate('/organisation/dashboard', { replace: true })
      return
    }

    navigate('/login', { replace: true })
  }, [isLoading, navigate, roles, user])

  return <div>Bezig met laden...</div>
}

export default DashboardPage

