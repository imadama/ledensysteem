import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import MemberForm, { type MemberFormErrors, type MemberFormValues } from '../components/Organisation/MemberForm'
import { apiClient } from '../api/axios'

type MemberResponse = {
  id: number
  member_number: string | null
  first_name: string
  last_name: string
  gender: 'm' | 'f'
  birth_date: string | null
  email: string | null
  phone: string | null
  street_address: string | null
  postal_code: string | null
  city: string | null
  iban: string | null
  status: 'active' | 'inactive'
  contribution_amount: string | null
  contribution_frequency: string | null
  contribution_start_date: string | null
  contribution_note: string | null
  created_at: string | null
  updated_at: string | null
}

const OrganisationMemberDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [initialValues, setInitialValues] = useState<MemberFormValues | null>(null)
  const [status, setStatus] = useState<'active' | 'inactive'>('active')
  const [isLoading, setIsLoading] = useState(true)
  const [errors, setErrors] = useState<MemberFormErrors>({})
  const [generalError, setGeneralError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [statusUpdating, setStatusUpdating] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true
    const controller = new AbortController()

    const fetchMember = async () => {
      if (!id) {
        return
      }

      setIsLoading(true)
      setLoadError(null)

      try {
        const { data } = await apiClient.get<{ data: MemberResponse }>(`/api/organisation/members/${id}`, {
          signal: controller.signal,
        })

        if (!isMounted) {
          return
        }

        const member = data.data

        setInitialValues({
          member_number: member.member_number ?? '',
          first_name: member.first_name ?? '',
          last_name: member.last_name ?? '',
          gender: member.gender ?? 'm',
          birth_date: member.birth_date ?? '',
          email: member.email ?? '',
          phone: member.phone ?? '',
          street_address: member.street_address ?? '',
          postal_code: member.postal_code ?? '',
          city: member.city ?? '',
          iban: member.iban ?? '',
          contribution_amount: member.contribution_amount ?? '',
          contribution_frequency: (member.contribution_frequency as MemberFormValues['contribution_frequency']) ?? 'none',
          contribution_start_date: member.contribution_start_date ?? '',
          contribution_note: member.contribution_note ?? '',
          status: member.status,
        })
        setStatus(member.status)
      } catch (error: any) {
        if (!isMounted || controller.signal.aborted) {
          return
        }
        if (error.response?.status === 404) {
          setLoadError('Lid niet gevonden.')
        } else {
          setLoadError('Kon lid niet ophalen. Probeer het later opnieuw.')
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void fetchMember()

    return () => {
      isMounted = false
      controller.abort()
    }
  }, [id])

  const handleSubmit = async (values: MemberFormValues) => {
    if (!id) {
      return
    }

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

      await apiClient.put(`/api/organisation/members/${id}`, payload)

      setGeneralError(null)
      setErrors({})
    } catch (error: any) {
      if (error.response?.status === 422) {
        setErrors(error.response.data.errors ?? {})
      } else if (error.response?.status === 404) {
        setGeneralError('Lid niet gevonden.')
      } else {
        setGeneralError('Opslaan mislukt. Probeer het later opnieuw.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleToggleStatus = async () => {
    if (!id) {
      return
    }

    const newStatus = status === 'active' ? 'inactive' : 'active'

    try {
      setStatusUpdating(true)
      await apiClient.patch(`/api/organisation/members/${id}/status`, { status: newStatus })
      setStatus(newStatus)
      setInitialValues((prev) =>
        prev
          ? {
              ...prev,
              status: newStatus,
            }
          : prev,
      )
    } catch (error) {
      console.error('Status bijwerken mislukt', error)
      setGeneralError('Kon de status niet bijwerken. Probeer het later opnieuw.')
    } finally {
      setStatusUpdating(false)
    }
  }

  if (isLoading) {
    return <div>Bezig met laden...</div>
  }

  if (loadError) {
    return (
      <div>
        <div className="alert alert--error">{loadError}</div>
        <button className="button" type="button" onClick={() => navigate('/organisation/members')} style={{ marginTop: '1rem' }}>
          Terug naar overzicht
        </button>
      </div>
    )
  }

  if (!initialValues) {
    return null
  }

  return (
    <div>
      <div className="page-header">
        <h1>{initialValues.first_name} {initialValues.last_name}</h1>
        <div className="page-header__actions">
          <span className={`badge badge--${status === 'active' ? 'success' : 'secondary'}`}>
            {status === 'active' ? 'Actief' : 'Inactief'}
          </span>
          <button
            type="button"
            className="button button--secondary"
            disabled={statusUpdating}
            onClick={handleToggleStatus}
          >
            {statusUpdating ? 'Bezig...' : status === 'active' ? 'Deactiveer lid' : 'Activeer lid'}
          </button>
        </div>
      </div>

      <div className="card">
        <MemberForm
          initialValues={initialValues}
          onSubmit={handleSubmit}
          errors={errors}
          generalError={generalError}
          isSubmitting={isSubmitting}
          submitLabel="Wijzigingen opslaan"
        />
      </div>
    </div>
  )
}

export default OrganisationMemberDetailPage


