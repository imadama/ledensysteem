import axios from 'axios'
import { API_BASE_URL, getBaseUrl } from './config'
import { authManager } from '../context/authManager'

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-XSRF-TOKEN',
})

// Helper functie om sanctum endpoints aan te roepen zonder /api prefix
export const getSanctumCsrfCookie = async (): Promise<void> => {
  const baseUrl = getBaseUrl()
  await axios.get(`${baseUrl}/sanctum/csrf-cookie`, {
    withCredentials: true,
  })
}

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

