import axios from 'axios'
import { API_BASE_URL, getBaseUrl } from './config'
import { authManager } from '../context/authManager'

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-XSRF-TOKEN',
})

// Debug: log altijd (ook in productie)
if (typeof window !== 'undefined') {
  console.log('[AXIOS] baseURL:', apiClient.defaults.baseURL)
  console.log('[AXIOS] API_BASE_URL:', API_BASE_URL)
}

// Helper functie om sanctum endpoints aan te roepen zonder /api prefix
export const getSanctumCsrfCookie = async (): Promise<void> => {
  let baseUrl = getBaseUrl()
  
  // Zorg dat baseUrl GEEN /api bevat
  if (baseUrl.endsWith('/api')) {
    baseUrl = baseUrl.slice(0, -4)
  } else if (baseUrl.endsWith('/api/')) {
    baseUrl = baseUrl.slice(0, -5)
  }
  
  const fullUrl = `${baseUrl}/sanctum/csrf-cookie`
  
  // Debug logging
  if (typeof window !== 'undefined') {
    console.log('[SANCTUM] getBaseUrl():', getBaseUrl())
    console.log('[SANCTUM] baseUrl (processed):', baseUrl)
    console.log('[SANCTUM] Full URL:', fullUrl)
  }
  
  await axios.get(fullUrl, {
    withCredentials: true,
  })
}

// Interceptor om dubbele /api/api/ te voorkomen - MOET als eerste worden aangeroepen
// Deze interceptor corrigeert de URL VOORDAT axios de request maakt
apiClient.interceptors.request.use(
  (config) => {
    if (config.url) {
      // Gebruik de baseURL van de config of de default
      const baseURL = config.baseURL || apiClient.defaults.baseURL || ''
      const url = config.url
      
      // Bouw de volledige URL
      const fullUrl = baseURL + url
      
      // Log altijd voor debugging
      if (typeof window !== 'undefined') {
        console.log('[API REQUEST]', {
          method: config.method?.toUpperCase(),
          baseURL: baseURL,
          url: url,
          fullUrl: fullUrl,
          hasDoubleApi: fullUrl.includes('/api/api/'),
          timestamp: new Date().toISOString(),
        })
      }
      
      // Als er dubbele /api/api/ in zit, corrigeer het DIRECT
      if (fullUrl.includes('/api/api/')) {
        if (typeof window !== 'undefined') {
          console.error('========================================')
          console.error('❌ DUBBELE /api/api/ GEDETECTEERD IN REQUEST!')
          console.error('========================================')
          console.error('Originele baseURL:', baseURL)
          console.error('Originele url:', url)
          console.error('Originele fullUrl:', fullUrl)
        }
        
        // Verwijder de dubbele /api/ - vervang alle voorkomens
        const correctedUrl = fullUrl.replace(/\/api\/api\//g, '/api/')
        
        if (typeof window !== 'undefined') {
          console.warn('✅ Gecorrigeerd naar:', correctedUrl)
        }
        
        // Parse de gecorrigeerde URL en update de config
        try {
          const urlObj = new URL(correctedUrl)
          // Update baseURL naar alleen het protocol + host
          config.baseURL = `${urlObj.protocol}//${urlObj.host}`
          // Update url naar alleen het path + query
          config.url = urlObj.pathname + urlObj.search
          
          if (typeof window !== 'undefined') {
            console.warn('📝 Config bijgewerkt:')
            console.warn('   newBaseURL:', config.baseURL)
            console.warn('   newUrl:', config.url)
            console.error('========================================')
          }
        } catch (e) {
          if (typeof window !== 'undefined') {
            console.error('❌ Fout bij parsen URL:', e)
            console.error('   Corrected URL:', correctedUrl)
            console.error('========================================')
          }
        }
      }
    }
    return config
  },
  (error) => {
    if (typeof window !== 'undefined') {
      console.error('[API REQUEST ERROR] Request interceptor error:', error)
    }
    return Promise.reject(error)
  },
  { runWhen: (config) => !!config.url } // Alleen uitvoeren als er een URL is
)



apiClient.interceptors.response.use(
  (response) => {
    // Log succesvolle responses voor debugging
    if (typeof window !== 'undefined') {
      console.log('[API SUCCESS]', {
        url: response.config.url,
        baseURL: response.config.baseURL,
        fullUrl: `${response.config.baseURL}${response.config.url}`,
        status: response.status,
        method: response.config.method?.toUpperCase(),
      })
    }
    return response
  },
  (error) => {
    const status = error.response?.status
    const url: string | undefined = error.config?.url
    const baseURL = error.config?.baseURL || apiClient.defaults.baseURL
    const fullUrl = baseURL && url ? `${baseURL}${url}` : url

    // Uitgebreide error logging
    if (typeof window !== 'undefined') {
      console.error('========================================')
      console.error('❌ API ERROR')
      console.error('========================================')
      console.error('URL:', url)
      console.error('BaseURL:', baseURL)
      console.error('Full URL:', fullUrl)
      console.error('Status:', status)
      console.error('Status Text:', error.response?.statusText)
      console.error('Method:', error.config?.method?.toUpperCase())
      console.error('Error Message:', error.message)
      console.error('Error Code:', error.code)
      
      // Check voor dubbele /api/api/
      if (fullUrl && fullUrl.includes('/api/api/')) {
        console.error('⚠️ PROBLEEM: Dubbele /api/api/ gedetecteerd in error URL!')
        console.error('   Dit betekent dat de interceptor niet heeft gewerkt')
      }
      
      // Response data als beschikbaar
      if (error.response?.data) {
        console.error('Response Data:', error.response.data)
      }
      
      // Request config
      console.error('Request Config:', {
        headers: error.config?.headers,
        withCredentials: error.config?.withCredentials,
      })
      console.error('========================================')
    }

    if (
      status === 401 &&
      url &&
      !url.startsWith('/api/member-activation') &&
      !url.startsWith('/api/auth/login') &&
      !url.startsWith('/api/auth/register-organisation') &&
      !url.startsWith('/api/auth/register')
    ) {
      authManager.clearAuth()
    }

    return Promise.reject(error)
  },
)

apiClient.interceptors.request.use((config) => {
  return config
})

