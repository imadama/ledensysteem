import { Link } from 'react-router-dom'

const MemberContributionSuccessPage: React.FC = () => {
  return (
    <div className="card" style={{ maxWidth: 480, margin: '3rem auto' }}>
      <h1>Betaling geslaagd</h1>
      <p>Bedankt! Je betaling is verwerkt. Het overzicht wordt binnen enkele ogenblikken bijgewerkt.</p>
      <Link className="button" to="/portal/contribution">
        Terug naar contributies
      </Link>
    </div>
  )
}

export default MemberContributionSuccessPage
