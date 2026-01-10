import { CheckCircle } from 'lucide-react'
import { Link } from 'react-router-dom'

const PublicMemberRegistrationSuccessPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-8 text-center">
          <div className="flex justify-center mb-6">
            <CheckCircle className="h-16 w-16 text-green-500" />
          </div>

          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Aanmelding Succesvol Ontvangen
          </h1>
          <h2 className="text-2xl font-semibold text-gray-700 dark:text-gray-300 mb-6">
            Başvurunuz Başarıyla Alındı
          </h2>

          <div className="space-y-4 text-gray-700 dark:text-gray-300 mb-8">
            <p>
              Bedankt voor uw aanmelding! Uw gegevens zijn succesvol ontvangen en worden verwerkt.
            </p>
            <p>
              Başvurunuz için teşekkür ederiz! Bilgileriniz başarıyla alındı ve işleme alındı.
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              U ontvangt binnenkort een bevestiging per e-mail.
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Yakında e-posta ile onay alacaksınız.
            </p>
          </div>

          <div className="flex justify-center space-x-4">
            <Link
              to="/aanmelden"
              className="inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-aidatim-blue px-4 py-2 text-sm bg-aidatim-blue text-white hover:bg-aidatim-blue-dark dark:bg-aidatim-blue dark:hover:bg-aidatim-blue-dark"
            >
              Nieuw Formulier / Yeni Form
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PublicMemberRegistrationSuccessPage
