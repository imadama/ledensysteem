import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import MemberForm, { type MemberFormErrors, type MemberFormValues } from '../components/Organisation/MemberForm'
import { apiClient } from '../api/axios'

const emptyValues: MemberFormValues = {
  member_number: '',
  first_name: '',
  last_name: '',
  gender: 'm',
  birth_date: '',
  email: '',
  phone: '',
  street_address: '',
  postal_code: '',
  city: '',
  iban: '',
  contribution_amount: '',
  contribution_frequency: 'none',
  contribution_start_date: '',
  contribution_note: '',
}

const OrganisationMemberCreatePage: React.FC = () => {
  const navigate = useNavigate()
  const [errors, setErrors] = useState<MemberFormErrors>({})
  const [generalError, setGeneralError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (values: MemberFormValues) => {
    setErrors({})
    setGeneralError(null)
    setIsSubmitting(true)

    try {
      const payload = {
        ...values,
        birth_date: values.birth_date || null,
        contribution_amount: values.contribution_amount ? Number(values.contribution_amount) : null,
        contribution_frequency: values.contribution_frequency === 'none' ? null : values.contribution_frequency,
        contribution_start_date: values.contribution_start_date || null,
        contribution_note: values.contribution_note || null,
      }

      const { data } = await apiClient.post<{ data: { id: number } }>('/api/organisation/members', payload)

      navigate(`/organisation/members/${data.data.id}`)
    } catch (error: any) {
      if (error.response?.status === 422) {
        setErrors(error.response.data.errors ?? {})
      } else {
        setGeneralError('Opslaan mislukt. Probeer het later opnieuw.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Nieuw lid</h2>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Voeg een nieuw lid toe aan je organisatie</p>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <MemberForm
          initialValues={emptyValues}
          onSubmit={handleSubmit}
          errors={errors}
          generalError={generalError}
          isSubmitting={isSubmitting}
          submitLabel="Lid opslaan"
        />
      </div>
    </div>
  )
}

export default OrganisationMemberCreatePage


