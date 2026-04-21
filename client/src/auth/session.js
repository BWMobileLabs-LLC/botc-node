/** sessionStorage keys for the SPA session (refresh token stays in HTTP-only cookie). */
const ACCESS_TOKEN_KEY = 'botc_access_token'
const USER_KEY = 'botc_user'

/** For non-React code or fetch helpers: read the current access token, if any. */
export function getStoredAccessToken() {
  return sessionStorage.getItem(ACCESS_TOKEN_KEY)
}

export function loadPersistedSession() {
  try {
    const accessToken = sessionStorage.getItem(ACCESS_TOKEN_KEY)
    const raw = sessionStorage.getItem(USER_KEY)
    if (!accessToken || !raw) return null
    const user = JSON.parse(raw)
    if (!user || typeof user !== 'object') return null
    return { accessToken, user }
  } catch {
    return null
  }
}

export function persistSession(accessToken, user) {
  sessionStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
  sessionStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function clearPersistedSession() {
  sessionStorage.removeItem(ACCESS_TOKEN_KEY)
  sessionStorage.removeItem(USER_KEY)
}
