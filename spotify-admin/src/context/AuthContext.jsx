import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { authApi } from '../api/auth.js'

const AuthContext = createContext(null)

// eslint-disable-next-line react/prop-types -- context wrapper
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    authApi.restore().then((restored) => {
      setUser(restored)
      setReady(true)
    })
  }, [])

  const value = useMemo(
    () => ({
      user,
      ready,
      signedIn: Boolean(user),
      isAdmin: user?.role === 'admin',
      canPublish: user?.role === 'admin' || user?.role === 'artist',
      async login(body) {
        const next = await authApi.login(body)
        setUser(next)
        return next
      },
      async logout() {
        await authApi.logout()
        setUser(null)
      },
    }),
    [user, ready],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components -- hook lives next to the provider
export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside AuthProvider')
  return value
}
