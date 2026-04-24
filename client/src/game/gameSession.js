const STORAGE_KEY = 'botc_game_session'

/**
 * @typedef {{ gameId: string, inviteCode: string, isStoryteller: boolean }} GameSession
 */

/** @param {unknown} value */
function normalizeGameId(value) {
  if (value == null) return ''
  if (typeof value === 'string') {
    const t = value.trim()
    return t.length > 0 ? t : ''
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value)
  }
  return ''
}

/** @returns {GameSession | null} */
export function loadGameSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw)
    const gameId = normalizeGameId(data?.gameId)
    if (
      data &&
      typeof data.inviteCode === 'string' &&
      data.inviteCode.length > 0 &&
      gameId.length > 0
    ) {
      return {
        gameId,
        inviteCode: data.inviteCode,
        isStoryteller: Boolean(data.isStoryteller),
      }
    }
    return null
  } catch {
    return null
  }
}

/** @param {GameSession} session */
export function saveGameSession(session) {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      gameId: session.gameId,
      inviteCode: session.inviteCode,
      isStoryteller: session.isStoryteller,
    })
  )
}

export function clearGameSession() {
  localStorage.removeItem(STORAGE_KEY)
}
