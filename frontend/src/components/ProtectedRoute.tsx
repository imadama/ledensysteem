import { type ComponentType, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getCurrentSubdomain } from '../api/config'
import Layout from './Layout'

type ProtectedRouteProps = {
  component: ComponentType
  roles?: string[]
  redirectTo?: string
  noLayout?: boolean
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ component: Component, roles, redirectTo = '/dashboard', noLayout = false }) => {
  const { user, isLoading, roles: userRoles } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (isLoading) {
      return
    }

    if (!user) {
      navigate('/login', { replace: true, state: { from: location } })
      return
    }

    const subdomain = getCurrentSubdomain()

    // Portal subdomein: alleen platform admins toegestaan
    if (subdomain === 'portal' && !userRoles.includes('platform_admin')) {
      navigate('/login', {
        replace: true,
        state: {
          from: location,
          error: 'Alleen platform beheerders hebben toegang tot portal.aidatim.nl',
        },
      })
      return
    }

    if (roles && roles.length > 0) {
      const hasRole = roles.some((role) => userRoles.includes(role))

      if (!hasRole) {
        navigate(redirectTo, { replace: true })
      }
    }
  }, [isLoading, location, navigate, roles, user, userRoles, redirectTo])

  if (isLoading) {
    return <div>Loading...</div>
  }

  if (!user) {
    return null
  }

  if (roles && roles.length > 0) {
    const hasRole = roles.some((role) => userRoles.includes(role))

    if (!hasRole) {
      return null
    }
  }

  if (noLayout) {
    return <Component />
  }

  return (
    <Layout>
      <Component />
    </Layout>
  )
}

export default ProtectedRoute

