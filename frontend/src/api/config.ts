// Haal VITE_API_URL op en verwijder automatisch /api als het er is
// Dit voorkomt dubbele /api/api/ in URLs
const rawApiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'
export const API_BASE_URL = rawApiUrl.replace(/\/api\/?$/, '')

// Helper om de base URL zonder /api te krijgen voor sanctum endpoints
export const getBaseUrl = (): string => {
  return API_BASE_URL
}

