import { useCallback, useEffect, useMemo, useState } from 'react'
import { createAuthorizedFetch, refreshAccessTokenOnce } from './authorizedFetch.js'
import { AuthContext } from './authContext.js'
import { clearGameSession } from '../game/gameSession.js'
import { clearPersistedSession, loadPersistedSession, persistSession } from './session.js'

export function AuthProvider({ children }) {
  const [accessToken, setAccessToken] = useState(
    () => loadPersistedSession()?.accessToken ?? null
  )
  const [user, setUser] = useState(() => loadPersistedSession()?.user ?? null)
  /** False until we know cookie-only sessions are resolved (sessionStorage empty but refresh cookie may exist). */
  const [authReady, setAuthReady] = useState(() => Boolean(loadPersistedSession()?.accessToken))

  const applySession = useCallback((token, nextUser) => {
    setUser((prevUser) => {
      const prevId = prevUser?.id != null ? String(prevUser.id) : null
      const nextId = nextUser?.id != null ? String(nextUser.id) : null
      if (prevId != null && nextId != null && prevId !== nextId) {
        clearGameSession()
      }
      return nextUser
    })
    setAccessToken(token)
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

  const authorizedFetch = useMemo(
    () =>
      createAuthorizedFetch({
        getAccessToken: () => accessToken,
        getUser: () => user,
        applySession,
      }),
    [accessToken, user, applySession]
  )

  /**
   * New tab: sessionStorage is empty but HTTP-only refresh cookie can still be valid.
   * Restore access JWT before UI gates on `isAuthenticated` (Game / Account); otherwise only
   * pages that call `authorizedFetch` (e.g. My Scripts) would repopulate the session.
   */
  useEffect(() => {
    // `authReady` is already true when `loadPersistedSession()` had an access token (see initial state).
    if (loadPersistedSession()?.accessToken) return

    let cancelled = false
    ;(async () => {
      try {
        await refreshAccessTokenOnce(applySession, () => null)
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setAuthReady(true)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [applySession])

  /** Repair sessions that have an access token but no usable user (e.g. after refresh before server returned `user`). */
  useEffect(() => {
    if (!accessToken || user?.username) return

    let cancelled = false

    ;(async () => {
      try {
        const res = await authorizedFetch('/api/auth/me')
        if (!res.ok) return
        const data = await res.json()
        if (cancelled || !data?.username) return
        const nextUser = {
          id: data.id,
          username: data.username,
          ...(data.email ? { email: data.email } : {}),
        }
        setUser(nextUser)
        const token = loadPersistedSession()?.accessToken ?? accessToken
        persistSession(token, nextUser)
      } catch {
        /* ignore */
      }
    })()

    return () => {
      cancelled = true
    }
  }, [accessToken, user?.username, authorizedFetch])

  const value = useMemo(
    () => ({
      accessToken,
      user,
      isAuthenticated: Boolean(accessToken),
      authReady,
      applySession,
      signOut,
      authorizedFetch,
    }),
    [accessToken, user, authReady, applySession, signOut, authorizedFetch]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
