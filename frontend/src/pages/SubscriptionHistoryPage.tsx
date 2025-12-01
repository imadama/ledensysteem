import { useEffect, useState } from 'react'
import { apiClient } from '../api/axios'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { format } from 'date-fns'

type AuditLog = {
  id: number
  action_type: string
  description: string | null
  old_value: any
  new_value: any
  metadata: any
  user: {
    id: number
    name: string
    email: string
  } | null
  created_at: string
}

type AuditLogsResponse = {
  data: AuditLog[]
  meta: {
    current_page: number
    last_page: number
    per_page: number
    total: number
  }
}

const SubscriptionHistoryPage: React.FC = () => {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<string>('all')

  const loadAuditLogs = async () => {
    setLoading(true)
    setError(null)
    try {
      // Get organisation ID from user info
      const { data: userData } = await apiClient.get<{ organisation: { id: number } }>('/api/auth/me')
      const organisationId = userData.organisation?.id

      if (!organisationId) {
        setError('Geen organisatie gevonden.')
        return
      }

      const { data } = await apiClient.get<AuditLogsResponse>(`/api/platform/organisations/${organisationId}/audit-logs`)
      setAuditLogs(data.data)
    } catch (err: any) {
      console.error('Audit logs laden mislukt', err)
      setError(err.response?.data?.message ?? 'Kon audit logs niet laden.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadAuditLogs()
  }, [])

  const filteredLogs = auditLogs.filter((log) => {
    if (filter === 'all') return true
    return log.action_type === filter
  })

  const actionTypeLabels: Record<string, string> = {
    plan_change: 'Plan wijziging',
    payment_event: 'Betaling',
    subscription_status_change: 'Status wijziging',
    user_action: 'Gebruikersactie',
  }

  const getActionTypeColor = (actionType: string): 'success' | 'warning' | 'error' | 'default' => {
    switch (actionType) {
      case 'plan_change':
        return 'default'
      case 'payment_event':
        return 'success'
      case 'subscription_status_change':
        return 'warning'
      case 'user_action':
        return 'default'
      default:
        return 'default'
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Abonnement Historie</h2>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Bekijk alle gebeurtenissen rondom je abonnement en betalingen</p>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-400 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Audit Trail</h3>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="all">Alle acties</option>
            <option value="plan_change">Plan wijzigingen</option>
            <option value="payment_event">Betalingen</option>
            <option value="subscription_status_change">Status wijzigingen</option>
            <option value="user_action">Gebruikersacties</option>
          </select>
        </div>

        {loading ? (
          <div className="text-center py-8 text-gray-600 dark:text-gray-400">Audit logs worden geladen...</div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">Geen audit logs gevonden.</div>
        ) : (
          <div className="space-y-4">
            {filteredLogs.map((log) => (
              <div
                key={log.id}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={getActionTypeColor(log.action_type)}>
                        {actionTypeLabels[log.action_type] || log.action_type}
                      </Badge>
                      {log.user && (
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          door {log.user.name}
                        </span>
                      )}
                    </div>
                    {log.description && (
                      <p className="text-gray-900 dark:text-white font-medium">{log.description}</p>
                    )}
                    {log.old_value && log.new_value && (
                      <div className="mt-2 text-sm space-y-1">
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Van: </span>
                          <span className="text-gray-900 dark:text-white">
                            {typeof log.old_value === 'object' 
                              ? JSON.stringify(log.old_value, null, 2) 
                              : String(log.old_value)}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Naar: </span>
                          <span className="text-gray-900 dark:text-white">
                            {typeof log.new_value === 'object' 
                              ? JSON.stringify(log.new_value, null, 2) 
                              : String(log.new_value)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-500 whitespace-nowrap ml-4">
                    {format(new Date(log.created_at), 'dd MMM yyyy HH:mm')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

export default SubscriptionHistoryPage

