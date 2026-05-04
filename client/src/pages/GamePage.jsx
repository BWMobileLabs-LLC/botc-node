import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { io } from 'socket.io-client'
import '../App.css'
import './GamePage.css'
import { useAuth } from '../auth/useAuth.js'
import { useGameScriptPanel } from '../context/GameScriptPanelContext.jsx'
import { clearGameSession, loadGameSession, saveGameSession } from '../game/gameSession.js'
import { getCharacterIconSrc } from '../utils/characterIcon.js'
import { getReminderTokenIconSrc } from '../utils/reminderTokenIcon.js'
import deathshroudImg from '../assets/grim_tokens/deathshroud.png'

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

/** Trouble Brewing default good/evil counts by seated player count (client reference only). */
function defaultCompositionForPlayerCount(playerCount) {
  const n = Math.floor(Number(playerCount))
  if (!Number.isFinite(n) || n < 5) return null
  if (n >= 15) return { townsfolk: 9, outsider: 2, minion: 3, demon: 1 }
  const byN = new Map([
    [5, { townsfolk: 3, outsider: 0, minion: 1, demon: 1 }],
    [6, { townsfolk: 3, outsider: 1, minion: 1, demon: 1 }],
    [7, { townsfolk: 5, outsider: 0, minion: 1, demon: 1 }],
    [8, { townsfolk: 5, outsider: 1, minion: 1, demon: 1 }],
    [9, { townsfolk: 5, outsider: 2, minion: 1, demon: 1 }],
    [10, { townsfolk: 7, outsider: 0, minion: 2, demon: 1 }],
    [11, { townsfolk: 7, outsider: 1, minion: 2, demon: 1 }],
    [12, { townsfolk: 7, outsider: 2, minion: 2, demon: 1 }],
    [13, { townsfolk: 9, outsider: 0, minion: 3, demon: 1 }],
    [14, { townsfolk: 9, outsider: 1, minion: 3, demon: 1 }],
  ])
  return byN.get(n) ?? null
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

const CHARACTER_TYPE_ORDER = ['townsfolk', 'outsider', 'minion', 'demon', 'traveller']

function formatCharacterType(type) {
  if (type == null || String(type).trim() === '') return 'Other'
  const s = String(type).trim()
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function alignmentForCharacterType(type) {
  const t = String(type ?? '').trim().toLowerCase()
  if (t === 'demon' || t === 'minion') return 'evil'
  if (t === 'townsfolk' || t === 'outsider') return 'good'
  return null
}

function shuffleArray(items) {
  const a = [...items]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const t = a[i]
    a[i] = a[j]
    a[j] = t
  }
  return a
}

/** True when every seated account has no character yet (storyteller bulk assign flow). */
function rosterHasNoAssignedCharacters(players) {
  if (!Array.isArray(players)) return true
  for (const p of players) {
    if (!p?.user_id || String(p.user_id).trim() === '') continue
    if (p.character_id != null && String(p.character_id).trim() !== '') return false
    if (String(p.character_name ?? '').trim() !== '') return false
  }
  return true
}

function playerRowHasCharacter(p) {
  if (!p) return false
  if (p.character_id != null && String(p.character_id).trim() !== '') return true
  return String(p.character_name ?? '').trim() !== ''
}

/** Seated accounts that can be PATCH-cleared (`character_id` null). */
function playersWithClearableCharacters(players) {
  if (!Array.isArray(players)) return []
  return players.filter(
    (p) =>
      p?.user_id != null &&
      String(p.user_id).trim() !== '' &&
      playerRowHasCharacter(p)
  )
}

function seatSlotsWithLoggedInPlayers(seatSlots) {
  if (!Array.isArray(seatSlots)) return []
  return seatSlots
    .filter(
      ({ player }) => player && player.user_id != null && String(player.user_id).trim() !== ''
    )
    .sort((a, b) => a.seatNum - b.seatNum)
}

/** Picks `assignableCount` distinct script character ids; tries Trouble Brewing–style counts first. */
function buildRandomRoleSelection(scriptCharacters, assignableCount) {
  const flat = (Array.isArray(scriptCharacters) ? scriptCharacters : []).filter((c) => c?.id != null)
  if (assignableCount <= 0 || flat.length === 0) return []

  const selectedIds = []
  const used = new Set()

  const takeRandom = (pool, n) => {
    if (n <= 0) return
    const shuffled = shuffleArray(pool)
    let taken = 0
    for (const c of shuffled) {
      if (taken >= n) break
      const id = String(c.id)
      if (used.has(id)) continue
      used.add(id)
      selectedIds.push(id)
      taken++
    }
  }

  const comp = defaultCompositionForPlayerCount(assignableCount)
  if (comp) {
    const coreOrder = ['townsfolk', 'outsider', 'minion', 'demon']
    for (const t of coreOrder) {
      const pool = flat.filter((c) => String(c.type ?? '').trim().toLowerCase() === t)
      takeRandom(pool, comp[t] ?? 0)
    }
  }

  const restPool = flat.filter((c) => !used.has(String(c.id)))
  takeRandom(restPool, assignableCount - selectedIds.length)

  return selectedIds.slice(0, assignableCount)
}

export default function GamePage() {
  const { isAuthenticated, authReady, accessToken, user, authorizedFetch } = useAuth()
  const { setScriptDetail: setPanelScriptDetail } = useGameScriptPanel()
  const [session, setSession] = useState(() => loadGameSession())
  const [socketClient, setSocketClient] = useState(null)
  const joinedGameIdRef = useRef('')

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
  /** Shown on the create/join lobby when another client ends the game (players only). */
  const [lobbyNotice, setLobbyNotice] = useState(null)
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
  const [characterPickerModal, setCharacterPickerModal] = useState(null)
  const [characterPickerPending, setCharacterPickerPending] = useState(false)
  const [characterPickerError, setCharacterPickerError] = useState(null)
  const characterPickerDialogRef = useRef(null)
  /** In-progress storyteller: seat click opens this menu first; “Change character” opens the picker. */
  const [seatPlayerMenuModal, setSeatPlayerMenuModal] = useState(null)
  const seatPlayerMenuDialogRef = useRef(null)
  const [seatMenuReminderDefs, setSeatMenuReminderDefs] = useState(null)
  const [seatMenuReminderDefsStatus, setSeatMenuReminderDefsStatus] = useState('idle')
  const [seatMenuReminderDefsError, setSeatMenuReminderDefsError] = useState(null)
  const [placeReminderTokenPendingId, setPlaceReminderTokenPendingId] = useState(null)
  const [toggleAlivePending, setToggleAlivePending] = useState(false)
  const [toggleAliveError, setToggleAliveError] = useState(null)
  const [toggleAlignmentPending, setToggleAlignmentPending] = useState(false)
  const [toggleAlignmentError, setToggleAlignmentError] = useState(null)
  const [saveSeatNotesPending, setSaveSeatNotesPending] = useState(false)
  const [saveSeatNotesError, setSaveSeatNotesError] = useState(null)
  /** Placed reminder row ids hidden immediately on delete (optimistic UI). */
  const [removedReminderIds, setRemovedReminderIds] = useState(() => new Set())
  const [seatRingVersion, setSeatRingVersion] = useState(0)
  const [assignRolesOpen, setAssignRolesOpen] = useState(false)
  const [assignRolesSelectedIds, setAssignRolesSelectedIds] = useState([])
  const [assignRolesPending, setAssignRolesPending] = useState(false)
  const [assignRolesError, setAssignRolesError] = useState(null)
  const assignRolesDialogRef = useRef(null)

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

  const refreshGameSnapshot = useCallback(
    async (gameId) => {
      if (!authReady || !isAuthenticated || !gameId) return
      try {
        const res = await authorizedFetch(`/api/games/${encodeURIComponent(gameId)}`)
        if (!res.ok) return
        const data = await res.json()
        if (!data?.game) return
        setGameSnapshot(data)
        setGameFetchStatus('ok')
        setGameFetchError(null)
        const stored = loadGameSession()
        if (stored && stored.gameId === gameId && typeof data.game.is_storyteller === 'boolean') {
          saveGameSession({
            gameId: stored.gameId,
            inviteCode: stored.inviteCode,
            isStoryteller: data.game.is_storyteller,
          })
          refreshSession()
        }
      } catch {
        // Keep current snapshot when a realtime refresh fails.
      }
    },
    [authReady, isAuthenticated, authorizedFetch, refreshSession]
  )

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
    const el = seatPlayerMenuDialogRef.current
    if (!el) return
    if (seatPlayerMenuModal) {
      if (!el.open) el.showModal()
    } else if (el.open) {
      el.close()
    }
  }, [seatPlayerMenuModal])

  useLayoutEffect(() => {
    const el = characterPickerDialogRef.current
    if (!el) return
    if (characterPickerModal) {
      if (!el.open) el.showModal()
      // `showModal()` focuses the first focusable control; that looked like the "assigned" role
      // highlight (same accent border). Move focus to the dialog after layout/paint.
      const raf = { outer: 0, inner: 0 }
      raf.outer = window.requestAnimationFrame(() => {
        raf.inner = window.requestAnimationFrame(() => {
          const d = characterPickerDialogRef.current
          if (d?.open) d.focus({ preventScroll: true })
        })
      })
      return () => {
        window.cancelAnimationFrame(raf.outer)
        window.cancelAnimationFrame(raf.inner)
      }
    } else if (el.open) {
      el.close()
    }
  }, [characterPickerModal])

  useLayoutEffect(() => {
    const el = assignRolesDialogRef.current
    if (!el) return
    if (assignRolesOpen) {
      if (!el.open) el.showModal()
      const raf = { outer: 0, inner: 0 }
      raf.outer = window.requestAnimationFrame(() => {
        raf.inner = window.requestAnimationFrame(() => {
          const d = assignRolesDialogRef.current
          if (d?.open) d.focus({ preventScroll: true })
        })
      })
      return () => {
        window.cancelAnimationFrame(raf.outer)
        window.cancelAnimationFrame(raf.inner)
      }
    } else if (el.open) {
      el.close()
    }
  }, [assignRolesOpen])

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
    if (!assignRolesOpen) return
    if (
      gameSnapshot?.game?.status !== 'in_progress' ||
      !rosterHasNoAssignedCharacters(gameSnapshot?.players)
    ) {
      setAssignRolesOpen(false)
      setAssignRolesSelectedIds([])
      setAssignRolesError(null)
      setSeatPlayerMenuModal(null)
    }
  }, [assignRolesOpen, gameSnapshot?.game?.status, gameSnapshot?.players])

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
    if (!authReady) return
    if (!isAuthenticated) {
      setSession(null)
      return
    }
    setSession(loadGameSession())
  }, [authReady, isAuthenticated])

  useEffect(() => {
    if (!authReady || !isAuthenticated || !accessToken) {
      setSocketClient((prev) => {
        if (prev) prev.disconnect()
        return null
      })
      joinedGameIdRef.current = ''
      return
    }

    const socket = io('/', {
      path: '/socket.io',
      auth: { token: `Bearer ${accessToken}` },
      withCredentials: true,
    })
    setSocketClient(socket)

    return () => {
      if (joinedGameIdRef.current) {
        socket.emit('game:leave', { game_id: joinedGameIdRef.current })
        joinedGameIdRef.current = ''
      }
      socket.disconnect()
      setSocketClient((prev) => (prev === socket ? null : prev))
    }
  }, [authReady, isAuthenticated, accessToken])

  useEffect(() => {
    if (!socketClient) return

    const targetGameId = session?.gameId ? String(session.gameId) : ''
    const emitJoin = () => {
      if (!targetGameId) return
      joinedGameIdRef.current = targetGameId
      socketClient.emit('game:join', { game_id: targetGameId })
    }

    if (socketClient.connected) emitJoin()
    socketClient.on('connect', emitJoin)

    return () => {
      socketClient.off('connect', emitJoin)
      if (targetGameId && joinedGameIdRef.current === targetGameId) {
        socketClient.emit('game:leave', { game_id: targetGameId })
        joinedGameIdRef.current = ''
      }
    }
  }, [socketClient, session?.gameId])

  useEffect(() => {
    if (!socketClient) return

    const onConnectError = (err) => {
      console.warn('Socket connect_error:', err?.message ?? err)
    }
    const onDisconnect = (reason) => {
      console.warn('Socket disconnected:', reason)
    }

    socketClient.on('connect_error', onConnectError)
    socketClient.on('disconnect', onDisconnect)
    return () => {
      socketClient.off('connect_error', onConnectError)
      socketClient.off('disconnect', onDisconnect)
    }
  }, [socketClient])

  useEffect(() => {
    if (!socketClient || !session?.gameId) return
    const targetGameId = String(session.gameId)
    const wasStoryteller = session.isStoryteller === true

    const handleGameEvent = (payload) => {
      const payloadGameId =
        payload?.game_id != null && String(payload.game_id).trim() !== ''
          ? String(payload.game_id).trim()
          : ''
      if (payloadGameId !== targetGameId) return
      void refreshGameSnapshot(targetGameId)
    }

    const handleStateUpdated = (payload) => {
      const payloadGameId =
        payload?.game_id != null && String(payload.game_id).trim() !== ''
          ? String(payload.game_id).trim()
          : ''
      if (payloadGameId !== targetGameId) return
      const myId = user?.id != null ? String(user.id) : ''
      const updatedBy =
        payload?.updated_by != null ? String(payload.updated_by) : ''
      if (myId !== '' && updatedBy !== '' && updatedBy === myId) {
        return
      }
      void refreshGameSnapshot(targetGameId)
    }

    const handleGameEnded = (payload) => {
      const payloadGameId =
        payload?.game_id != null && String(payload.game_id).trim() !== ''
          ? String(payload.game_id).trim()
          : ''
      if (payloadGameId !== targetGameId) return
      socketClient.emit('game:leave', { game_id: payloadGameId })
      joinedGameIdRef.current = ''
      clearGameSession()
      refreshSession()
      setGameSnapshot(null)
      setGameFetchStatus('idle')
      setGameFetchError(null)
      setConfirmAction(null)
      setAssignRolesOpen(false)
      setScriptPickerOpen(false)
      if (!wasStoryteller) {
        setLobbyNotice('The storyteller has ended this game.')
      }
    }

    socketClient.on('game:joined', handleGameEvent)
    socketClient.on('game:created', handleGameEvent)
    socketClient.on('game:player_joined', handleGameEvent)
    socketClient.on('game:state_updated', handleStateUpdated)
    socketClient.on('game:ended', handleGameEnded)

    return () => {
      socketClient.off('game:joined', handleGameEvent)
      socketClient.off('game:created', handleGameEvent)
      socketClient.off('game:player_joined', handleGameEvent)
      socketClient.off('game:state_updated', handleStateUpdated)
      socketClient.off('game:ended', handleGameEnded)
    }
  }, [socketClient, session?.gameId, session?.isStoryteller, user?.id, refreshGameSnapshot, refreshSession])

  useEffect(() => {
    if (!lobbyNotice) return
    const t = window.setTimeout(() => setLobbyNotice(null), 12000)
    return () => window.clearTimeout(t)
  }, [lobbyNotice])

  useEffect(() => {
    if (!authReady || !isAuthenticated) return
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
  }, [authReady, isAuthenticated, authorizedFetch, refreshSession])

  useEffect(() => {
    if (!authReady || !isAuthenticated || !session?.gameId) {
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
  }, [authReady, isAuthenticated, session?.gameId, authorizedFetch, refreshSession])

  useEffect(() => {
    setRemovedReminderIds(new Set())
  }, [session?.gameId])

  useEffect(() => {
    if (!gameSnapshot?.players) return
    setRemovedReminderIds((hidden) => {
      if (hidden.size === 0) return hidden
      const present = new Set()
      for (const p of gameSnapshot.players) {
        if (!Array.isArray(p.reminder)) continue
        for (const r of p.reminder) present.add(String(r.id))
      }
      const next = new Set(hidden)
      let changed = false
      for (const id of hidden) {
        if (!present.has(id)) {
          next.delete(id)
          changed = true
        }
      }
      return changed ? next : hidden
    })
  }, [gameSnapshot])

  const onCreate = async (e) => {
    e.preventDefault()
    setCreateError(null)
    setLobbyNotice(null)
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
    setLobbyNotice(null)
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

  const performRemoveAllCharacters = async () => {
    const s = loadGameSession()
    if (!s || !s.isStoryteller) {
      setConfirmAction(null)
      return
    }
    const gid = s.gameId
    const targets = playersWithClearableCharacters(gameSnapshot?.players)
    if (targets.length === 0) {
      setConfirmAction(null)
      return
    }
    setSessionActionError(null)
    setSessionActionPending(true)
    try {
      for (const p of targets) {
        const res = await authorizedFetch(
          `/api/games/${encodeURIComponent(gid)}/player/${encodeURIComponent(p.user_id)}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ character_id: null }),
          }
        )
        if (!res.ok) {
          setSessionActionError(await readErrorMessage(res))
          return
        }
      }
      const fresh = await authorizedFetch(`/api/games/${encodeURIComponent(gid)}`)
      if (fresh.ok) {
        const data = await fresh.json()
        if (data?.game) setGameSnapshot(data)
      }
      setConfirmAction(null)
    } catch {
      setSessionActionError('Could not remove all characters.')
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

  const fetchSeatMenuReminderDefinitions = useCallback(async () => {
    const gid = session?.gameId
    if (!gid) return
    setSeatMenuReminderDefsError(null)
    setSeatMenuReminderDefsStatus('loading')
    try {
      const res = await authorizedFetch(`/api/games/${encodeURIComponent(gid)}/reminders`)
      if (!res.ok) {
        setSeatMenuReminderDefs(null)
        setSeatMenuReminderDefsError(await readErrorMessage(res))
        setSeatMenuReminderDefsStatus('error')
        return
      }
      const data = await res.json()
      setSeatMenuReminderDefs(Array.isArray(data) ? data : [])
      setSeatMenuReminderDefsStatus('ok')
    } catch {
      setSeatMenuReminderDefs(null)
      setSeatMenuReminderDefsError('Could not load reminder tokens.')
      setSeatMenuReminderDefsStatus('error')
    }
  }, [session?.gameId, authorizedFetch])

  const closeSeatPlayerMenuModal = useCallback(() => {
    setSeatPlayerMenuModal(null)
    setSeatMenuReminderDefs(null)
    setSeatMenuReminderDefsStatus('idle')
    setSeatMenuReminderDefsError(null)
    setPlaceReminderTokenPendingId(null)
    setToggleAlivePending(false)
    setToggleAliveError(null)
    setToggleAlignmentPending(false)
    setToggleAlignmentError(null)
    setSaveSeatNotesPending(false)
    setSaveSeatNotesError(null)
  }, [])

  const togglePlayerAliveState = useCallback(
    async (userId, isAlive) => {
      const gid = session?.gameId
      if (!gid || userId == null) return
      setToggleAliveError(null)
      setToggleAlivePending(true)
      try {
        const res = await authorizedFetch(
          `/api/games/${encodeURIComponent(gid)}/player/${encodeURIComponent(userId)}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_alive: !isAlive }),
          }
        )
        if (!res.ok) {
          setToggleAliveError(await readErrorMessage(res))
          return
        }
        const fresh = await authorizedFetch(`/api/games/${encodeURIComponent(gid)}`)
        if (fresh.ok) {
          const data = await fresh.json()
          if (data?.game) setGameSnapshot(data)
        }
        closeSeatPlayerMenuModal()
      } catch {
        setToggleAliveError('Could not update player life status.')
      } finally {
        setToggleAlivePending(false)
      }
    },
    [session?.gameId, authorizedFetch, closeSeatPlayerMenuModal]
  )

  const togglePlayerAlignment = useCallback(
    async (userId, alignment) => {
      const gid = session?.gameId
      if (!gid || userId == null) return
      const current = String(alignment ?? '').trim().toLowerCase()
      const nextAlignment = current === 'evil' ? 'good' : 'evil'
      setToggleAlignmentError(null)
      setToggleAlignmentPending(true)
      try {
        const res = await authorizedFetch(
          `/api/games/${encodeURIComponent(gid)}/player/${encodeURIComponent(userId)}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ alignment: nextAlignment }),
          }
        )
        if (!res.ok) {
          setToggleAlignmentError(await readErrorMessage(res))
          return
        }
        const fresh = await authorizedFetch(`/api/games/${encodeURIComponent(gid)}`)
        if (fresh.ok) {
          const data = await fresh.json()
          if (data?.game) setGameSnapshot(data)
        }
        closeSeatPlayerMenuModal()
      } catch {
        setToggleAlignmentError('Could not update player alignment.')
      } finally {
        setToggleAlignmentPending(false)
      }
    },
    [session?.gameId, authorizedFetch, closeSeatPlayerMenuModal]
  )

  const closeSeatPlayerMenuActionsWithSave = useCallback(async () => {
    const gid = session?.gameId
    const modal = seatPlayerMenuModal
    if (!gid || !modal || modal.view === 'reminders') {
      closeSeatPlayerMenuModal()
      return
    }

    const nextNotes = String(modal.notesDraft ?? '')
    const initialNotes = String(modal.initialNotes ?? '')
    if (nextNotes === initialNotes) {
      closeSeatPlayerMenuModal()
      return
    }

    setSaveSeatNotesError(null)
    setSaveSeatNotesPending(true)
    try {
      const res = await authorizedFetch(
        `/api/games/${encodeURIComponent(gid)}/player/${encodeURIComponent(modal.userId)}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notes: nextNotes }),
        }
      )
      if (!res.ok) {
        setSaveSeatNotesError(await readErrorMessage(res))
        return
      }
      const fresh = await authorizedFetch(`/api/games/${encodeURIComponent(gid)}`)
      if (fresh.ok) {
        const data = await fresh.json()
        if (data?.game) setGameSnapshot(data)
      }
      closeSeatPlayerMenuModal()
    } catch {
      setSaveSeatNotesError('Could not save notes.')
    } finally {
      setSaveSeatNotesPending(false)
    }
  }, [session?.gameId, seatPlayerMenuModal, authorizedFetch, closeSeatPlayerMenuModal])

  const placeReminderTokenForSeatMenu = useCallback(
    async (reminderDefId, gamePlayerRowId) => {
      const gid = session?.gameId
      if (!gid || reminderDefId == null || gamePlayerRowId == null) return
      setPlaceReminderTokenPendingId(String(reminderDefId))
      setSeatMenuReminderDefsError(null)
      try {
        const res = await authorizedFetch(`/api/games/${encodeURIComponent(gid)}/reminders`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reminder_token_id: reminderDefId,
            player_id: gamePlayerRowId,
          }),
        })
        if (!res.ok) {
          setSeatMenuReminderDefsError(await readErrorMessage(res))
          return
        }
        const fresh = await authorizedFetch(`/api/games/${encodeURIComponent(gid)}`)
        if (fresh.ok) {
          const data = await fresh.json()
          if (data?.game) setGameSnapshot(data)
        }
        closeSeatPlayerMenuModal()
      } catch {
        setSeatMenuReminderDefsError('Could not place reminder token.')
      } finally {
        setPlaceReminderTokenPendingId(null)
      }
    },
    [session?.gameId, authorizedFetch, closeSeatPlayerMenuModal]
  )

  const deletePlacedReminderToken = useCallback(
    async (placedReminderRowId) => {
      const gid = session?.gameId
      if (!gid || placedReminderRowId == null) return
      const idStr = String(placedReminderRowId)

      setRemovedReminderIds((prev) => {
        const next = new Set(prev)
        next.add(idStr)
        return next
      })

      setGameSnapshot((prev) => {
        if (!prev?.players) return prev
        return {
          ...prev,
          players: prev.players.map((p) => {
            if (!Array.isArray(p.reminder)) return p
            const next = p.reminder.filter((r) => String(r.id) !== idStr)
            return next.length === p.reminder.length ? p : { ...p, reminder: next }
          }),
        }
      })

      const rollback = async () => {
        setRemovedReminderIds((prev) => {
          const next = new Set(prev)
          next.delete(idStr)
          return next
        })
        try {
          const fresh = await authorizedFetch(`/api/games/${encodeURIComponent(gid)}`)
          if (fresh.ok) {
            const data = await fresh.json()
            if (data?.game) setGameSnapshot(data)
          }
        } catch {
          /* ignore */
        }
      }

      try {
        const res = await authorizedFetch(`/api/games/${encodeURIComponent(gid)}/reminders`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reminder_token_id: placedReminderRowId }),
        })
        if (!res.ok) {
          void rollback()
          return
        }
        try {
          const fresh = await authorizedFetch(`/api/games/${encodeURIComponent(gid)}`)
          if (fresh.ok) {
            const data = await fresh.json()
            if (data?.game) setGameSnapshot(data)
          }
        } catch {
          /* ignore */
        }
        setSeatRingVersion((v) => v + 1)
      } catch {
        void rollback()
      }
    },
    [session?.gameId, authorizedFetch]
  )

  const assignCharacterToPlayer = useCallback(
    async (userId, characterId) => {
      const gid = session?.gameId
      if (!gid || userId == null) return
      const clearing = characterId == null
      const character =
        !clearing && Array.isArray(gameScriptDetail?.characters)
          ? gameScriptDetail.characters.find((c) => String(c?.id) === String(characterId))
          : null
      const alignment = clearing ? null : alignmentForCharacterType(character?.type)
      setCharacterPickerError(null)
      setCharacterPickerPending(true)
      try {
        const res = await authorizedFetch(
          `/api/games/${encodeURIComponent(gid)}/player/${encodeURIComponent(userId)}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              character_id: clearing ? null : characterId,
              alignment,
            }),
          }
        )
        if (!res.ok) {
          setCharacterPickerError(await readErrorMessage(res))
          return
        }
        const fresh = await authorizedFetch(`/api/games/${encodeURIComponent(gid)}`)
        if (fresh.ok) {
          const data = await fresh.json()
          if (data?.game) setGameSnapshot(data)
        }
        if (clearing) {
          setCharacterPickerModal((m) =>
            m && String(m.userId) === String(userId) ? { ...m, assignedCharacterId: null } : m
          )
        } else {
          setCharacterPickerModal(null)
        }
      } catch {
        setCharacterPickerError(clearing ? 'Could not clear character.' : 'Could not assign character.')
      } finally {
        setCharacterPickerPending(false)
      }
    },
    [session?.gameId, authorizedFetch, gameScriptDetail?.characters]
  )

  const bulkAssignRolesToPlayers = useCallback(
    async (pairs) => {
      const gid = session?.gameId
      if (!gid || !Array.isArray(pairs) || pairs.length === 0) return
      setAssignRolesError(null)
      setAssignRolesPending(true)
      try {
        for (const { userId, characterId } of pairs) {
          const character = Array.isArray(gameScriptDetail?.characters)
            ? gameScriptDetail.characters.find((c) => String(c?.id) === String(characterId))
            : null
          const alignment = alignmentForCharacterType(character?.type)
          const res = await authorizedFetch(
            `/api/games/${encodeURIComponent(gid)}/player/${encodeURIComponent(userId)}`,
            {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ character_id: characterId, alignment }),
            }
          )
          if (!res.ok) {
            setAssignRolesError(await readErrorMessage(res))
            return
          }
        }
        const fresh = await authorizedFetch(`/api/games/${encodeURIComponent(gid)}`)
        if (fresh.ok) {
          const data = await fresh.json()
          if (data?.game) setGameSnapshot(data)
        }
        setAssignRolesOpen(false)
        setAssignRolesSelectedIds([])
      } catch {
        setAssignRolesError('Could not assign roles.')
      } finally {
        setAssignRolesPending(false)
      }
    },
    [session?.gameId, authorizedFetch, gameScriptDetail?.characters]
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

  if (!authReady) {
    return (
      <div className="page game-page">
        <h1 className="page__title">Game</h1>
        <p className="game-page__lead">Restoring session…</p>
      </div>
    )
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
    const gameIsInProgress = gameSnapshot?.game?.status === 'in_progress'
    const useCharacterPickerOnSeatClick = resolvedIsStoryteller && gameIsInProgress

    const rosterForAssign =
      resolvedIsStoryteller && Array.isArray(gameSnapshot?.players)
        ? [...gameSnapshot.players]
            .filter((p) => p != null && p.user_id != null && String(p.user_id).trim() !== '')
            .sort((a, b) => rosterPlayerLabel(a).localeCompare(rosterPlayerLabel(b), undefined, { sensitivity: 'base' }))
        : []
    const charactersByType = (() => {
      const chars = Array.isArray(gameScriptDetail?.characters) ? gameScriptDetail.characters : []
      const buckets = new Map()
      for (const c of chars) {
        if (!c) continue
        const key = String(c.type ?? '').trim().toLowerCase() || 'other'
        const list = buckets.get(key) ?? []
        list.push(c)
        buckets.set(key, list)
      }
      const ordered = []
      for (const t of CHARACTER_TYPE_ORDER) {
        const list = buckets.get(t)
        if (list?.length) ordered.push({ type: t, characters: list })
        buckets.delete(t)
      }
      for (const [type, characters] of buckets.entries()) {
        if (characters?.length) ordered.push({ type, characters })
      }
      return ordered
    })()
    const scriptCharacterByName = (() => {
      const chars = Array.isArray(gameScriptDetail?.characters) ? gameScriptDetail.characters : []
      const map = new Map()
      for (const c of chars) {
        const key = String(c?.name ?? '').trim().toLowerCase()
        if (key) map.set(key, c)
      }
      return map
    })()
    const canStartGame =
      resolvedIsStoryteller && gameFetchStatus === 'ok' && gameSnapshot?.game?.status === 'lobby'

    const defaultComposition =
      gameFetchStatus === 'ok' ? defaultCompositionForPlayerCount(seatCount) : null

    const seatsForRoleAssignment = seatSlotsWithLoggedInPlayers(seatSlots)
    const assignableCount = seatsForRoleAssignment.length
    const scriptCharacterCount = Array.isArray(gameScriptDetail?.characters)
      ? gameScriptDetail.characters.length
      : 0
    const scriptHasEnoughCharacters = scriptCharacterCount >= assignableCount
    const showAssignRolesCta =
      resolvedIsStoryteller &&
      gameFetchStatus === 'ok' &&
      gameIsInProgress &&
      assignableCount > 0 &&
      rosterHasNoAssignedCharacters(gameSnapshot?.players) &&
      gameScriptDetailStatus === 'ok' &&
      scriptCharacterCount > 0

    const showRemoveAllCharactersCta =
      resolvedIsStoryteller &&
      gameFetchStatus === 'ok' &&
      gameIsInProgress &&
      playersWithClearableCharacters(gameSnapshot?.players).length > 0

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
                  <div className="game-page__meta-row">
                    <dt>Default characters</dt>
                    <dd>
                      {defaultComposition ? (
                        <div className="game-page__default-composition">
                          <div>{defaultComposition.townsfolk} townsfolk</div>
                          <div>
                            {defaultComposition.outsider}{' '}
                            {defaultComposition.outsider === 1 ? 'outsider' : 'outsiders'}
                          </div>
                          <div>
                            {defaultComposition.minion}{' '}
                            {defaultComposition.minion === 1 ? 'minion' : 'minions'}
                          </div>
                          <div>
                            {defaultComposition.demon} demon
                          </div>
                        </div>
                      ) : (
                        '—'
                      )}
                    </dd>
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
              {gameSnapshot?.game?.status === 'lobby' && (
                <button
                  type="button"
                  className="game-page__script-picker-open-btn"
                  onClick={() => void performStartGame()}
                  disabled={sessionActionPending || startGamePending || !canStartGame}
                >
                  {startGamePending ? 'Starting…' : 'Start game'}
                </button>
              )}
              {showAssignRolesCta && (
                <button
                  type="button"
                  className="game-page__script-picker-open-btn"
                  onClick={() => {
                    setAssignSeatModal(null)
                    setUnseatModal(null)
                    setCharacterPickerModal(null)
                    setSeatPlayerMenuModal(null)
                    setAssignRolesError(null)
                    setAssignRolesSelectedIds([])
                    setAssignRolesOpen(true)
                  }}
                  disabled={sessionActionPending || startGamePending || assignRolesPending}
                >
                  Assign roles
                </button>
              )}
              {showRemoveAllCharactersCta && (
                <button
                  type="button"
                  className="game-page__script-picker-open-btn"
                  onClick={() => {
                    setSessionActionError(null)
                    setConfirmAction('removeAllCharacters')
                  }}
                  disabled={sessionActionPending || startGamePending || assignRolesPending}
                >
                  Remove all characters
                </button>
              )}
              <button
                type="button"
                className="game-page__script-picker-open-btn"
                onClick={() => {
                  setAssignSeatModal(null)
                  setUnseatModal(null)
                  setSeatPlayerMenuModal(null)
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
                key={`seat-ring-${seatRingVersion}`}
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
                  const assignedCharacterName = String(player?.character_name ?? '').trim()
                  const assignedCharacter =
                    resolvedIsStoryteller && assignedCharacterName
                      ? scriptCharacterByName.get(assignedCharacterName.toLowerCase()) ?? null
                      : null
                  const assignedCharacterIcon = assignedCharacter ? getCharacterIconSrc(assignedCharacter) : null
                  const playerIsDead = player?.is_alive === false
                  const alignmentValue = String(player?.alignment ?? '').trim().toLowerCase()
                  const alignmentMaskClass =
                    alignmentValue === 'evil'
                      ? ' game-page__seat-icon-mask--evil'
                      : alignmentValue === 'good'
                        ? ' game-page__seat-icon-mask--good'
                        : ''

                  const seatReminders =
                    resolvedIsStoryteller && player && Array.isArray(player.reminder)
                      ? player.reminder.filter((r) => !removedReminderIds.has(String(r.id)))
                      : []

                  const inner = player ? (
                    <>
                      <div
                        className={`game-page__seat-icon${alignmentMaskClass}`}
                        aria-hidden="true"
                      >
                        {resolvedIsStoryteller && assignedCharacterIcon && (
                          <img
                            className="game-page__seat-character-icon"
                            src={assignedCharacterIcon}
                            alt=""
                            width={56}
                            height={56}
                            loading="lazy"
                            decoding="async"
                          />
                        )}
                        {playerIsDead && (
                          <img
                            className="game-page__seat-deathshroud"
                            src={deathshroudImg}
                            alt=""
                            width={128}
                            height={128}
                            loading="lazy"
                            decoding="async"
                          />
                        )}
                      </div>
                      <span className="game-page__seat-label">
                        {playerDisplayLabel(player, seatNum)}
                      </span>
                      {seatReminders.length > 0 && (
                        <div className="game-page__seat-reminders">
                          {seatReminders.map((r, ri) => {
                            const iconChar = String(
                              r.icon_character_name ?? player.character_name ?? ''
                            ).trim()
                            const iconText = String(r.icon_text ?? r.text ?? '').trim()
                            const tokenImg =
                              iconChar || iconText
                                ? getReminderTokenIconSrc(
                                    iconChar || String(player.character_name ?? '').trim(),
                                    iconText
                                  )
                                : null
                            const removeLabel =
                              iconText ||
                              String(r.text ?? '')
                                .trim()
                                .slice(0, 48) ||
                              'reminder token'
                            const rid = String(r.id)
                            return (
                              <div
                                key={rid}
                                role="button"
                                tabIndex={0}
                                className="game-page__seat-reminder-chip"
                                style={{ '--rm-i': ri }}
                                aria-label={`Remove ${removeLabel}`}
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  void deletePlacedReminderToken(r.id)
                                }}
                                onKeyDown={(e) => {
                                  if (e.key !== 'Enter' && e.key !== ' ') return
                                  e.preventDefault()
                                  e.stopPropagation()
                                  void deletePlacedReminderToken(r.id)
                                }}
                              >
                                {tokenImg ? (
                                  <img
                                    className="game-page__seat-reminder-img"
                                    src={tokenImg}
                                    alt=""
                                    width={76}
                                    height={76}
                                    loading="lazy"
                                    decoding="async"
                                    draggable={false}
                                  />
                                ) : (
                                  <span className="game-page__seat-reminder-fallback" aria-hidden="true">
                                    ·
                                  </span>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}
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
                          useCharacterPickerOnSeatClick
                            ? player && !filledWithoutUser
                              ? `${ariaTaken}. Open seat options.`
                              : ariaEmpty
                            : player
                              ? filledWithoutUser
                                ? ariaTaken
                                : `${ariaTaken}. Click to remove from this seat.`
                              : `${ariaEmpty}. Choose player to assign.`
                        }
                        onClick={() => {
                          setCharacterPickerError(null)
                          setAssignSeatError(null)
                          setUnseatError(null)

                          if (useCharacterPickerOnSeatClick) {
                            setAssignSeatModal(null)
                            setUnseatModal(null)
                            if (!player || filledWithoutUser) return
                            setSeatPlayerMenuModal({
                              seatNum,
                              userId: player.user_id,
                              gamePlayerId: player.id,
                              playerLabel: playerDisplayLabel(player, seatNum),
                              assignedCharacterId: player.character_id ?? null,
                              isAlive: player.is_alive !== false,
                              alignment: player.alignment ?? null,
                              notesDraft: String(player.notes ?? ''),
                              initialNotes: String(player.notes ?? ''),
                              view: 'actions',
                            })
                            return
                          }

                          if (!player) {
                            setUnseatModal(null)
                            setSeatPlayerMenuModal(null)
                            setAssignSeatModal({ seatNum })
                            return
                          }
                          if (filledWithoutUser) return
                          setAssignSeatModal(null)
                          setSeatPlayerMenuModal(null)
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
            {confirmAction === 'removeAllCharacters' && (
              <>
                <h2 id="game-confirm-title" className="game-page__confirm-title">
                  Remove all characters?
                </h2>
                <p className="game-page__confirm-body">
                  Every seated player will lose their assigned script role. You can use Assign roles again
                  afterward.
                </p>
              </>
            )}
            {(confirmAction === 'leave' ||
              confirmAction === 'endGame' ||
              confirmAction === 'removeAllCharacters') && (
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
                    confirmAction === 'endGame' || confirmAction === 'removeAllCharacters'
                      ? 'game-page__confirm-danger'
                      : 'game-page__confirm-primary'
                  }
                  disabled={sessionActionPending}
                  onClick={() => {
                    if (confirmAction === 'leave') void performLeaveGame()
                    else if (confirmAction === 'endGame') void performEndGame()
                    else void performRemoveAllCharacters()
                  }}
                >
                  {sessionActionPending
                    ? confirmAction === 'endGame'
                      ? 'Ending…'
                      : confirmAction === 'removeAllCharacters'
                        ? 'Removing…'
                        : 'Leaving…'
                    : confirmAction === 'endGame'
                      ? 'End game'
                      : confirmAction === 'removeAllCharacters'
                        ? 'Remove all'
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
            ref={seatPlayerMenuDialogRef}
            className={`game-page__assign-dialog${seatPlayerMenuModal?.view === 'reminders' ? ' game-page__assign-dialog--seat-reminders' : ''}`}
            onClose={closeSeatPlayerMenuModal}
            aria-labelledby={
              seatPlayerMenuModal?.view === 'reminders'
                ? 'seat-player-reminders-title'
                : 'seat-player-menu-title'
            }
          >
            {seatPlayerMenuModal && seatPlayerMenuModal.view === 'reminders' && (
              <>
                <button
                  type="button"
                  className="game-page__seat-menu-back"
                  onClick={() => {
                    setSeatPlayerMenuModal((m) => (m ? { ...m, view: 'actions' } : null))
                    setSeatMenuReminderDefsError(null)
                  }}
                >
                  ← Back
                </button>
                <h2 id="seat-player-reminders-title" className="game-page__assign-dialog-title">
                  Add reminder token
                </h2>
                <p className="game-page__assign-dialog-hint">
                  For <strong>{seatPlayerMenuModal.playerLabel}</strong> — choose a token from this script.
                </p>
                {seatMenuReminderDefsError && (
                  <p className="game-page__assign-dialog-error" role="alert">
                    {seatMenuReminderDefsError}
                  </p>
                )}
                {seatMenuReminderDefsStatus === 'loading' && (
                  <p className="game-page__assign-dialog-hint">Loading reminder tokens…</p>
                )}
                {seatMenuReminderDefsStatus === 'ok' &&
                  Array.isArray(seatMenuReminderDefs) &&
                  seatMenuReminderDefs.length === 0 && (
                    <p className="game-page__assign-dialog-empty">
                      No reminder tokens are defined for characters on this script.
                    </p>
                  )}
                {seatMenuReminderDefsStatus === 'ok' && (seatMenuReminderDefs?.length ?? 0) > 0 && (
                  <ul className="game-page__assign-dialog-list game-page__seat-menu-reminder-defs">
                    {seatMenuReminderDefs.map((def) => {
                      const rid = String(def.id)
                      const busy = placeReminderTokenPendingId === rid
                      const tokenImg = getReminderTokenIconSrc(def.name, def.text)
                      return (
                        <li key={rid}>
                          <button
                            type="button"
                            className="game-page__assign-dialog-player game-page__seat-menu-reminder-def-btn"
                            disabled={busy || seatMenuReminderDefsStatus !== 'ok'}
                            onClick={() =>
                              void placeReminderTokenForSeatMenu(def.id, seatPlayerMenuModal.gamePlayerId)
                            }
                          >
                            {tokenImg ? (
                              <img
                                className="game-page__seat-menu-reminder-img"
                                src={tokenImg}
                                alt=""
                                width={48}
                                height={48}
                                loading="lazy"
                                decoding="async"
                              />
                            ) : (
                              <div
                                className="game-page__seat-menu-reminder-img game-page__seat-menu-reminder-img--placeholder"
                                aria-hidden="true"
                              />
                            )}
                            <span className="game-page__seat-menu-reminder-def-text">
                              <span className="game-page__assign-dialog-player-name">{def.name}</span>
                              <span className="game-page__assign-dialog-player-meta">{def.text}</span>
                            </span>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                )}
                <div className="game-page__assign-dialog-actions">
                  <button type="button" className="game-page__confirm-cancel" onClick={closeSeatPlayerMenuModal}>
                    Close
                  </button>
                </div>
              </>
            )}
            {seatPlayerMenuModal && seatPlayerMenuModal.view !== 'reminders' && (
              <>
                <h2 id="seat-player-menu-title" className="game-page__assign-dialog-title">
                  Seat {seatPlayerMenuModal.seatNum}
                </h2>
                <p className="game-page__assign-dialog-hint">
                  <strong>{seatPlayerMenuModal.playerLabel}</strong>
                </p>
                {toggleAliveError && (
                  <p className="game-page__assign-dialog-error" role="alert">
                    {toggleAliveError}
                  </p>
                )}
                {toggleAlignmentError && (
                  <p className="game-page__assign-dialog-error" role="alert">
                    {toggleAlignmentError}
                  </p>
                )}
                {saveSeatNotesError && (
                  <p className="game-page__assign-dialog-error" role="alert">
                    {saveSeatNotesError}
                  </p>
                )}
                <ul className="game-page__assign-dialog-list game-page__seat-player-menu-list">
                  <li>
                    <button
                      type="button"
                      className="game-page__assign-dialog-player"
                      onClick={() => {
                        const m = seatPlayerMenuModal
                        if (!m) return
                        setSeatPlayerMenuModal(null)
                        setSeatMenuReminderDefs(null)
                        setSeatMenuReminderDefsStatus('idle')
                        setSeatMenuReminderDefsError(null)
                        setPlaceReminderTokenPendingId(null)
                        setCharacterPickerError(null)
                        setCharacterPickerModal({
                          seatNum: m.seatNum,
                          userId: m.userId,
                          playerLabel: m.playerLabel,
                          assignedCharacterId: m.assignedCharacterId,
                        })
                      }}
                    >
                      <span className="game-page__assign-dialog-player-name">Change character</span>
                      <span className="game-page__assign-dialog-player-meta">
                        Pick or clear a script role for this player
                      </span>
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      className="game-page__assign-dialog-player"
                      disabled={toggleAlivePending}
                      onClick={() =>
                        void togglePlayerAliveState(
                          seatPlayerMenuModal.userId,
                          seatPlayerMenuModal.isAlive !== false
                        )
                      }
                    >
                      <span className="game-page__assign-dialog-player-name">
                        {seatPlayerMenuModal.isAlive === false ? 'Revive player' : 'Kill player'}
                      </span>
                      <span className="game-page__assign-dialog-player-meta">
                        {seatPlayerMenuModal.isAlive === false
                          ? 'Mark this player as alive'
                          : 'Mark this player as dead'}
                      </span>
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      className="game-page__assign-dialog-player"
                      disabled={toggleAlignmentPending}
                      onClick={() =>
                        void togglePlayerAlignment(
                          seatPlayerMenuModal.userId,
                          seatPlayerMenuModal.alignment
                        )
                      }
                    >
                      <span className="game-page__assign-dialog-player-name">
                        Alignment:{' '}
                        {String(seatPlayerMenuModal.alignment ?? '').trim().toLowerCase() === 'evil'
                          ? 'Evil'
                          : String(seatPlayerMenuModal.alignment ?? '').trim().toLowerCase() === 'good'
                            ? 'Good'
                            : 'Unassigned'}
                      </span>
                      <span className="game-page__assign-dialog-player-meta">
                        Toggle between good and evil
                      </span>
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      className="game-page__assign-dialog-player"
                      disabled={!seatPlayerMenuModal.gamePlayerId}
                      title={
                        !seatPlayerMenuModal.gamePlayerId
                          ? 'Player record is missing; rejoin the game or refresh.'
                          : undefined
                      }
                      onClick={() => {
                        setSeatPlayerMenuModal((m) => (m ? { ...m, view: 'reminders' } : null))
                        setSeatMenuReminderDefsError(null)
                        void fetchSeatMenuReminderDefinitions()
                      }}
                    >
                      <span className="game-page__assign-dialog-player-name">Add reminder token</span>
                      <span className="game-page__assign-dialog-player-meta">
                        Place a script reminder on this player
                      </span>
                    </button>
                  </li>
                  <li>
                    <label className="game-page__field game-page__seat-notes-field">
                      <span className="game-page__field-label">Notes</span>
                      <textarea
                        className="game-page__seat-notes-input"
                        rows={4}
                        value={String(seatPlayerMenuModal.notesDraft ?? '')}
                        disabled={saveSeatNotesPending}
                        onChange={(e) =>
                          setSeatPlayerMenuModal((m) =>
                            m && m.view !== 'reminders' ? { ...m, notesDraft: e.target.value } : m
                          )
                        }
                        placeholder="Add storyteller notes for this player…"
                      />
                    </label>
                  </li>
                </ul>
                <div className="game-page__assign-dialog-actions">
                  <button
                    type="button"
                    className="game-page__confirm-cancel"
                    onClick={() => void closeSeatPlayerMenuActionsWithSave()}
                    disabled={saveSeatNotesPending}
                  >
                    Close
                  </button>
                </div>
              </>
            )}
          </dialog>

          <dialog
            ref={characterPickerDialogRef}
            tabIndex={-1}
            className="game-page__assign-dialog game-page__character-dialog"
            onClose={() => {
              setCharacterPickerModal(null)
              setCharacterPickerError(null)
              setSeatPlayerMenuModal(null)
            }}
            aria-labelledby="character-picker-title"
          >
            {characterPickerModal && (
              <>
                <h2 id="character-picker-title" className="game-page__assign-dialog-title">
                  Choose character for {characterPickerModal.playerLabel}
                </h2>
                <p className="game-page__assign-dialog-hint">
                  Seat {characterPickerModal.seatNum}. Select a script character to assign, or select the
                  highlighted character again to clear it.
                </p>
                {characterPickerError && (
                  <p className="game-page__assign-dialog-error" role="alert">
                    {characterPickerError}
                  </p>
                )}
                {gameScriptDetailStatus === 'loading' && (
                  <p className="game-page__assign-dialog-hint">Loading script characters…</p>
                )}
                {gameScriptDetailStatus === 'error' && gameScriptDetailError && (
                  <p className="game-page__assign-dialog-error" role="alert">
                    {gameScriptDetailError}
                  </p>
                )}
                {gameScriptDetailStatus === 'ok' && charactersByType.length > 0 && (
                  <div className="game-page__character-groups">
                    {charactersByType.map(({ type, characters }) => (
                      <section key={type} className="game-page__character-group">
                        <h3 className="game-page__character-group-title">{formatCharacterType(type)}</h3>
                        <ul className="game-page__character-grid">
                          {characters.map((c) => {
                            const iconSrc = getCharacterIconSrc(c)
                            const assignedId = characterPickerModal.assignedCharacterId
                            const isAssigned =
                              assignedId != null &&
                              String(assignedId).trim() !== '' &&
                              String(c.id) === String(assignedId)
                            return (
                              <li key={c.id}>
                                <button
                                  type="button"
                                  className={`game-page__character-item${isAssigned ? ' game-page__character-item--assigned' : ''}`}
                                  aria-pressed={isAssigned}
                                  disabled={characterPickerPending}
                                  onClick={() => {
                                    if (isAssigned) {
                                      void assignCharacterToPlayer(characterPickerModal.userId, null)
                                    } else {
                                      void assignCharacterToPlayer(characterPickerModal.userId, c.id)
                                    }
                                  }}
                                >
                                  {iconSrc ? (
                                    <img
                                      className="game-page__character-item-icon"
                                      src={iconSrc}
                                      alt=""
                                      width={44}
                                      height={44}
                                      loading="lazy"
                                      decoding="async"
                                    />
                                  ) : (
                                    <div
                                      className="game-page__character-item-icon game-page__character-item-icon--placeholder"
                                      aria-hidden="true"
                                    />
                                  )}
                                  <span className="game-page__character-item-name">{c.name}</span>
                                </button>
                              </li>
                            )
                          })}
                        </ul>
                      </section>
                    ))}
                  </div>
                )}
                {gameScriptDetailStatus === 'ok' && charactersByType.length === 0 && (
                  <p className="game-page__assign-dialog-empty">No characters found for this script.</p>
                )}
                <div className="game-page__assign-dialog-actions">
                  <button
                    type="button"
                    className="game-page__confirm-cancel"
                    onClick={() => setCharacterPickerModal(null)}
                    disabled={characterPickerPending}
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </dialog>

          <dialog
            ref={assignRolesDialogRef}
            tabIndex={-1}
            className="game-page__assign-dialog game-page__character-dialog game-page__assign-roles-dialog"
            onClose={() => {
              setAssignRolesOpen(false)
              setAssignRolesSelectedIds([])
              setAssignRolesError(null)
            }}
            aria-labelledby="assign-roles-title"
          >
            {assignRolesOpen && (
              <>
                <h2 id="assign-roles-title" className="game-page__assign-dialog-title">
                  Assign roles
                </h2>
                <p className="game-page__assign-dialog-hint">
                  Choose exactly {assignableCount} roles from this script (one per seated player). You can
                  tap roles to add or remove them. When you are ready, roles are shuffled and dealt to
                  seats at random.
                </p>
                {(() => {
                  const comp = defaultCompositionForPlayerCount(assignableCount)
                  if (!comp) {
                    return (
                      <p className="game-page__assign-dialog-hint game-page__assign-dialog-hint--sub">
                        Randomize picks {assignableCount} distinct roles from the script at random (official
                        defaults start at 5 players).
                      </p>
                    )
                  }
                  return (
                    <p className="game-page__assign-dialog-hint game-page__assign-dialog-hint--sub">
                      Randomize aims for Trouble Brewing defaults at this size: {comp.townsfolk} townsfolk,{' '}
                      {comp.outsider} outsider{comp.outsider === 1 ? '' : 's'}, {comp.minion} minion
                      {comp.minion === 1 ? '' : 's'}, {comp.demon} demon — then fills from whatever is left
                      on the script if needed.
                    </p>
                  )
                })()}
                {!scriptHasEnoughCharacters && (
                  <p className="game-page__assign-dialog-error" role="status">
                    This script only has {scriptCharacterCount} character
                    {scriptCharacterCount === 1 ? '' : 's'}, but {assignableCount} seated players need
                    assignments. Add characters to the script or change seats before you can assign everyone.
                  </p>
                )}
                {assignRolesError && (
                  <p className="game-page__assign-dialog-error" role="alert">
                    {assignRolesError}
                  </p>
                )}
                <div className="game-page__assign-dialog-random-row">
                  <button
                    type="button"
                    className="game-page__script-picker-open-btn game-page__assign-dialog-random-btn"
                    disabled={assignRolesPending || assignableCount === 0}
                    onClick={() => {
                      setAssignRolesError(null)
                      setAssignRolesSelectedIds(
                        buildRandomRoleSelection(gameScriptDetail?.characters ?? [], assignableCount)
                      )
                    }}
                  >
                    Randomize roles
                  </button>
                </div>
                {gameScriptDetailStatus === 'ok' && charactersByType.length > 0 && (
                  <div className="game-page__character-groups">
                    {charactersByType.map(({ type, characters }) => (
                      <section key={type} className="game-page__character-group">
                        <h3 className="game-page__character-group-title">{formatCharacterType(type)}</h3>
                        <ul className="game-page__character-grid">
                          {characters.map((c) => {
                            const iconSrc = getCharacterIconSrc(c)
                            const sid = String(c.id)
                            const isPicked = assignRolesSelectedIds.includes(sid)
                            const atCap =
                              !isPicked &&
                              assignRolesSelectedIds.length >= assignableCount &&
                              assignableCount > 0
                            return (
                              <li key={c.id}>
                                <button
                                  type="button"
                                  className={`game-page__character-item${isPicked ? ' game-page__character-item--picked' : ''}`}
                                  aria-pressed={isPicked}
                                  disabled={assignRolesPending || atCap}
                                  title={atCap ? 'Remove a role or clear the selection to pick another.' : undefined}
                                  onClick={() => {
                                    setAssignRolesError(null)
                                    setAssignRolesSelectedIds((prev) => {
                                      if (prev.includes(sid)) return prev.filter((x) => x !== sid)
                                      if (prev.length >= assignableCount) return prev
                                      return [...prev, sid]
                                    })
                                  }}
                                >
                                  {iconSrc ? (
                                    <img
                                      className="game-page__character-item-icon"
                                      src={iconSrc}
                                      alt=""
                                      width={44}
                                      height={44}
                                      loading="lazy"
                                      decoding="async"
                                    />
                                  ) : (
                                    <div
                                      className="game-page__character-item-icon game-page__character-item-icon--placeholder"
                                      aria-hidden="true"
                                    />
                                  )}
                                  <span className="game-page__character-item-name">{c.name}</span>
                                </button>
                              </li>
                            )
                          })}
                        </ul>
                      </section>
                    ))}
                  </div>
                )}
                <p className="game-page__assign-dialog-selection-count" aria-live="polite">
                  {assignRolesSelectedIds.length} of {assignableCount} selected
                </p>
                <div className="game-page__assign-dialog-actions game-page__assign-dialog-actions--split">
                  <button
                    type="button"
                    className="game-page__confirm-cancel"
                    onClick={() => {
                      setAssignRolesOpen(false)
                      setAssignRolesSelectedIds([])
                      setAssignRolesError(null)
                    }}
                    disabled={assignRolesPending}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="game-page__confirm-primary"
                    disabled={
                      assignRolesPending ||
                      assignRolesSelectedIds.length !== assignableCount ||
                      assignableCount === 0
                    }
                    onClick={() => {
                      const shuffled = shuffleArray([...assignRolesSelectedIds])
                      const pairs = seatsForRoleAssignment.map((slot, i) => ({
                        userId: slot.player.user_id,
                        characterId: shuffled[i],
                      }))
                      void bulkAssignRolesToPlayers(pairs)
                    }}
                  >
                    {assignRolesPending ? 'Assigning…' : 'Assign roles'}
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
      {lobbyNotice && (
        <p className="game-page__meta-status" role="status">
          {lobbyNotice}
        </p>
      )}
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
