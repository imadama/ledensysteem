import { Link } from 'react-router-dom'
import { useMemberAuth } from '../../context/MemberAuthContext'

const MemberDashboardPage: React.FC = () => {
  const { memberUser } = useMemberAuth()

  return (
    <div className="card">
      <h1>Welkom, {memberUser?.member.first_name} {memberUser?.member.last_name}</h1>
      <p>
        Via het ledenportaal kun je je persoonsgegevens bekijken en je contributie opvolgen.
      </p>

      <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
        <Link to="/portal/profile" className="button">
          Mijn gegevens
        </Link>
        <Link to="/portal/contribution" className="button button--secondary">
          Mijn contributie
        </Link>
      </div>
    </div>
  )
}

export default MemberDashboardPage


