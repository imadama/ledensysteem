// Helper om API base URL te bepalen op basis van huidig subdomein
const getApiBaseUrl = (): string => {
  if (typeof window === 'undefined') {
    return import.meta.env.VITE_API_URL ?? 'http://localhost:8000'
  }
  
  const hostname = window.location.hostname
  const rawApiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'
  
  // Development: gebruik env variabele
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    // Verwijder /api van het einde als het er is (ook met trailing slash)
    let processedUrl = rawApiUrl.trim()
    if (processedUrl.endsWith('/api')) {
      processedUrl = processedUrl.slice(0, -4) // Verwijder '/api'
    } else if (processedUrl.endsWith('/api/')) {
      processedUrl = processedUrl.slice(0, -5) // Verwijder '/api/'
    }
    return processedUrl
  }
  
  // Productie: alle requests gaan naar app.aidatim.nl
  if (hostname.endsWith('.aidatim.nl')) {
    // Gebruik env variabele als die er is, anders fallback naar api.aidatim.nl
    const url = import.meta.env.VITE_API_URL ?? 'https://api.aidatim.nl'
    
    // Verwijder /api van het einde als het er is
    let processedUrl = url.trim()
    if (processedUrl.endsWith('/api')) {
      processedUrl = processedUrl.slice(0, -4)
    } else if (processedUrl.endsWith('/api/')) {
      processedUrl = processedUrl.slice(0, -5)
    }
    return processedUrl
  }
  
  // Fallback: gebruik env variabele
  let processedUrl = rawApiUrl.trim()
  if (processedUrl.endsWith('/api')) {
    processedUrl = processedUrl.slice(0, -4)
  } else if (processedUrl.endsWith('/api/')) {
    processedUrl = processedUrl.slice(0, -5)
  }
  return processedUrl
}

export const API_BASE_URL = getApiBaseUrl()

// Helper om huidig subdomein te krijgen
export const getCurrentSubdomain = (): string | null => {
  if (typeof window === 'undefined') {
    return null
  }
  
  const hostname = window.location.hostname
  
  // Development
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return null
  }
  
  // Extract subdomein (alles voor .aidatim.nl)
  if (hostname.endsWith('.aidatim.nl')) {
    const parts = hostname.split('.')
    if (parts.length >= 3) {
      return parts[0] // Bijv. "vereniging-abc" of "portal"
    }
  }
  
  return null
}

// Maak API_BASE_URL beschikbaar in window voor debugging
if (typeof window !== 'undefined') {
  ;(window as any).__API_BASE_URL__ = API_BASE_URL
  ;(window as any).__CURRENT_SUBDOMAIN__ = getCurrentSubdomain()
}

// Debug: log altijd (ook in productie) zodat we kunnen zien wat er gebeurt
if (typeof window !== 'undefined') {
  console.log('[API CONFIG] Hostname:', window.location.hostname)
  console.log('[API CONFIG] Subdomain:', getCurrentSubdomain())
  console.log('[API CONFIG] API_BASE_URL:', API_BASE_URL)
  console.log('[API CONFIG] Dit wordt gebruikt als baseURL voor axios')
  console.log('[API CONFIG] Beschikbaar als: window.__API_BASE_URL__')
}

// Helper om de base URL zonder /api te krijgen voor sanctum endpoints
export const getBaseUrl = (): string => {
  let url = API_BASE_URL
  
  // Extra check: verwijder /api als het er nog in zit
  if (url.endsWith('/api')) {
    url = url.slice(0, -4)
  } else if (url.endsWith('/api/')) {
    url = url.slice(0, -5)
  }
  
  if (typeof window !== 'undefined') {
    console.log('[GET BASE URL] API_BASE_URL:', API_BASE_URL)
    console.log('[GET BASE URL] Returned URL:', url)
  }
  
  return url
}

