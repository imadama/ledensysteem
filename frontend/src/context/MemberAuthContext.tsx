import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { apiClient } from '../api/axios'

type MemberProfile = {
  user: {
    id: number
    email: string
    status: string
    first_name: string
    last_name: string
  }
  member: {
    id: number
    first_name: string
    last_name: string
    birth_date: string | null
    street_address: string | null
    postal_code: string | null
    city: string | null
    phone: string | null
    iban: string | null
    email: string | null
  }
  organisation: {
    id: number | null
    name: string | null
  }
}

type MemberAuthContextValue = {
  memberUser: MemberProfile | null
  isLoading: boolean
  memberLogin: (credentials: { email: string; password: string }) => Promise<void>
  memberLogout: () => Promise<void>
  loadCurrentMember: () => Promise<void>
}

const MemberAuthContext = createContext<MemberAuthContextValue | undefined>(undefined)

export const MemberAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [memberUser, setMemberUser] = useState<MemberProfile | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)

  const loadCurrentMember = useCallback(async (): Promise<MemberProfile | null> => {
    setIsLoading(true)
    try {
      const { data } = await apiClient.get<{ data: MemberProfile }>('/api/member/profile')
      setMemberUser(data.data)
      return data.data
    } catch (error: any) {
      if (error.response?.status === 403 || error.response?.status === 401) {
        setMemberUser(null)
        return null
      } else {
        console.error('Laden van ledenprofiel mislukt', error)
      }
    } finally {
      setIsLoading(false)
    }
    return null
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname

      if (path.startsWith('/portal/activate')) {
        setIsLoading(false)
        return
      }
    }

    void loadCurrentMember()
  }, [loadCurrentMember])

  const memberLogin = useCallback(
    async (credentials: { email: string; password: string }) => {
      setIsLoading(true)
      try {
        await apiClient.get('/sanctum/csrf-cookie')
        await apiClient.post('/api/auth/login', credentials)
        const profile = await loadCurrentMember()

        if (!profile) {
          const { data } = await apiClient.get('/api/auth/me')
          const roles: string[] = data?.roles ?? []

          if (!roles.includes('member')) {
            throw new Error('no_member_role')
          }
        }
      } catch (error: any) {
        if (error?.message === 'no_member_role' || error.response?.status === 403) {
          await apiClient.post('/api/auth/logout').catch(() => null)
          setMemberUser(null)
          throw new Error('Dit account is geen ledenportaal-account. Gebruik het beheerdersportaal.')
        }

        if (error.response?.status === 422) {
          throw new Error('Ongeldige inloggegevens.')
        }

        throw new Error('Inloggen mislukt. Probeer het later opnieuw.')
      } finally {
        setIsLoading(false)
      }
    },
    [loadCurrentMember],
  )

  const memberLogout = useCallback(async () => {
    try {
      await apiClient.post('/api/auth/logout')
    } catch (error) {
      console.error('Uitloggen mislukt', error)
    } finally {
      setMemberUser(null)
    }
  }, [])

  const value = useMemo<MemberAuthContextValue>(
    () => ({
      memberUser,
      isLoading,
      memberLogin,
      memberLogout,
      loadCurrentMember,
    }),
    [isLoading, memberLogin, memberLogout, memberUser, loadCurrentMember],
  )

  return <MemberAuthContext.Provider value={value}>{children}</MemberAuthContext.Provider>
}

export const useMemberAuth = (): MemberAuthContextValue => {
  const context = useContext(MemberAuthContext)
  if (!context) {
    throw new Error('useMemberAuth must be used within a MemberAuthProvider')
  }
  return context
}


