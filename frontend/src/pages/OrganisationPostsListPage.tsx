import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Eye, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { apiClient } from '../api/axios'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'

type Post = {
  id: number
  title: string
  status: 'draft' | 'published'
  published_at: string | null
  created_at: string | null
  comment_count: number
  like_count: number
}

type Meta = {
  current_page: number
  per_page: number
  total: number
  last_page: number
}

const OrganisationPostsListPage: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([])
  const [meta, setMeta] = useState<Meta | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [rowLoading, setRowLoading] = useState<Record<number, boolean>>({})

  useEffect(() => {
    let isMounted = true
    const controller = new AbortController()

    const fetchPosts = async () => {
      setIsLoading(true)
      try {
        const { data } = await apiClient.get<{ data: Post[]; meta: Meta }>(
          '/api/organisation/posts',
          { params: { page }, signal: controller.signal },
        )
        if (!isMounted) return
        setPosts(data.data)
        setMeta(data.meta)
      } catch (err: unknown) {
        if (!isMounted || controller.signal.aborted) return
        toast.error('Kon berichten niet ophalen')
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    fetchPosts()
    return () => {
      isMounted = false
      controller.abort()
    }
  }, [page])

  const formatDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('nl-NL') : '—')

  const handleDelete = async (post: Post) => {
    if (rowLoading[post.id]) return
    if (!window.confirm(`Bericht "${post.title}" verwijderen?`)) return
    setRowLoading((prev) => ({ ...prev, [post.id]: true }))
    try {
      await apiClient.delete(`/api/organisation/posts/${post.id}`)
      setPosts((prev) => prev.filter((p) => p.id !== post.id))
      toast.success('Bericht verwijderd')
    } catch (err: unknown) {
      toast.error('Verwijderen mislukt')
    } finally {
      setRowLoading((prev) => ({ ...prev, [post.id]: false }))
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Berichten</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Mededelingen voor je leden</p>
        </div>
        <Link to="/organisation/posts/new">
          <Button>
            <span className="flex items-center gap-2"><Plus size={16} /> Nieuw bericht</span>
          </Button>
        </Link>
      </div>

      {isLoading && <Card className="p-6 text-gray-600 dark:text-gray-400">Laden…</Card>}

      {!isLoading && posts.length === 0 && (
        <Card className="p-6 text-gray-600 dark:text-gray-400">Nog geen berichten geplaatst.</Card>
      )}

      {!isLoading && posts.length > 0 && (
        <Card className="p-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 text-left text-sm text-gray-500 dark:text-gray-400">
                  <th className="py-2 pr-4">Titel</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Reacties</th>
                  <th className="py-2 pr-4">Likes</th>
                  <th className="py-2 pr-4">Datum</th>
                  <th className="py-2">Acties</th>
                </tr>
              </thead>
              <tbody>
                {posts.map((post) => (
                  <tr key={post.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="py-3 pr-4 font-medium text-gray-900 dark:text-white">{post.title}</td>
                    <td className="py-3 pr-4">
                      <Badge variant={post.status === 'published' ? 'success' : 'default'}>
                        {post.status === 'published' ? 'Gepubliceerd' : 'Concept'}
                      </Badge>
                    </td>
                    <td className="py-3 pr-4 text-gray-700 dark:text-gray-300">{post.comment_count}</td>
                    <td className="py-3 pr-4 text-gray-700 dark:text-gray-300">{post.like_count}</td>
                    <td className="py-3 pr-4 text-gray-700 dark:text-gray-300">{formatDate(post.published_at ?? post.created_at)}</td>
                    <td className="py-3">
                      <div className="flex gap-2">
                        <Link to={`/organisation/posts/${post.id}`}>
                          <Button variant="outline" size="sm">
                            <span className="flex items-center gap-1"><Eye size={16} /> Details</span>
                          </Button>
                        </Link>
                        <Button variant="outline" size="sm" disabled={rowLoading[post.id]} onClick={() => handleDelete(post)}>
                          <span className="flex items-center gap-1"><Trash2 size={16} /> Verwijderen</span>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {meta && meta.last_page > 1 && (
        <div className="flex justify-center gap-2 flex-wrap">
          <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Vorige</Button>
          <span className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400">Pagina {meta.current_page} / {meta.last_page}</span>
          <Button size="sm" variant="outline" disabled={page >= meta.last_page} onClick={() => setPage((p) => p + 1)}>Volgende</Button>
        </div>
      )}
    </div>
  )
}

export default OrganisationPostsListPage
