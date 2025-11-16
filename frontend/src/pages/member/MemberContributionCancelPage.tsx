import { Link } from 'react-router-dom'

const MemberContributionCancelPage: React.FC = () => {
  return (
    <div className="card" style={{ maxWidth: 480, margin: '3rem auto' }}>
      <h1>Betaling geannuleerd</h1>
      <p>De betaling is geannuleerd of mislukt. De bijdrage blijft open staan tot je opnieuw betaalt.</p>
      <Link className="button" to="/portal/contribution">
        Terug naar contributies
      </Link>
    </div>
  )
}

export default MemberContributionCancelPage
