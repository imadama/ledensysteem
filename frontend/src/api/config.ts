export const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

// Helper om de base URL zonder /api te krijgen voor sanctum endpoints
export const getBaseUrl = (): string => {
  const apiUrl = API_BASE_URL
  // Verwijder /api van het einde als het er is
  return apiUrl.replace(/\/api\/?$/, '')
}

