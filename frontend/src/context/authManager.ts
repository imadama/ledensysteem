type AuthState = {
  user: any
  roles: string[]
  organisation: any
}

// Routes die zonder sessie bereikbaar moeten blijven. AuthProvider roept bij mount
// /api/auth/me aan; op deze pagina's is de 401 die daarop volgt de normale situatie,
// want wie hier is heeft juist géén sessie. Zonder deze uitzondering wordt iemand met
// een reset- of activatielink naar /login gestuurd voordat hij iets kan invullen.
const PUBLIC_PATHS = [
  '/login',
  '/forgot-password',
  '/reset-password',
  '/register-organisation',
  '/aanmelden',
  '/portal/login',
  '/portal/forgot-password',
  '/portal/activate',
]

const isPublicPath = (path: string): boolean =>
  PUBLIC_PATHS.some((publicPath) => path === publicPath || path.startsWith(`${publicPath}/`))

class AuthManager {
  private subscribers: Array<(state: AuthState | null) => void> = []
  private currentState: AuthState | null = null

  public setAuth(state: AuthState): void {
    this.currentState = state
    this.notify()
  }

  public clearAuth(): void {
    this.currentState = null
    this.notify()

    if (typeof window === 'undefined') {
      return
    }

    const path = window.location.pathname

    if (isPublicPath(path)) {
      return
    }

    if (path.startsWith('/portal')) {
      window.location.assign('/portal/login')
      return
    }

    window.location.assign('/login')
  }

  public getState(): AuthState | null {
    return this.currentState
  }

  public subscribe(listener: (state: AuthState | null) => void): () => void {
    this.subscribers.push(listener)

    return () => {
      this.subscribers = this.subscribers.filter((l) => l !== listener)
    }
  }

  private notify(): void {
    this.subscribers.forEach((listener) => listener(this.currentState))
  }
}

export const authManager = new AuthManager()

