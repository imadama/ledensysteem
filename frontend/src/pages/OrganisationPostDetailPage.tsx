import React, { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { apiClient } from '../api/axios'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import PostForm, { PostFormErrors, PostFormValues } from '../components/Organisation/PostForm'

type Comment = { id: number; body: string; author: string; created_at: string | null }
type Like = { id: number; author: string; created_at: string | null }

type Tab = 'details' | 'comments' | 'likes'

const OrganisationPostDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()

  const [initialValues, setInitialValues] = useState<PostFormValues | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [errors, setErrors] = useState<PostFormErrors>({})
  const [generalError, setGeneralError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('details')

  const [comments, setComments] = useState<Comment[]>([])
  const [likes, setLikes] = useState<Like[]>([])
  const [subLoading, setSubLoading] = useState(false)

  useEffect(() => {
    let isMounted = true
    const controller = new AbortController()
    const fetchPost = async () => {
      if (!id) return
      setIsLoading(true)
      setLoadError(null)
      try {
        const { data } = await apiClient.get<{ data: { title: string; body: string; status: PostFormValues['status'] } }>(
          `/api/organisation/posts/${id}`,
          { signal: controller.signal },
        )
        if (!isMounted) return
        setInitialValues({ title: data.data.title, body: data.data.body, status: data.data.status })
      } catch (error: any) {
        if (!isMounted || controller.signal.aborted) return
        setLoadError(error.response?.status === 404 ? 'Bericht niet gevonden' : 'Kon bericht niet laden')
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }
    fetchPost()
    return () => {
      isMounted = false
      controller.abort()
    }
  }, [id])

  useEffect(() => {
    if (!id || activeTab === 'details') return
    let isMounted = true
    const fetchSub = async () => {
      setSubLoading(true)
      try {
        const endpoint = activeTab === 'comments' ? 'comments' : 'likes'
        const { data } = await apiClient.get<{ data: Comment[] | Like[] }>(`/api/organisation/posts/${id}/${endpoint}`)
        if (!isMounted) return
        if (activeTab === 'comments') setComments(data.data as Comment[])
        else setLikes(data.data as Like[])
      } catch {
        if (isMounted) toast.error('Kon gegevens niet laden')
      } finally {
        if (isMounted) setSubLoading(false)
      }
    }
    fetchSub()
    return () => {
      isMounted = false
    }
  }, [id, activeTab])

  const handleSubmit = async (values: PostFormValues) => {
    setErrors({})
    setGeneralError(null)
    setIsSubmitting(true)
    try {
      await apiClient.put(`/api/organisation/posts/${id}`, values)
      toast.success('Bericht opgeslagen')
    } catch (error: any) {
      if (error.response?.status === 422) {
        setErrors(error.response.data.errors ?? {})
      } else {
        setGeneralError('Opslaan mislukt')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatDate = (iso: string | null) => (iso ? new Date(iso).toLocaleString('nl-NL') : '—')

  const tabClass = (tab: Tab) =>
    `px-4 py-2 text-sm font-medium ${
      activeTab === tab
        ? 'border-b-2 border-aidatim-blue text-aidatim-blue'
        : 'text-gray-500 dark:text-gray-400'
    }`

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Bericht</h2>
        <Link to="/organisation/posts">
          <Button variant="outline">
            <span className="flex items-center gap-1"><ArrowLeft size={16} /> Terug</span>
          </Button>
        </Link>
      </div>

      {isLoading && <Card className="p-6 text-gray-600 dark:text-gray-400">Laden…</Card>}
      {loadError && <Card className="p-6 text-red-600 dark:text-red-400">{loadError}</Card>}

      {!isLoading && !loadError && initialValues && (
        <>
          <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
            <button onClick={() => setActiveTab('details')} className={tabClass('details')}>Details</button>
            <button onClick={() => setActiveTab('comments')} className={tabClass('comments')}>Reacties</button>
            <button onClick={() => setActiveTab('likes')} className={tabClass('likes')}>Likes</button>
          </div>

          <Card className="p-6">
            {activeTab === 'details' && (
              <PostForm
                initialValues={initialValues}
                onSubmit={handleSubmit}
                errors={errors}
                generalError={generalError}
                isSubmitting={isSubmitting}
                submitLabel="Wijzigingen opslaan"
              />
            )}

            {activeTab === 'comments' && (
              <div className="space-y-3">
                {subLoading && <p className="text-gray-600 dark:text-gray-400">Laden…</p>}
                {!subLoading && comments.length === 0 && <p className="text-gray-600 dark:text-gray-400">Nog geen reacties.</p>}
                {comments.map((c) => (
                  <div key={c.id} className="border-b border-gray-100 dark:border-gray-800 pb-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-gray-900 dark:text-white">{c.author}</span>
                      <span className="text-gray-500 dark:text-gray-400">{formatDate(c.created_at)}</span>
                    </div>
                    <p className="text-gray-700 dark:text-gray-300">{c.body}</p>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'likes' && (
              <div className="space-y-2">
                {subLoading && <p className="text-gray-600 dark:text-gray-400">Laden…</p>}
                {!subLoading && likes.length === 0 && <p className="text-gray-600 dark:text-gray-400">Nog geen likes.</p>}
                {likes.map((l) => (
                  <div key={l.id} className="flex justify-between text-sm border-b border-gray-100 dark:border-gray-800 pb-2">
                    <span className="text-gray-900 dark:text-white">{l.author}</span>
                    <span className="text-gray-500 dark:text-gray-400">{formatDate(l.created_at)}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  )
}

export default OrganisationPostDetailPage
