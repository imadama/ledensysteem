// Haal VITE_API_URL op en verwijder automatisch /api als het er is
// Dit voorkomt dubbele /api/api/ in URLs
const rawApiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

// Verwijder /api van het einde als het er is (ook met trailing slash)
let processedUrl = rawApiUrl.trim()
if (processedUrl.endsWith('/api')) {
  processedUrl = processedUrl.slice(0, -4) // Verwijder '/api'
} else if (processedUrl.endsWith('/api/')) {
  processedUrl = processedUrl.slice(0, -5) // Verwijder '/api/'
}

export const API_BASE_URL = processedUrl

// Debug: log altijd (ook in productie) zodat we kunnen zien wat er gebeurt
// Gebruik window.alert voor zichtbaarheid tijdens debugging
if (typeof window !== 'undefined') {
  console.log('[API CONFIG] VITE_API_URL (raw):', rawApiUrl)
  console.log('[API CONFIG] API_BASE_URL (processed):', API_BASE_URL)
  console.log('[API CONFIG] Dit wordt gebruikt als baseURL voor axios')
}

// Helper om de base URL zonder /api te krijgen voor sanctum endpoints
export const getBaseUrl = (): string => {
  return API_BASE_URL
}

