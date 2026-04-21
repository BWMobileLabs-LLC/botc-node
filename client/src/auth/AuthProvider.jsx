import { useCallback, useMemo, useState } from 'react'
import { createAuthorizedFetch } from './authorizedFetch.js'
import { AuthContext } from './authContext.js'
import { clearPersistedSession, loadPersistedSession, persistSession } from './session.js'

export function AuthProvider({ children }) {
  const [accessToken, setAccessToken] = useState(
    () => loadPersistedSession()?.accessToken ?? null
  )
  const [user, setUser] = useState(() => loadPersistedSession()?.user ?? null)

  const applySession = useCallback((token, nextUser) => {
    setAccessToken(token)
    setUser(nextUser)
    persistSession(token, nextUser)
  }, [])

  const signOut = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      })
    } catch {
      /* ignore network errors; still clear client */
    }
    setAccessToken(null)
    setUser(null)
    clearPersistedSession()
  }, [])

  const authorizedFetch = useMemo(
    () =>
      createAuthorizedFetch({
        getAccessToken: () => accessToken,
        getUser: () => user,
        applySession,
      }),
    [accessToken, user, applySession]
  )

  const value = useMemo(
    () => ({
      accessToken,
      user,
      isAuthenticated: Boolean(accessToken),
      applySession,
      signOut,
      authorizedFetch,
    }),
    [accessToken, user, applySession, signOut, authorizedFetch]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
