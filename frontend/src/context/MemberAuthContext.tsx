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
  loadCurrentMember: () => Promise<MemberProfile | null>
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
        // Log de error voor debugging
        console.error('Member profiel kan niet worden geladen (403/401)', {
          status: error.response?.status,
          message: error.response?.data?.message,
          url: error.config?.url,
        })
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
          // Als het profiel niet kan worden geladen, controleer of de user de member rol heeft
          const { data } = await apiClient.get('/api/auth/me')
          const roles: string[] = data?.roles ?? []

          if (!roles.includes('member')) {
            throw new Error('no_member_role')
          }

          // Als de user wel de member rol heeft maar het profiel niet kan worden geladen,
          // probeer het opnieuw te laden of gooi een specifieke error
          const retryProfile = await loadCurrentMember()
          if (!retryProfile) {
            // Log de error voor debugging
            console.error('Member profiel kan niet worden geladen ondanks member rol', {
              userId: data.id,
              email: data.email,
              roles: roles,
            })
            throw new Error('Profiel kan niet worden geladen. Neem contact op met de beheerder.')
          }
        }
      } catch (error: any) {
        if (error?.message === 'no_member_role' || error.response?.status === 403) {
          await apiClient.post('/api/auth/logout').catch(() => null)
          setMemberUser(null)
          throw new Error('Dit account is geen ledenportaal-account. Gebruik het beheerdersportaal.')
        }

        if (error.response?.status === 422) {
          // Toon specifieke validatie errors als beschikbaar
          const validationErrors = error.response?.data?.errors
          if (validationErrors) {
            const errorArray = Object.values(validationErrors).flat()
            const firstError = Array.isArray(errorArray) && errorArray.length > 0 ? errorArray[0] : null
            if (typeof firstError === 'string') {
              throw new Error(firstError)
            }
          }
          throw new Error('Ongeldige inloggegevens.')
        }

        // Als het een specifieke error message is, gebruik die
        if (error?.message) {
          throw error
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


