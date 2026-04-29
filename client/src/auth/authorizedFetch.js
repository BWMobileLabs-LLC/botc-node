/**
 * Returns a fetch wrapper that sends Bearer auth and, on 401, tries POST /api/auth/refresh once
 * (deduped), then retries the request with the new access token.
 */
let refreshInFlight = null

/**
 * Single deduped POST /api/auth/refresh. Used by authorizedFetch and AuthProvider bootstrap
 * so concurrent refresh attempts (e.g. Strict Mode + first API call) share one rotation.
 */
export function refreshAccessTokenOnce(applySession, getUser) {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const r = await fetch('/api/auth/refresh', {
          method: 'POST',
          credentials: 'include',
        })
        if (!r.ok) return null
        const data = await r.json()
        if (!data?.accessToken) return null
        const prevUser = getUser()
        const nextUser =
          data.user?.id != null && typeof data.user.username === 'string'
            ? { id: data.user.id, username: data.user.username }
            : prevUser && String(prevUser.id) === String(data.user_id)
              ? prevUser
              : { id: data.user_id, username: prevUser?.username ?? '' }
        applySession(data.accessToken, nextUser)
        return data.accessToken
      } catch {
        return null
      } finally {
        refreshInFlight = null
      }
    })()
  }
  return refreshInFlight
}

export function createAuthorizedFetch({ getAccessToken, getUser, applySession }) {
  return async function authorizedFetch(input, init = {}) {
    const run = (token) => {
      const headers = new Headers(init.headers ?? undefined)
      if (token) headers.set('Authorization', `Bearer ${token}`)
      return fetch(input, { ...init, headers, credentials: 'include' })
    }

    let res = await run(getAccessToken())
    if (res.status !== 401) return res

    const newToken = await refreshAccessTokenOnce(applySession, getUser)
    if (!newToken) return res
    return run(newToken)
  }
}
