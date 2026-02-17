import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiClient, getSanctumCsrfCookie } from '../api/axios'
import { getCurrentSubdomain } from '../api/config'
import { Card } from '../components/ui/Card'
import { OrganisationForm, OrganisationFormData, AdminFormData } from '../components/organisations/OrganisationForm'

const RegisterOrganisationPage: React.FC = () => {
  const navigate = useNavigate()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (data: { organisation: OrganisationFormData; admin: AdminFormData }) => {
    setError(null)
    setMessage(null)
    setIsSubmitting(true)

    try {
      // Haal CSRF cookie op (optioneel, faal stil als het niet werkt)
      try {
        await getSanctumCsrfCookie()
      } catch (csrfError) {
        console.warn('CSRF cookie kon niet worden opgehaald:', csrfError)
      }

      const response = await apiClient.post<{
        organisation: {
          subdomain: string
        }
      }>('/api/auth/register-organisation', {
        organisation: data.organisation,
        admin: data.admin,
        accept_terms: true,
      })

      // Login automatisch na registratie
      try {
        await apiClient.post('/api/auth/login', {
          email: data.admin.email,
          password: data.admin.password,
        })
      } catch (loginError) {
        console.error('Auto-login failed:', loginError)
      }

      // Bepaal waar we naartoe moeten redirecten
      const subdomain = getCurrentSubdomain()
      const isMainDomain = !subdomain || subdomain === 'www'
      const organisationSubdomain = response.data.organisation.subdomain

      if (isMainDomain && organisationSubdomain) {
        const hostname = window.location.hostname
        const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1'
        
        if (isLocalhost) {
          const port = window.location.port ? `:${window.location.port}` : ''
          const subdomainUrl = `http://${organisationSubdomain}.localhost${port}/organisation/subscription?payment_required=true`
          window.location.href = subdomainUrl
        } else {
          const subdomainUrl = `https://${organisationSubdomain}.aidatim.nl/organisation/subscription?payment_required=true`
          window.location.href = subdomainUrl
        }
      } else {
        navigate('/organisation/subscription?payment_required=true', { replace: true })
      }
    } catch (err: any) {
      console.error('Registratie error:', err)
      
      if (err.response?.data?.errors) {
        const errors = err.response.data.errors
        const firstError = Object.values(errors).flat()[0] as string | undefined
        setError(firstError ?? 'Registratie mislukt. Controleer de velden en probeer opnieuw.')
      } else if (err.response?.data?.message) {
        setError(err.response.data.message)
      } else {
        setError('Registratie mislukt. Controleer de velden en probeer opnieuw.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 py-8">
      <div className="max-w-3xl mx-auto">
        <Card className="p-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Nieuwe organisatie registreren</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">Vul zowel de gegevens van de organisatie als van de eerste beheerder in.</p>
          </div>

          {message && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-400 px-4 py-3 rounded-lg mb-4">
              {message}
            </div>
          )}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-400 px-4 py-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          <OrganisationForm 
            onSubmit={handleSubmit} 
            isSubmitting={isSubmitting} 
            showTerms={true}
            submitLabel="Registreren"
          />
        </Card>
      </div>
    </div>
  )
}

export default RegisterOrganisationPage

