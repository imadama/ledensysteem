import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const OrganisationDashboardPage: React.FC = () => {
  const { organisation } = useAuth()

  return (
    <div>
      <h1>Welkom {organisation?.name ?? ''}</h1>
      <p>Gebruik dit dashboard om je beheerders te beheren.</p>

      <div className="card" style={{ marginTop: '2rem' }}>
        <h2>Snelle acties</h2>
        <ul style={{ textAlign: 'left', lineHeight: 1.8 }}>
          <li>
            <Link to="/organisation/users">Beheerders beheren</Link>
          </li>
        </ul>
      </div>
    </div>
  )
}

export default OrganisationDashboardPage

