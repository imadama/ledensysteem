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
console.log('🔧 Axios Client:', {
  'baseURL': apiClient.defaults.baseURL,
  'API_BASE_URL': API_BASE_URL
})

// Helper functie om sanctum endpoints aan te roepen zonder /api prefix
export const getSanctumCsrfCookie = async (): Promise<void> => {
  const baseUrl = getBaseUrl()
  await axios.get(`${baseUrl}/sanctum/csrf-cookie`, {
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
      console.log('🌐 API Request:', {
        baseURL: baseURL,
        url: url,
        fullUrl: fullUrl,
        hasDoubleApi: fullUrl.includes('/api/api/')
      })
      
      // Als er dubbele /api/api/ in zit, corrigeer het DIRECT
      if (fullUrl.includes('/api/api/')) {
        console.error('❌ DUBBELE /api/api/ GEDETECTEERD!')
        console.error('   Origineel:', fullUrl)
        
        // Verwijder de dubbele /api/ - vervang alle voorkomens
        const correctedUrl = fullUrl.replace(/\/api\/api\//g, '/api/')
        console.warn('   ✅ Gecorrigeerd naar:', correctedUrl)
        
        // Parse de gecorrigeerde URL en update de config
        try {
          const urlObj = new URL(correctedUrl)
          // Update baseURL naar alleen het protocol + host
          config.baseURL = `${urlObj.protocol}//${urlObj.host}`
          // Update url naar alleen het path + query
          config.url = urlObj.pathname + urlObj.search
          
          console.log('   📝 Config bijgewerkt:', {
            newBaseURL: config.baseURL,
            newUrl: config.url
          })
        } catch (e) {
          console.error('❌ Fout bij parsen URL:', e, correctedUrl)
        }
      }
    }
    return config
  },
  (error) => Promise.reject(error),
  { runWhen: (config) => !!config.url } // Alleen uitvoeren als er een URL is
)

apiClient.interceptors.request.use((config) => {
  if (typeof document !== 'undefined') {
    const match = document.cookie
      .split('; ')
      .find((row) => row.startsWith('XSRF-TOKEN='))

    if (match) {
      const value = decodeURIComponent(match.split('=')[1])
      config.headers = config.headers ?? {}
      config.headers['X-XSRF-TOKEN'] = value
    }
  }

  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status
    const url: string | undefined = error.config?.url

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

