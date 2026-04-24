import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import '../App.css'
import './GamePage.css'
import { useAuth } from '../auth/useAuth.js'
import { clearGameSession, loadGameSession, saveGameSession } from '../game/gameSession.js'

function gameIdFromApiBody(raw) {
  if (raw == null) return ''
  const s = String(raw).trim()
  return s.length > 0 ? s : ''
}

async function readErrorMessage(res) {
  try {
    const body = await res.json()
    return body.error || body.message || `Request failed (${res.status})`
  } catch {
    return `Request failed (${res.status})`
  }
}

export default function GamePage() {
  const { isAuthenticated, authorizedFetch } = useAuth()
  const [session, setSession] = useState(() => loadGameSession())

  const [gameName, setGameName] = useState('')
  const [inviteInput, setInviteInput] = useState('')
  const [createError, setCreateError] = useState(null)
  const [joinError, setJoinError] = useState(null)
  const [createPending, setCreatePending] = useState(false)
  const [joinPending, setJoinPending] = useState(false)
  const [leavePending, setLeavePending] = useState(false)
  const [copyOk, setCopyOk] = useState(false)
  const [gameSnapshot, setGameSnapshot] = useState(null)
  const [gameFetchStatus, setGameFetchStatus] = useState('idle')
  const [gameFetchError, setGameFetchError] = useState(null)

  const refreshSession = useCallback(() => {
    setSession(loadGameSession())
  }, [])

  useEffect(() => {
    if (!isAuthenticated) {
      setSession(null)
      return
    }
    setSession(loadGameSession())
  }, [isAuthenticated])

  useEffect(() => {
    if (!isAuthenticated || !session?.gameId) {
      setGameSnapshot(null)
      setGameFetchStatus('idle')
      setGameFetchError(null)
      return
    }

    let cancelled = false
    setGameFetchStatus('loading')
    setGameFetchError(null)

    authorizedFetch(`/api/games/${encodeURIComponent(session.gameId)}`)
      .then(async (res) => {
        if (cancelled) return
        if (!res.ok) {
          setGameFetchError(await readErrorMessage(res))
          setGameFetchStatus('error')
          setGameSnapshot(null)
          return
        }
        const data = await res.json()
        if (cancelled) return
        if (!data?.game) {
          setGameFetchError('Unexpected response from server.')
          setGameFetchStatus('error')
          setGameSnapshot(null)
          return
        }
        setGameSnapshot(data)
        setGameFetchStatus('ok')
      })
      .catch(() => {
        if (!cancelled) {
          setGameFetchError('Could not load game.')
          setGameFetchStatus('error')
          setGameSnapshot(null)
        }
      })

    return () => {
      cancelled = true
    }
  }, [isAuthenticated, session?.gameId, authorizedFetch])

  const onCreate = async (e) => {
    e.preventDefault()
    setCreateError(null)
    const name = gameName.trim()
    if (!name) {
      setCreateError('Enter a game name.')
      return
    }
    setCreatePending(true)
    try {
      const res = await authorizedFetch('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ game_name: name }),
      })
      if (res.status === 401) {
        setCreateError('Sign in to create a game.')
        return
      }
      if (!res.ok) {
        setCreateError(await readErrorMessage(res))
        return
      }
      const data = await res.json()
      const gameId = gameIdFromApiBody(data.game_id)
      const inviteCode = typeof data.invite_code === 'string' ? data.invite_code.trim() : ''
      if (!gameId || !inviteCode) {
        setCreateError('Unexpected response from server.')
        return
      }
      saveGameSession({ gameId, inviteCode, isStoryteller: true })
      setGameName('')
      refreshSession()
    } catch {
      setCreateError('Network error — try again.')
    } finally {
      setCreatePending(false)
    }
  }

  const onJoin = async (e) => {
    e.preventDefault()
    setJoinError(null)
    const code = inviteInput.trim()
    if (!code) {
      setJoinError('Enter an invite code.')
      return
    }
    setJoinPending(true)
    try {
      const res = await authorizedFetch('/api/games/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invite_code: code }),
      })
      if (res.status === 401) {
        setJoinError('Sign in to join a game.')
        return
      }
      if (res.status === 404) {
        setJoinError('No game found with that invite code.')
        return
      }
      if (!res.ok) {
        setJoinError(await readErrorMessage(res))
        return
      }
      const data = await res.json()
      const gameId = gameIdFromApiBody(data.game_id)
      const inviteCode =
        typeof data.invite_code === 'string' && data.invite_code.trim()
          ? data.invite_code.trim()
          : code
      if (!gameId) {
        setJoinError('Unexpected response from server.')
        return
      }
      saveGameSession({ gameId, inviteCode, isStoryteller: false })
      setInviteInput('')
      refreshSession()
    } catch {
      setJoinError('Network error — try again.')
    } finally {
      setJoinPending(false)
    }
  }

  const onCopyInvite = async () => {
    if (!session?.inviteCode) return
    try {
      await navigator.clipboard.writeText(session.inviteCode)
      setCopyOk(true)
      window.setTimeout(() => setCopyOk(false), 2000)
    } catch {
      setCopyOk(false)
    }
  }

  const onLeaveLobby = async () => {
    if (!session) return
    setLeavePending(true)
    try {
      if (!session.isStoryteller) {
        const res = await authorizedFetch(`/api/games/${session.gameId}/leave`, {
          method: 'POST',
        })
        if (!res.ok && res.status !== 404) {
          /* still clear local session so UI is not stuck */
        }
      }
    } catch {
      /* ignore */
    } finally {
      clearGameSession()
      refreshSession()
      setLeavePending(false)
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="page game-page">
        <h1 className="page__title">Game</h1>
        <p className="game-page__lead">
          Sign in to create a game or join with an invite code.{' '}
          <Link to="/auth" className="game-page__link">
            Go to Account
          </Link>
        </p>
      </div>
    )
  }

  if (session) {
    return (
      <div className="page game-page">
        <h1 className="page__title">Game</h1>
        <section className="game-page__in-game" aria-labelledby="game-invite-heading">
          <p id="game-invite-heading" className="game-page__in-game-label">
            {session.isStoryteller ? 'You are hosting this game.' : 'You are in this game.'}
          </p>
          <p className="game-page__invite-hint">Share this invite code with players:</p>
          <div className="game-page__invite-row">
            <output className="game-page__invite-code" aria-live="polite">
              {session.inviteCode}
            </output>
            <button type="button" className="game-page__copy-btn" onClick={onCopyInvite}>
              {copyOk ? 'Copied' : 'Copy'}
            </button>
          </div>

          <div className="game-page__snapshot" aria-live="polite">
            {gameFetchStatus === 'loading' && (
              <p className="game-page__snapshot-status">Loading game…</p>
            )}
            {gameFetchStatus === 'error' && gameFetchError && (
              <p className="game-page__snapshot-status game-page__snapshot-status--error" role="alert">
                {gameFetchError}
              </p>
            )}
            {gameFetchStatus === 'ok' && gameSnapshot?.game && (
              <>
                <h2 className="game-page__snapshot-title">Current game</h2>
                <dl className="game-page__snapshot-dl">
                  <div className="game-page__snapshot-row">
                    <dt>Name</dt>
                    <dd>{gameSnapshot.game.name ?? '—'}</dd>
                  </div>
                  <div className="game-page__snapshot-row">
                    <dt>Status</dt>
                    <dd>{gameSnapshot.game.status ?? '—'}</dd>
                  </div>
                  <div className="game-page__snapshot-row">
                    <dt>Phase</dt>
                    <dd>{gameSnapshot.game.day ?? '—'}</dd>
                  </div>
                  <div className="game-page__snapshot-row">
                    <dt>Storyteller</dt>
                    <dd>{gameSnapshot.game.storyteller ?? '—'}</dd>
                  </div>
                </dl>
                {Array.isArray(gameSnapshot.players) && gameSnapshot.players.length > 0 && (
                  <div className="game-page__players">
                    <h3 className="game-page__players-title">Players ({gameSnapshot.players.length})</h3>
                    <ul className="game-page__players-list">
                      {gameSnapshot.players.map((p, i) => {
                        const label =
                          p.display_name?.trim() ||
                          p.username?.trim() ||
                          (p.seat != null ? `Seat ${p.seat}` : `Player ${i + 1}`)
                        const meta =
                          p.seat != null && (p.display_name?.trim() || p.username?.trim())
                            ? ` · seat ${p.seat}`
                            : ''
                        const key = p.id ?? `${p.username ?? ''}-${p.seat ?? ''}-${i}`
                        return (
                          <li key={key} className="game-page__players-item">
                            {label}
                            {meta}
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                )}
                {Array.isArray(gameSnapshot.players) && gameSnapshot.players.length === 0 && (
                  <p className="game-page__snapshot-foot">No players have joined yet.</p>
                )}
                <p className="game-page__snapshot-foot">Refresh the page to load the latest state.</p>
              </>
            )}
          </div>

          <button
            type="button"
            className="game-page__leave-btn"
            onClick={onLeaveLobby}
            disabled={leavePending}
          >
            {leavePending ? 'Leaving…' : 'Leave lobby'}
          </button>
        </section>
      </div>
    )
  }

  return (
    <div className="page game-page">
      <h1 className="page__title">Game</h1>
      <p className="game-page__lead">Create a new lobby or join one with a code from the storyteller.</p>

      <div className="game-page__panels">
        <section className="game-page__panel" aria-labelledby="game-create-heading">
          <h2 id="game-create-heading" className="game-page__panel-title">
            Create game
          </h2>
          <form className="game-page__form" onSubmit={onCreate}>
            <label className="game-page__field">
              <span className="game-page__field-label">Game name</span>
              <input
                name="game_name"
                value={gameName}
                onChange={(e) => setGameName(e.target.value)}
                autoComplete="off"
                maxLength={120}
                placeholder="e.g. Thursday Trouble"
              />
            </label>
            {createError && (
              <p className="game-page__error" role="alert">
                {createError}
              </p>
            )}
            <button type="submit" className="game-page__submit" disabled={createPending}>
              {createPending ? 'Creating…' : 'Create game'}
            </button>
          </form>
        </section>

        <section className="game-page__panel" aria-labelledby="game-join-heading">
          <h2 id="game-join-heading" className="game-page__panel-title">
            Join with code
          </h2>
          <form className="game-page__form" onSubmit={onJoin}>
            <label className="game-page__field">
              <span className="game-page__field-label">Invite code</span>
              <input
                name="invite_code"
                value={inviteInput}
                onChange={(e) => setInviteInput(e.target.value)}
                autoComplete="off"
                maxLength={32}
                placeholder="6-character code"
              />
            </label>
            {joinError && (
              <p className="game-page__error" role="alert">
                {joinError}
              </p>
            )}
            <button type="submit" className="game-page__submit" disabled={joinPending}>
              {joinPending ? 'Joining…' : 'Join game'}
            </button>
          </form>
        </section>
      </div>
    </div>
  )
}
