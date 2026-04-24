import { useCallback, useEffect, useMemo, useState } from 'react'
import { createAuthorizedFetch } from './authorizedFetch.js'
import { AuthContext } from './authContext.js'
import { clearGameSession } from '../game/gameSession.js'
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
    clearGameSession()
  }, [])

  /** Repair sessions that have an access token but no usable user (e.g. after refresh before server returned `user`). */
  useEffect(() => {
    if (!accessToken || user?.username) return

    let cancelled = false

    ;(async () => {
      try {
        const res = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${accessToken}` },
          credentials: 'include',
        })
        if (!res.ok) return
        const data = await res.json()
        if (cancelled || !data?.username) return
        const nextUser = {
          id: data.id,
          username: data.username,
          ...(data.email ? { email: data.email } : {}),
        }
        setUser(nextUser)
        persistSession(accessToken, nextUser)
      } catch {
        /* ignore */
      }
    })()

    return () => {
      cancelled = true
    }
  }, [accessToken, user?.username])

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
