import { useCallback, useEffect, useRef, useState } from 'react'
import { apiClient } from '../api/axios'

type MonthData = {
  status: 'paid' | 'open' | 'processing' | 'failed'
  amount?: number
} | null

type MonitorMember = {
  id: number
  first_name: string
  last_name: string
  months: Record<string, MonthData>
}

type MonitorResponse = {
  year: number
  members: MonitorMember[]
}

const monthNames = ['Jan', 'Feb', 'Mrt', 'Apr', 'Mei', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec']

const currentYear = new Date().getFullYear()

const MonitorPage: React.FC = () => {
  const [year, setYear] = useState<number>(currentYear)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [monitorData, setMonitorData] = useState<MonitorResponse | null>(null)
  const [showAmounts, setShowAmounts] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  
  const tableContainerRef = useRef<HTMLDivElement>(null)
  const scrollIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const horizontalScrollRef = useRef<HTMLDivElement>(null)
  const horizontalScrollIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const isResettingVerticalRef = useRef<boolean>(false)
  const isResettingHorizontalRef = useRef<boolean>(false)

  const fetchMonitorData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const { data } = await apiClient.get<MonitorResponse>('/api/organisation/monitor', {
        params: { 
          year, 
          show_amounts: showAmounts ? '1' : '0' 
        },
      })

      console.log('Monitor data opgehaald:', { showAmounts, hasAmounts: data.members.some(m => Object.values(m.months).some(month => month?.amount !== undefined)) })
      setMonitorData(data)
    } catch (err: any) {
      console.error('Monitor data ophalen mislukt', err)
      const errorMessage = err.response?.data?.message || err.message || 'Onbekende fout'
      const statusCode = err.response?.status
      
      console.error('Error details:', {
        status: statusCode,
        message: errorMessage,
        data: err.response?.data,
        url: err.config?.url,
      })
      
      setError(`Kon monitor data niet laden: ${errorMessage}${statusCode ? ` (${statusCode})` : ''}`)
    } finally {
      setLoading(false)
    }
  }, [year, showAmounts])

  useEffect(() => {
    void fetchMonitorData()
    
    // Auto-refresh elke 30 seconden
    const refreshInterval = setInterval(() => {
      void fetchMonitorData()
    }, 30000)

    return () => {
      clearInterval(refreshInterval)
    }
  }, [fetchMonitorData])

  // Auto-scroll functionaliteit
  useEffect(() => {
    if (isPaused || !tableContainerRef.current) {
      return
    }

    const container = tableContainerRef.current
    const scrollSpeed = 1 // pixels per frame
    const scrollDelay = 20 // ms tussen scrolls

    // Reset flags
    isResettingVerticalRef.current = false
    isResettingHorizontalRef.current = false

    // Verticale scroll
    scrollIntervalRef.current = setInterval(() => {
      if (isResettingVerticalRef.current) {
        // Wacht tot reset klaar is (check of we dichtbij de top zijn)
        if (container.scrollTop <= 5) {
          isResettingVerticalRef.current = false
        }
        return
      }

      if (container.scrollHeight > container.clientHeight) {
        const maxScroll = container.scrollHeight - container.clientHeight
        const currentScroll = container.scrollTop
        
        // Check of we bijna of aan het einde zijn (met wat marge voor floating point)
        if (currentScroll >= maxScroll - 1) {
          // Terug naar boven als we onderaan zijn
          isResettingVerticalRef.current = true
          container.scrollTo({ top: 0, behavior: 'smooth' })
        } else {
          container.scrollTop += scrollSpeed
        }
      }
    }, scrollDelay)

    // Horizontale scroll
    if (horizontalScrollRef.current) {
      const horizontalContainer = horizontalScrollRef.current
      horizontalScrollIntervalRef.current = setInterval(() => {
        if (isResettingHorizontalRef.current) {
          // Wacht tot reset klaar is (check of we dichtbij links zijn)
          if (horizontalContainer.scrollLeft <= 5) {
            isResettingHorizontalRef.current = false
          }
          return
        }

        if (horizontalContainer.scrollWidth > horizontalContainer.clientWidth) {
          const maxScroll = horizontalContainer.scrollWidth - horizontalContainer.clientWidth
          const currentScroll = horizontalContainer.scrollLeft
          
          // Check of we bijna of aan het einde zijn (met wat marge voor floating point)
          if (currentScroll >= maxScroll - 1) {
            // Terug naar links als we rechts zijn
            isResettingHorizontalRef.current = true
            horizontalContainer.scrollTo({ left: 0, behavior: 'smooth' })
          } else {
            horizontalContainer.scrollLeft += scrollSpeed
          }
        }
      }, scrollDelay)
    }

    return () => {
      if (scrollIntervalRef.current) {
        clearInterval(scrollIntervalRef.current)
      }
      if (horizontalScrollIntervalRef.current) {
        clearInterval(horizontalScrollIntervalRef.current)
      }
    }
  }, [isPaused, monitorData])

  const getStatusIcon = (monthData: MonthData) => {
    if (!monthData) {
      return <span className="text-gray-400 text-2xl">—</span>
    }

    switch (monthData.status) {
      case 'paid':
        return <span className="text-green-600 dark:text-green-400 font-bold text-2xl">✓</span>
      case 'open':
        return <span className="text-red-600 dark:text-red-400 font-bold text-2xl">✗</span>
      case 'processing':
        return <span className="text-yellow-600 dark:text-yellow-400 text-2xl">⏳</span>
      case 'failed':
        return <span className="text-gray-600 dark:text-gray-400 text-2xl">⚠</span>
      default:
        return <span className="text-gray-500 dark:text-gray-500 text-2xl">?</span>
    }
  }

  const getStatusColorClass = (monthData: MonthData) => {
    if (!monthData) {
      return 'bg-gray-50 dark:bg-gray-800/50'
    }

    switch (monthData.status) {
      case 'paid':
        return 'bg-green-100 dark:bg-green-900/30'
      case 'open':
        return 'bg-red-100 dark:bg-red-900/30'
      case 'processing':
        return 'bg-yellow-100 dark:bg-yellow-900/30'
      case 'failed':
        return 'bg-gray-100 dark:bg-gray-800'
      default:
        return 'bg-white dark:bg-gray-800'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6 lg:p-8">
      <div className="max-w-full">
        {/* Header met controls */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
              Leden Monitor
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-400">
              {year}
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showAmounts}
                onChange={(e) => {
                  setShowAmounts(e.target.checked)
                  // Data wordt automatisch opnieuw opgehaald via useEffect dependency
                }}
                className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-lg text-gray-700 dark:text-gray-300">Toon bedragen</span>
            </label>
            
            <button
              onClick={() => setIsPaused(!isPaused)}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-lg font-medium transition-colors"
            >
              {isPaused ? '▶ Hervatten' : '⏸ Pauzeren'}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-400 px-6 py-4 rounded-lg mb-6 text-lg">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-16 text-gray-600 dark:text-gray-400 text-2xl">
            Bezig met laden...
          </div>
        ) : monitorData && monitorData.members.length > 0 ? (
          <div
            ref={tableContainerRef}
            className="overflow-auto bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700"
            style={{ maxHeight: 'calc(100vh - 200px)' }}
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
          >
            <div ref={horizontalScrollRef} className="overflow-x-auto">
              <table className="w-full min-w-[1200px]">
                <thead>
                  <tr className="border-b-2 border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 sticky top-0 z-10">
                    <th className="sticky left-0 z-20 bg-gray-100 dark:bg-gray-700 text-left py-4 px-6 text-xl font-bold text-gray-900 dark:text-white min-w-[250px]">
                      Naam
                    </th>
                    {monthNames.map((monthName, index) => (
                      <th
                        key={index + 1}
                        className="text-center py-4 px-4 text-xl font-bold text-gray-900 dark:text-white min-w-[100px]"
                      >
                        {monthName}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {monitorData.members.map((member) => (
                    <tr
                      key={member.id}
                      className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <td className="sticky left-0 z-10 bg-white dark:bg-gray-800 font-semibold py-4 px-6 text-lg text-gray-900 dark:text-white">
                        {member.first_name} {member.last_name}
                      </td>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((month) => {
                        const monthData = member.months[month.toString()]
                        return (
                          <td
                            key={month}
                            className={`${getStatusColorClass(monthData)} text-center py-4 px-4`}
                          >
                            <div className="flex flex-col items-center gap-1">
                              {getStatusIcon(monthData)}
                              {showAmounts && monthData && typeof monthData.amount === 'number' && (
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                  €{monthData.amount.toFixed(2)}
                                </span>
                              )}
                            </div>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="text-center py-16 text-gray-500 dark:text-gray-400 text-2xl">
            Geen leden gevonden voor {year}.
          </div>
        )}

        {/* Legenda */}
        <div className="mt-6 flex flex-wrap gap-6 text-lg">
          <div className="flex items-center gap-2">
            <span className="text-green-600 dark:text-green-400 font-bold text-2xl">✓</span>
            <span className="text-gray-700 dark:text-gray-300">Betaald</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-red-600 dark:text-red-400 font-bold text-2xl">✗</span>
            <span className="text-gray-700 dark:text-gray-300">Open</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-yellow-600 dark:text-yellow-400 text-2xl">⏳</span>
            <span className="text-gray-700 dark:text-gray-300">In behandeling</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-400 text-2xl">—</span>
            <span className="text-gray-700 dark:text-gray-300">Geen contributie</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MonitorPage

