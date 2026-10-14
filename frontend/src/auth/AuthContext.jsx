import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import * as api from '../api/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  // If a token is saved, we must verify it with the backend before deciding
  // whether to show the app or the login page.
  const [checking, setChecking] = useState(() => Boolean(api.getToken()))

  useEffect(() => {
    if (!api.getToken()) return
    api
      .getUser()
      .then(setUser)
      .catch(() => api.clearToken())
      .finally(() => setChecking(false))
  }, [])

  // api.js fires this event whenever the backend says 401 (expired token etc.)
  useEffect(() => {
    const onUnauthorized = () => setUser(null)
    window.addEventListener('leettrack:unauthorized', onUnauthorized)
    return () => window.removeEventListener('leettrack:unauthorized', onUnauthorized)
  }, [])

  const login = useCallback(async (email, password) => {
    const data = await api.login(email, password)
    api.setToken(data.access_token)
    setUser(data.user)
  }, [])

  const register = useCallback(async (username, email, password) => {
    const data = await api.register(username, email, password)
    api.setToken(data.access_token)
    setUser(data.user)
  }, [])

  const logout = useCallback(() => {
    api.clearToken()
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, checking, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
