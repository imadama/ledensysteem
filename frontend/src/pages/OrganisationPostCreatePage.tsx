import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { apiClient } from '../api/axios'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import PostForm, { PostFormErrors, PostFormValues } from '../components/Organisation/PostForm'

const emptyValues: PostFormValues = { title: '', body: '', status: 'published' }

const OrganisationPostCreatePage: React.FC = () => {
  const navigate = useNavigate()
  const [errors, setErrors] = useState<PostFormErrors>({})
  const [generalError, setGeneralError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (values: PostFormValues) => {
    setErrors({})
    setGeneralError(null)
    setIsSubmitting(true)
    try {
      const { data } = await apiClient.post<{ data: { id: number } }>('/api/organisation/posts', values)
      toast.success('Bericht geplaatst')
      navigate(`/organisation/posts/${data.data.id}`)
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
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Nieuw bericht</h2>
        <Link to="/organisation/posts">
          <Button variant="outline">
            <span className="flex items-center gap-1"><ArrowLeft size={16} /> Terug</span>
          </Button>
        </Link>
      </div>
      <Card className="p-6">
        <PostForm
          initialValues={emptyValues}
          onSubmit={handleSubmit}
          errors={errors}
          generalError={generalError}
          isSubmitting={isSubmitting}
          submitLabel="Bericht plaatsen"
        />
      </Card>
    </div>
  )
}

export default OrganisationPostCreatePage
