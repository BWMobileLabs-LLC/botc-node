import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import '../App.css'
import './GamePage.css'
import { useAuth } from '../auth/useAuth.js'
import { useGameScriptPanel } from '../context/GameScriptPanelContext.jsx'
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

function formatGameStatus(status) {
  if (status == null || status === '') return '—'
  const s = String(status)
  if (s === 'lobby') return 'Lobby'
  if (s === 'in_progress') return 'In progress'
  return s.replace(/_/g, ' ')
}

function buildSeatSlots(players) {
  const list = (Array.isArray(players) ? players : []).filter((p) => p != null)
  const n = list.length
  if (n === 0) return []

  const bySeat = new Map()
  for (const p of list) {
    const sn = Number(p.seat)
    if (Number.isFinite(sn) && sn > 0) {
      bySeat.set(sn, p)
    }
  }

  return Array.from({ length: n }, (_, i) => {
    const seatNum = i + 1
    return { seatNum, player: bySeat.get(seatNum) ?? null }
  })
}

function playerDisplayLabel(p, seatNum) {
  if (p == null) return `Seat ${seatNum}`
  const fromName = p.display_name?.trim() || p.username?.trim()
  if (fromName) return fromName
  return `Seat ${seatNum}`
}

function rosterPlayerLabel(p) {
  if (p == null) return 'Player'
  return p.display_name?.trim() || p.username?.trim() || 'Player'
}

export default function GamePage() {
  const { isAuthenticated, authorizedFetch } = useAuth()
  const { setScriptDetail: setPanelScriptDetail } = useGameScriptPanel()
  const [session, setSession] = useState(() => loadGameSession())

  const [gameName, setGameName] = useState('')
  const [inviteInput, setInviteInput] = useState('')
  const [createError, setCreateError] = useState(null)
  const [joinError, setJoinError] = useState(null)
  const [createPending, setCreatePending] = useState(false)
  const [joinPending, setJoinPending] = useState(false)
  const [sessionActionPending, setSessionActionPending] = useState(false)
  const [startGamePending, setStartGamePending] = useState(false)
  const [sessionActionError, setSessionActionError] = useState(null)
  const [confirmAction, setConfirmAction] = useState(null)
  const confirmDialogRef = useRef(null)
  const [copyOk, setCopyOk] = useState(false)
  const [gameSnapshot, setGameSnapshot] = useState(null)
  const [gameFetchStatus, setGameFetchStatus] = useState('idle')
  const [gameFetchError, setGameFetchError] = useState(null)
  const [assignSeatModal, setAssignSeatModal] = useState(null)
  const [assignSeatPending, setAssignSeatPending] = useState(false)
  const [assignSeatError, setAssignSeatError] = useState(null)
  const assignSeatDialogRef = useRef(null)
  const [unseatModal, setUnseatModal] = useState(null)
  const [unseatPending, setUnseatPending] = useState(false)
  const [unseatError, setUnseatError] = useState(null)
  const unseatDialogRef = useRef(null)

  /** Loaded from `GET /api/scripts/:id` when the game has `script_id` (for upcoming UI). */
  const [gameScriptDetail, setGameScriptDetail] = useState(null)
  const [gameScriptDetailStatus, setGameScriptDetailStatus] = useState('idle')
  const [gameScriptDetailError, setGameScriptDetailError] = useState(null)

  const [scriptPickerOpen, setScriptPickerOpen] = useState(false)
  const scriptPickerDialogRef = useRef(null)
  const [scriptSearchInput, setScriptSearchInput] = useState('')
  const [scriptSearchResults, setScriptSearchResults] = useState([])
  const [scriptSearchLoading, setScriptSearchLoading] = useState(false)
  const [scriptSearchError, setScriptSearchError] = useState(null)
  const [scriptPatchPending, setScriptPatchPending] = useState(false)
  const [scriptPatchError, setScriptPatchError] = useState(null)

  const refreshSession = useCallback(() => {
    setSession(loadGameSession())
  }, [])

  useLayoutEffect(() => {
    const el = confirmDialogRef.current
    if (!el) return
    if (confirmAction) {
      if (!el.open) el.showModal()
    } else if (el.open) {
      el.close()
    }
  }, [confirmAction])

  useLayoutEffect(() => {
    const el = assignSeatDialogRef.current
    if (!el) return
    if (assignSeatModal) {
      if (!el.open) el.showModal()
    } else if (el.open) {
      el.close()
    }
  }, [assignSeatModal])

  useLayoutEffect(() => {
    const el = unseatDialogRef.current
    if (!el) return
    if (unseatModal) {
      if (!el.open) el.showModal()
    } else if (el.open) {
      el.close()
    }
  }, [unseatModal])

  useLayoutEffect(() => {
    const el = scriptPickerDialogRef.current
    if (!el) return
    if (scriptPickerOpen) {
      if (!el.open) el.showModal()
    } else if (el.open) {
      el.close()
    }
  }, [scriptPickerOpen])

  useEffect(() => {
    const rawId = gameSnapshot?.game?.script_id
    const scriptId =
      rawId != null && String(rawId).trim() !== '' ? String(rawId).trim() : null

    if (gameFetchStatus !== 'ok' || !scriptId) {
      setGameScriptDetail(null)
      setGameScriptDetailStatus('idle')
      setGameScriptDetailError(null)
      return
    }

    let cancelled = false
    setGameScriptDetailStatus('loading')
    setGameScriptDetailError(null)

    fetch(`/api/scripts/${encodeURIComponent(scriptId)}`)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.error || `Request failed (${res.status})`)
        }
        return res.json()
      })
      .then((data) => {
        if (cancelled) return
        setGameScriptDetail(data)
        setGameScriptDetailStatus('ok')
      })
      .catch((err) => {
        if (!cancelled) {
          setGameScriptDetail(null)
          setGameScriptDetailError(err.message || 'Could not load script.')
          setGameScriptDetailStatus('error')
        }
      })

    return () => {
      cancelled = true
    }
  }, [gameFetchStatus, gameSnapshot?.game?.script_id])

  useEffect(() => {
    if (!scriptPickerOpen) return

    let cancelled = false
    const q = scriptSearchInput.trim()
    const url = q
      ? `/api/scripts/search?${new URLSearchParams({ q })}`
      : '/api/scripts/'

    setScriptSearchLoading(true)
    setScriptSearchError(null)

    fetch(url)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.message || body.error || `Request failed (${res.status})`)
        }
        return res.json()
      })
      .then((rows) => {
        if (!cancelled) setScriptSearchResults(Array.isArray(rows) ? rows : [])
      })
      .catch((err) => {
        if (!cancelled) {
          setScriptSearchResults([])
          setScriptSearchError(err.message || 'Could not search scripts.')
        }
      })
      .finally(() => {
        if (!cancelled) setScriptSearchLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [scriptPickerOpen, scriptSearchInput])

  useEffect(() => {
    if (!session) {
      setPanelScriptDetail(null)
      return
    }
    if (
      gameFetchStatus === 'ok' &&
      gameScriptDetailStatus === 'ok' &&
      gameScriptDetail
    ) {
      setPanelScriptDetail(gameScriptDetail)
      return () => setPanelScriptDetail(null)
    }
    setPanelScriptDetail(null)
  }, [
    session,
    gameFetchStatus,
    gameScriptDetailStatus,
    gameScriptDetail,
    setPanelScriptDetail,
  ])

  useEffect(() => {
    if (!isAuthenticated) {
      setSession(null)
      return
    }
    setSession(loadGameSession())
  }, [isAuthenticated])

  useEffect(() => {
    if (!isAuthenticated) return
    if (loadGameSession()) return

    let cancelled = false
    authorizedFetch('/api/games/current_game')
      .then(async (res) => {
        if (cancelled || !res.ok) return
        const data = await res.json()
        if (cancelled) return
        const gameId = gameIdFromApiBody(data.game_id)
        if (!gameId) return
        const inviteCode = typeof data.invite_code === 'string' ? data.invite_code.trim() : ''
        if (!inviteCode) return
        const isStoryteller = data.is_storyteller === true
        saveGameSession({ gameId, inviteCode, isStoryteller })
        refreshSession()
      })
      .catch(() => {})

    return () => {
      cancelled = true
    }
  }, [isAuthenticated, authorizedFetch, refreshSession])

  useEffect(() => {
    if (!isAuthenticated || !session?.gameId) {
      setGameSnapshot(null)
      setGameFetchStatus('idle')
      setGameFetchError(null)
      return
    }

    const requestGameId = session.gameId
    let cancelled = false
    setGameFetchStatus('loading')
    setGameFetchError(null)

    authorizedFetch(`/api/games/${encodeURIComponent(requestGameId)}`)
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
        const stored = loadGameSession()
        if (
          stored &&
          stored.gameId === requestGameId &&
          typeof data.game.is_storyteller === 'boolean'
        ) {
          saveGameSession({
            gameId: stored.gameId,
            inviteCode: stored.inviteCode,
            isStoryteller: data.game.is_storyteller,
          })
          refreshSession()
        }
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
  }, [isAuthenticated, session?.gameId, authorizedFetch, refreshSession])

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

  const performLeaveGame = async () => {
    const s = loadGameSession()
    if (!s || s.isStoryteller) {
      setConfirmAction(null)
      return
    }
    setSessionActionError(null)
    setSessionActionPending(true)
    try {
      const res = await authorizedFetch(`/api/games/${encodeURIComponent(s.gameId)}/leave`, {
        method: 'POST',
      })
      if (!res.ok && res.status !== 404) {
        setSessionActionError(await readErrorMessage(res))
        return
      }
      clearGameSession()
      refreshSession()
      setConfirmAction(null)
    } catch {
      setSessionActionError('Could not leave the game.')
    } finally {
      setSessionActionPending(false)
    }
  }

  const performEndGame = async () => {
    const s = loadGameSession()
    if (!s || !s.isStoryteller) {
      setConfirmAction(null)
      return
    }
    setSessionActionError(null)
    setSessionActionPending(true)
    try {
      const res = await authorizedFetch(`/api/games/${encodeURIComponent(s.gameId)}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        setSessionActionError(await readErrorMessage(res))
        return
      }
      clearGameSession()
      refreshSession()
      setConfirmAction(null)
    } catch {
      setSessionActionError('Could not end the game.')
    } finally {
      setSessionActionPending(false)
    }
  }

  const performStartGame = async () => {
    const s = loadGameSession()
    if (!s || !s.isStoryteller) return
    setSessionActionError(null)
    setStartGamePending(true)
    try {
      const res = await authorizedFetch(`/api/games/${encodeURIComponent(s.gameId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'in_progress' }),
      })
      if (!res.ok) {
        setSessionActionError(await readErrorMessage(res))
        return
      }
      const fresh = await authorizedFetch(`/api/games/${encodeURIComponent(s.gameId)}`)
      if (fresh.ok) {
        const data = await fresh.json()
        if (data?.game) setGameSnapshot(data)
      }
    } catch {
      setSessionActionError('Could not start the game.')
    } finally {
      setStartGamePending(false)
    }
  }

  const assignPlayerToSeat = useCallback(
    async (userId, seatNum) => {
      const gid = session?.gameId
      if (!gid || seatNum == null) return
      setAssignSeatError(null)
      setAssignSeatPending(true)
      try {
        const res = await authorizedFetch(
          `/api/games/${encodeURIComponent(gid)}/player/${encodeURIComponent(userId)}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ seat_order: seatNum }),
          }
        )
        if (!res.ok) {
          setAssignSeatError(await readErrorMessage(res))
          return
        }
        const fresh = await authorizedFetch(`/api/games/${encodeURIComponent(gid)}`)
        if (fresh.ok) {
          const data = await fresh.json()
          if (data?.game) setGameSnapshot(data)
        }
        setAssignSeatModal(null)
      } catch {
        setAssignSeatError('Could not update seat.')
      } finally {
        setAssignSeatPending(false)
      }
    },
    [session?.gameId, authorizedFetch]
  )

  const clearPlayerSeat = useCallback(
    async (userId) => {
      const gid = session?.gameId
      if (!gid || userId == null) return
      setUnseatError(null)
      setUnseatPending(true)
      try {
        const res = await authorizedFetch(
          `/api/games/${encodeURIComponent(gid)}/player/${encodeURIComponent(userId)}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ seat_order: null }),
          }
        )
        if (!res.ok) {
          setUnseatError(await readErrorMessage(res))
          return
        }
        const fresh = await authorizedFetch(`/api/games/${encodeURIComponent(gid)}`)
        if (fresh.ok) {
          const data = await fresh.json()
          if (data?.game) setGameSnapshot(data)
        }
        setUnseatModal(null)
      } catch {
        setUnseatError('Could not clear this seat.')
      } finally {
        setUnseatPending(false)
      }
    },
    [session?.gameId, authorizedFetch]
  )

  const applyGameScript = useCallback(
    async (scriptId) => {
      const gid = session?.gameId
      if (!gid || scriptId == null || String(scriptId).trim() === '') return
      setScriptPatchError(null)
      setScriptPatchPending(true)
      try {
        const res = await authorizedFetch(`/api/games/${encodeURIComponent(gid)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ script_id: String(scriptId).trim() }),
        })
        if (!res.ok) {
          setScriptPatchError(await readErrorMessage(res))
          return
        }
        const fresh = await authorizedFetch(`/api/games/${encodeURIComponent(gid)}`)
        if (fresh.ok) {
          const data = await fresh.json()
          if (data?.game) setGameSnapshot(data)
        }
        setScriptPickerOpen(false)
        setScriptSearchInput('')
      } catch {
        setScriptPatchError('Could not update script.')
      } finally {
        setScriptPatchPending(false)
      }
    },
    [session?.gameId, authorizedFetch]
  )

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
    const resolvedIsStoryteller =
      gameFetchStatus === 'ok' &&
      gameSnapshot?.game &&
      typeof gameSnapshot.game.is_storyteller === 'boolean'
        ? gameSnapshot.game.is_storyteller
        : session.isStoryteller

    const seatSlots =
      gameFetchStatus === 'ok' && gameSnapshot?.players
        ? buildSeatSlots(gameSnapshot.players)
        : []
    const seatCount = seatSlots.length

    const rosterForAssign =
      resolvedIsStoryteller && Array.isArray(gameSnapshot?.players)
        ? [...gameSnapshot.players]
            .filter((p) => p != null && p.user_id != null && String(p.user_id).trim() !== '')
            .sort((a, b) => rosterPlayerLabel(a).localeCompare(rosterPlayerLabel(b), undefined, { sensitivity: 'base' }))
        : []
    const canStartGame =
      resolvedIsStoryteller && gameFetchStatus === 'ok' && gameSnapshot?.game?.status === 'lobby'

    return (
      <div className="page game-page">
        <h1 className="page__title">Game</h1>
        <section className="game-page__in-game" aria-labelledby="game-invite-heading">
          <div className="game-page__header-row">
            <div className="game-page__invite-block">
              <p id="game-invite-heading" className="game-page__in-game-label">
                {resolvedIsStoryteller ? 'You are hosting this game.' : 'You are in this game.'}
              </p>
              <p className="game-page__invite-hint">
                {resolvedIsStoryteller
                  ? 'Share this invite code with players:'
                  : 'Invite code for this game:'}
              </p>
              <div className="game-page__invite-row">
                <output className="game-page__invite-code" aria-live="polite">
                  {session.inviteCode}
                </output>
                <button type="button" className="game-page__copy-btn" onClick={onCopyInvite}>
                  {copyOk ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>

            <div className="game-page__game-meta" aria-live="polite">
              {gameFetchStatus === 'loading' && (
                <p className="game-page__meta-status">Loading game…</p>
              )}
              {gameFetchStatus === 'error' && gameFetchError && (
                <p className="game-page__meta-status game-page__meta-status--error" role="alert">
                  {gameFetchError}
                </p>
              )}
              {gameFetchStatus === 'ok' && gameSnapshot?.game && (
                <dl className="game-page__meta-dl">
                  <div className="game-page__meta-row">
                    <dt>Current game</dt>
                    <dd>{formatGameStatus(gameSnapshot.game.status)}</dd>
                  </div>
                  <div className="game-page__meta-row">
                    <dt>Phase</dt>
                    <dd>
                      {String(gameSnapshot.game.day ?? '').trim() ? gameSnapshot.game.day : '—'}
                    </dd>
                  </div>
                  <div className="game-page__meta-row">
                    <dt>Name</dt>
                    <dd>{gameSnapshot.game.name ?? '—'}</dd>
                  </div>
                  <div className="game-page__meta-row">
                    <dt>Storyteller</dt>
                    <dd>{gameSnapshot.game.storyteller ?? '—'}</dd>
                  </div>
                </dl>
              )}
            </div>
          </div>

          {sessionActionError && (
            <p className="game-page__session-action-error" role="alert">
              {sessionActionError}
            </p>
          )}

          {resolvedIsStoryteller ? (
            <div className="game-page__story-actions">
              <button
                type="button"
                className="game-page__script-picker-open-btn"
                onClick={() => void performStartGame()}
                disabled={sessionActionPending || startGamePending || !canStartGame}
              >
                {startGamePending ? 'Starting…' : 'Start game'}
              </button>
              <button
                type="button"
                className="game-page__script-picker-open-btn"
                onClick={() => {
                  setAssignSeatModal(null)
                  setUnseatModal(null)
                  setScriptPatchError(null)
                  setScriptSearchError(null)
                  setScriptSearchInput('')
                  setScriptPickerOpen(true)
                }}
                disabled={gameFetchStatus !== 'ok' || sessionActionPending || startGamePending}
              >
                Choose script
              </button>
              <button
                type="button"
                className="game-page__danger-btn"
                onClick={() => {
                  setSessionActionError(null)
                  setConfirmAction('endGame')
                }}
                disabled={sessionActionPending || startGamePending}
              >
                End game
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="game-page__leave-btn"
              onClick={() => {
                setSessionActionError(null)
                setConfirmAction('leave')
              }}
              disabled={sessionActionPending}
            >
              Leave game
            </button>
          )}

          <div className="game-page__seat-stage" aria-label="Player seats">
            {gameFetchStatus === 'ok' && gameSnapshot?.game && seatCount > 0 && (
              <div
                className="game-page__seat-ring"
                role="group"
                style={{ '--seat-n': seatCount }}
              >
                {seatSlots.map(({ seatNum, player }, i) => {
                  const key = `seat-${seatNum}`
                  const ariaEmpty = `Seat ${seatNum}, empty`
                  const ariaTaken = `Seat ${seatNum}, ${playerDisplayLabel(player, seatNum)}`
                  const seatClass = `game-page__seat${player ? ' game-page__seat--taken' : ' game-page__seat--empty'}${resolvedIsStoryteller ? ' game-page__seat--assignable' : ''}`
                  const seatStyle = { '--seat-i': i }

                  const inner = player ? (
                    <>
                      <div className="game-page__seat-icon" aria-hidden="true" />
                      <span className="game-page__seat-label">
                        {playerDisplayLabel(player, seatNum)}
                      </span>
                    </>
                  ) : (
                    <div className="game-page__seat-icon game-page__seat-icon--empty" aria-hidden="true">
                      <span className="game-page__seat-empty-label">Seat {seatNum}</span>
                    </div>
                  )

                  if (resolvedIsStoryteller) {
                    const filledWithoutUser =
                      player &&
                      (player.user_id == null || String(player.user_id).trim() === '')
                    return (
                      <button
                        key={key}
                        type="button"
                        className={seatClass}
                        style={seatStyle}
                        disabled={Boolean(filledWithoutUser)}
                        aria-label={
                          player
                            ? filledWithoutUser
                              ? ariaTaken
                              : `${ariaTaken}. Click to remove from this seat.`
                            : `${ariaEmpty}. Choose player to assign.`
                        }
                        onClick={() => {
                          setAssignSeatError(null)
                          if (!player) {
                            setUnseatModal(null)
                            setAssignSeatModal({ seatNum })
                            return
                          }
                          if (filledWithoutUser) return
                          setAssignSeatModal(null)
                          setUnseatError(null)
                          setUnseatModal({
                            seatNum,
                            userId: player.user_id,
                            label: playerDisplayLabel(player, seatNum),
                          })
                        }}
                      >
                        {inner}
                      </button>
                    )
                  }

                  return (
                    <div
                      key={key}
                      className={seatClass}
                      style={seatStyle}
                      aria-label={player ? ariaTaken : ariaEmpty}
                    >
                      {inner}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <dialog
            ref={confirmDialogRef}
            className="game-page__confirm"
            onClose={() => setConfirmAction(null)}
            aria-labelledby="game-confirm-title"
          >
            {confirmAction === 'leave' && (
              <>
                <h2 id="game-confirm-title" className="game-page__confirm-title">
                  Leave this game?
                </h2>
                <p className="game-page__confirm-body">
                  You will be removed from the roster. You can join again later with the invite code.
                </p>
              </>
            )}
            {confirmAction === 'endGame' && (
              <>
                <h2 id="game-confirm-title" className="game-page__confirm-title">
                  End this game?
                </h2>
                <p className="game-page__confirm-body">
                  This deletes the game for everyone. Players will be removed from the lobby.
                </p>
              </>
            )}
            {(confirmAction === 'leave' || confirmAction === 'endGame') && (
              <div className="game-page__confirm-actions">
                <button
                  type="button"
                  className="game-page__confirm-cancel"
                  onClick={() => setConfirmAction(null)}
                  disabled={sessionActionPending}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className={
                    confirmAction === 'endGame'
                      ? 'game-page__confirm-danger'
                      : 'game-page__confirm-primary'
                  }
                  disabled={sessionActionPending}
                  onClick={() => {
                    if (confirmAction === 'leave') void performLeaveGame()
                    else void performEndGame()
                  }}
                >
                  {sessionActionPending
                    ? confirmAction === 'endGame'
                      ? 'Ending…'
                      : 'Leaving…'
                    : confirmAction === 'endGame'
                      ? 'End game'
                      : 'Leave game'}
                </button>
              </div>
            )}
          </dialog>

          <dialog
            ref={assignSeatDialogRef}
            className="game-page__assign-dialog"
            onClose={() => {
              setAssignSeatModal(null)
              setAssignSeatError(null)
            }}
            aria-labelledby="assign-seat-title"
          >
            {assignSeatModal && (
              <>
                <h2 id="assign-seat-title" className="game-page__assign-dialog-title">
                  Assign seat {assignSeatModal.seatNum}
                </h2>
                <p className="game-page__assign-dialog-hint">Choose a player for this seat.</p>
                {assignSeatError && (
                  <p className="game-page__assign-dialog-error" role="alert">
                    {assignSeatError}
                  </p>
                )}
                <ul className="game-page__assign-dialog-list">
                  {rosterForAssign.map((p) => {
                    const uid = p.user_id
                    const label = rosterPlayerLabel(p)
                    const seatHint =
                      p.seat != null &&
                      Number.isFinite(Number(p.seat)) &&
                      Number(p.seat) > 0
                        ? `Seat ${p.seat}`
                        : null
                    return (
                      <li key={uid}>
                        <button
                          type="button"
                          className="game-page__assign-dialog-player"
                          disabled={assignSeatPending}
                          onClick={() => void assignPlayerToSeat(uid, assignSeatModal.seatNum)}
                        >
                          <span className="game-page__assign-dialog-player-name">{label}</span>
                          {seatHint && (
                            <span className="game-page__assign-dialog-player-meta">{seatHint}</span>
                          )}
                        </button>
                      </li>
                    )
                  })}
                </ul>
                {rosterForAssign.length === 0 && (
                  <p className="game-page__assign-dialog-empty">No players in this game yet.</p>
                )}
                <div className="game-page__assign-dialog-actions">
                  <button
                    type="button"
                    className="game-page__confirm-cancel"
                    onClick={() => setAssignSeatModal(null)}
                    disabled={assignSeatPending}
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </dialog>

          <dialog
            ref={unseatDialogRef}
            className="game-page__assign-dialog"
            onClose={() => {
              setUnseatModal(null)
              setUnseatError(null)
            }}
            aria-labelledby="unseat-seat-title"
          >
            {unseatModal && (
              <>
                <h2 id="unseat-seat-title" className="game-page__assign-dialog-title">
                  Remove from seat {unseatModal.seatNum}?
                </h2>
                <p className="game-page__assign-dialog-hint">
                  <strong>{unseatModal.label}</strong> will leave this seat but stay in the game.
                </p>
                {unseatError && (
                  <p className="game-page__assign-dialog-error" role="alert">
                    {unseatError}
                  </p>
                )}
                <div className="game-page__assign-dialog-actions game-page__assign-dialog-actions--split">
                  <button
                    type="button"
                    className="game-page__confirm-cancel"
                    onClick={() => setUnseatModal(null)}
                    disabled={unseatPending}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="game-page__confirm-danger"
                    disabled={unseatPending}
                    onClick={() => void clearPlayerSeat(unseatModal.userId)}
                  >
                    {unseatPending ? 'Removing…' : 'Remove from seat'}
                  </button>
                </div>
              </>
            )}
          </dialog>

          <dialog
            ref={scriptPickerDialogRef}
            className="game-page__assign-dialog"
            onClose={() => {
              setScriptPickerOpen(false)
              setScriptPatchError(null)
              setScriptSearchError(null)
            }}
            aria-labelledby="script-picker-title"
          >
            {scriptPickerOpen && (
              <>
                <h2 id="script-picker-title" className="game-page__assign-dialog-title">
                  Choose script
                </h2>
                <p className="game-page__assign-dialog-hint">
                  Search by name, then select a script for this game.
                </p>
                <label className="game-page__field game-page__script-picker-field">
                  <span className="game-page__field-label">Search</span>
                  <input
                    type="search"
                    className="game-page__script-picker-search"
                    value={scriptSearchInput}
                    onChange={(e) => setScriptSearchInput(e.target.value)}
                    autoComplete="off"
                    maxLength={200}
                    placeholder="Script name…"
                  />
                </label>
                {scriptPatchError && (
                  <p className="game-page__assign-dialog-error" role="alert">
                    {scriptPatchError}
                  </p>
                )}
                {scriptSearchError && (
                  <p className="game-page__assign-dialog-error" role="alert">
                    {scriptSearchError}
                  </p>
                )}
                {scriptSearchLoading && (
                  <p className="game-page__assign-dialog-hint">Loading scripts…</p>
                )}
                <ul className="game-page__assign-dialog-list">
                  {scriptSearchResults.map((s) => {
                    const sid = s.id
                    const name = s.name ?? 'Script'
                    return (
                      <li key={sid}>
                        <button
                          type="button"
                          className="game-page__assign-dialog-player"
                          disabled={scriptPatchPending}
                          onClick={() => void applyGameScript(sid)}
                        >
                          <span className="game-page__assign-dialog-player-name">{name}</span>
                          {s.author && (
                            <span className="game-page__assign-dialog-player-meta">by {s.author}</span>
                          )}
                        </button>
                      </li>
                    )
                  })}
                </ul>
                {!scriptSearchLoading && scriptSearchResults.length === 0 && !scriptSearchError && (
                  <p className="game-page__assign-dialog-empty">
                    {scriptSearchInput.trim() ? 'No scripts match that search.' : 'No scripts returned.'}
                  </p>
                )}
                <div className="game-page__assign-dialog-actions">
                  <button
                    type="button"
                    className="game-page__confirm-cancel"
                    onClick={() => setScriptPickerOpen(false)}
                    disabled={scriptPatchPending}
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </dialog>
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
