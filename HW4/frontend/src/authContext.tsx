import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { api, type SignupInput, type User } from './api'

type AuthState = {
  user: User | null
  /** True until the first /api/auth/me check finishes. */
  checking: boolean
  login: (email: string, password: string) => Promise<User>
  signup: (input: SignupInput) => Promise<User>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [checking, setChecking] = useState(true)

  // Restore the session from the HttpOnly cookie on page load.
  useEffect(() => {
    api
      .me()
      .then((r) => setUser(r.user))
      .catch(() => setUser(null))
      .finally(() => setChecking(false))
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const { user } = await api.login(email, password)
    setUser(user)
    return user
  }, [])

  const signup = useCallback(async (input: SignupInput) => {
    const { user } = await api.signup(input)
    setUser(user)
    return user
  }, [])

  const logout = useCallback(async () => {
    await api.logout().catch(() => undefined)
    setUser(null)
  }, [])

  return <AuthContext.Provider value={{ user, checking, login, signup, logout }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
