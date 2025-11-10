import { type ComponentType, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useMemberAuth } from '../context/MemberAuthContext'
import MemberLayout from './MemberLayout'

type MemberProtectedRouteProps = {
  component: ComponentType
}

const MemberProtectedRoute: React.FC<MemberProtectedRouteProps> = ({ component: Component }) => {
  const { memberUser, isLoading } = useMemberAuth()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (isLoading) {
      return
    }

    if (!memberUser) {
      navigate('/portal/login', { replace: true, state: { from: location } })
    }
  }, [isLoading, location, memberUser, navigate])

  if (isLoading) {
    return <div>Bezig met laden...</div>
  }

  if (!memberUser) {
    return null
  }

  return (
    <MemberLayout>
      <Component />
    </MemberLayout>
  )
}

export default MemberProtectedRoute


