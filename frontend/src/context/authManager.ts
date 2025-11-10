type AuthState = {
  user: any
  roles: string[]
  organisation: any
}

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

    if (path.startsWith('/portal')) {
      if (path.startsWith('/portal/activate')) {
        return
      }

      if (path !== '/portal/login') {
        window.location.assign('/portal/login')
      }
      return
    }

    if (path !== '/login') {
        window.location.assign('/login')
    }
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

