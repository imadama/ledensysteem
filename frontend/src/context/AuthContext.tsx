import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { apiClient } from '../api/axios'
import { authManager } from './authManager'

type Organisation = {
  id: number
  name: string
  status: string
  city?: string | null
  country?: string | null
  contact_email?: string | null
}

type User = {
  id: number
  first_name: string
  last_name: string
  email: string
  status: string
  roles: string[]
  organisation?: Organisation | null
}

type AuthContextValue = {
  user: User | null
  roles: string[]
  organisation: Organisation | null
  isLoading: boolean
  login: (credentials: { email: string; password: string }) => Promise<void>
  logout: () => Promise<void>
  refreshMe: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)

  const refreshMe = useCallback(async () => {
    try {
      const { data } = await apiClient.get<User>('/api/auth/me')
      setUser(data)
      authManager.setAuth({
        user: data,
        roles: data.roles,
        organisation: data.organisation ?? null,
      })
    } catch (error) {
      setUser(null)
      authManager.clearAuth()
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshMe()
    const unsubscribe = authManager.subscribe((state) => {
      if (!state) {
        setUser(null)
      }
    })

    return () => unsubscribe()
  }, [refreshMe])

  const login = useCallback(async (credentials: { email: string; password: string }) => {
    const { data } = await apiClient.post<User>('/api/auth/login', credentials)
    setUser(data)
    authManager.setAuth({
      user: data,
      roles: data.roles,
      organisation: data.organisation ?? null,
    })
  }, [])

  const logout = useCallback(async () => {
    await apiClient.post('/api/auth/logout')
    setUser(null)
    authManager.clearAuth()
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      roles: user?.roles ?? [],
      organisation: user?.organisation ?? null,
      isLoading,
      login,
      logout,
      refreshMe,
    }),
    [isLoading, login, logout, refreshMe, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

