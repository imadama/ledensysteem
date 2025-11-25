import { Link } from 'react-router-dom'
import { CheckCircle2, ArrowLeft } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'

const MemberContributionSuccessPage: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md p-8 text-center">
        <div className="mb-6">
          <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
            <CheckCircle2 className="text-green-600 dark:text-green-400" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Betaling geslaagd</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Bedankt! Je betaling is verwerkt. Het overzicht wordt binnen enkele ogenblikken bijgewerkt.</p>
        </div>
        <Link to="/portal/contribution">
          <Button className="w-full">
            <ArrowLeft size={16} />
            Terug naar contributies
          </Button>
        </Link>
      </Card>
    </div>
  )
}

export default MemberContributionSuccessPage
