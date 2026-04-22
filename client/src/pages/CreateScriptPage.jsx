import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import '../App.css'
import './CreateScriptPage.css'
import { useAuth } from '../auth/useAuth.js'
import { getCharacterIconSrc } from '../utils/characterIcon.js'

function typeLabel(type) {
  return type.charAt(0).toUpperCase() + type.slice(1)
}

/** Minimum counts for a Trouble Brewing–style script (no travellers). */
const SCRIPT_REQUIREMENTS = {
  townsfolk: 13,
  outsider: 4,
  minion: 4,
  demon: 1,
}

function countByScriptRole(characters) {
  const counts = { townsfolk: 0, outsider: 0, minion: 0, demon: 0 }
  for (const c of characters) {
    if (counts[c.type] !== undefined) counts[c.type] += 1
  }
  return counts
}

export default function CreateScriptPage() {
  const navigate = useNavigate()
  const { scriptId: editScriptId } = useParams()
  const isEditMode = Boolean(editScriptId)
  const { authorizedFetch } = useAuth()
  const [pool, setPool] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [scriptChars, setScriptChars] = useState([])
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [saveError, setSaveError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [pickerQuery, setPickerQuery] = useState('')
  const [editScriptLoading, setEditScriptLoading] = useState(isEditMode)
  const [editLoadError, setEditLoadError] = useState(null)

  const inScriptIds = useMemo(() => new Set(scriptChars.map((c) => c.id)), [scriptChars])

  const filteredPool = useMemo(() => {
    const q = pickerQuery.trim().toLowerCase()
    if (!q) return pool
    return pool.filter((c) => c.name.toLowerCase().includes(q))
  }, [pool, pickerQuery])

  const roleCounts = useMemo(() => countByScriptRole(scriptChars), [scriptChars])

  const canSave = useMemo(() => {
    if (!title.trim()) return false
    return (
      roleCounts.townsfolk >= SCRIPT_REQUIREMENTS.townsfolk &&
      roleCounts.outsider >= SCRIPT_REQUIREMENTS.outsider &&
      roleCounts.minion >= SCRIPT_REQUIREMENTS.minion &&
      roleCounts.demon >= SCRIPT_REQUIREMENTS.demon
    )
  }, [title, roleCounts])

  useEffect(() => {
    let cancelled = false

    fetch('/api/characters/')
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.message || `Request failed (${res.status})`)
        }
        return res.json()
      })
      .then((data) => {
        if (cancelled) return
        if (!Array.isArray(data)) {
          setLoadError('Unexpected response from server.')
          setPool([])
          return
        }
        setPool(data.filter((c) => c.type !== 'traveller'))
      })
      .catch((err) => {
        if (!cancelled) {
          setLoadError(err.message || 'Could not load characters.')
          setPool([])
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!editScriptId) {
      setEditScriptLoading(false)
      setEditLoadError(null)
      return
    }

    let cancelled = false
    setEditScriptLoading(true)
    setEditLoadError(null)

    fetch(`/api/scripts/${encodeURIComponent(editScriptId)}`)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.error || `Request failed (${res.status})`)
        }
        return res.json()
      })
      .then((data) => {
        if (cancelled) return
        if (!data || typeof data !== 'object') {
          setEditLoadError('Script not found.')
          setTitle('')
          setDescription('')
          setScriptChars([])
          return
        }
        setTitle(data.name ?? '')
        setDescription(data.description ?? '')
        const chars = Array.isArray(data.characters)
          ? data.characters.filter((c) => c.type !== 'traveller')
          : []
        setScriptChars(chars)
      })
      .catch((err) => {
        if (!cancelled) {
          setEditLoadError(err.message || 'Could not load script.')
          setTitle('')
          setDescription('')
          setScriptChars([])
        }
      })
      .finally(() => {
        if (!cancelled) setEditScriptLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [editScriptId])

  const toggleChar = useCallback((c) => {
    setScriptChars((prev) => {
      const i = prev.findIndex((x) => x.id === c.id)
      if (i >= 0) return prev.filter((x) => x.id !== c.id)
      return [...prev, c]
    })
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setSaveError(null)
    const t = title.trim()
    if (!t || !canSave) return
    setSaving(true)
    const payload = {
      script_title: t,
      description: description.trim(),
      character_names: scriptChars.map((c) => c.name),
    }
    try {
      const url = isEditMode
        ? `/api/scripts/${encodeURIComponent(editScriptId)}`
        : '/api/scripts/'
      const method = isEditMode ? 'PUT' : 'POST'
      const res = await authorizedFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.status === 401) {
        setSaveError('sign_in_required')
        return
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        const fallback = isEditMode
          ? `Could not update script (${res.status})`
          : `Could not create script (${res.status})`
        setSaveError(body.message || body.error || fallback)
        return
      }
      const data = await res.json()
      const id = data?.script_id ?? (isEditMode ? editScriptId : null)
      if (id != null) {
        navigate(`/scripts/${id}`)
      } else {
        setSaveError('Unexpected response from server.')
      }
    } catch {
      setSaveError(isEditMode ? 'Could not update script.' : 'Could not create script.')
    } finally {
      setSaving(false)
    }
  }

  const backTo = isEditMode ? `/scripts/${encodeURIComponent(editScriptId)}` : '/scripts'
  const pageTitle = isEditMode ? 'Edit script' : 'Create script'

  return (
    <div className="page create-script-page">
      <header className="create-script-page__top">
        <Link to={backTo} className="create-script-page__back">
          {isEditMode ? '← Back to script' : '← Scripts'}
        </Link>
        <h1 className="page__title">{pageTitle}</h1>
        <p className="create-script-page__lede">
          Pick characters from the sidebar. Click again in the list to remove one from your script.
          Travellers are not included. A full script needs at least 13 townsfolk, 4 outsiders, 4 minions,
          and 1 demon before you can save.
        </p>
      </header>

      <div className="create-script-page__shell">
        <aside className="create-script-page__sidebar" aria-label="Character picker">
          <h2 className="create-script-page__sidebar-title">Characters</h2>
          {loading && <p className="create-script-page__sidebar-status">Loading…</p>}
          {!loading && loadError && (
            <p className="create-script-page__sidebar-status create-script-page__sidebar-status--error">
              {loadError}
            </p>
          )}
          {!loading && !loadError && (
            <div className="create-script-page__sidebar-body">
              <div className="create-script-page__sidebar-search">
                <label className="create-script-page__sidebar-search-label" htmlFor="create-script-char-search">
                  Filter by name
                </label>
                <input
                  id="create-script-char-search"
                  className="create-script-page__sidebar-search-input"
                  type="search"
                  value={pickerQuery}
                  onChange={(e) => setPickerQuery(e.target.value)}
                  placeholder="Search…"
                  autoComplete="off"
                  spellCheck="false"
                />
              </div>
              {filteredPool.length === 0 ? (
                <p className="create-script-page__picker-empty">
                  {pool.length === 0 ? 'No characters to show.' : 'No characters match your search.'}
                </p>
              ) : (
                <ul className="create-script-page__picker">
                  {filteredPool.map((c) => {
                    const selected = inScriptIds.has(c.id)
                    const iconSrc = getCharacterIconSrc(c)
                    return (
                      <li key={c.id}>
                        <button
                          type="button"
                          className={`create-script-page__picker-item${selected ? ' create-script-page__picker-item--in-script' : ''}`}
                          onClick={() => toggleChar(c)}
                          aria-pressed={selected}
                        >
                          <span className="create-script-page__picker-icon-wrap">
                            {iconSrc ? (
                              <img
                                className="create-script-page__picker-icon"
                                src={iconSrc}
                                alt=""
                                width={40}
                                height={40}
                                loading="lazy"
                                decoding="async"
                              />
                            ) : (
                              <span
                                className="create-script-page__picker-icon create-script-page__picker-icon--placeholder"
                                aria-hidden
                              />
                            )}
                          </span>
                          <span className="create-script-page__picker-name">{c.name}</span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          )}
        </aside>

        <main className="create-script-page__main">
          {isEditMode && editScriptLoading && (
            <p className="create-script-page__sidebar-status">Loading script…</p>
          )}
          {isEditMode && !editScriptLoading && editLoadError && (
            <p className="create-script-page__sidebar-status create-script-page__sidebar-status--error" role="alert">
              {editLoadError}
            </p>
          )}
          <form
            className="create-script-page__form"
            onSubmit={handleSubmit}
            noValidate
            hidden={isEditMode && (editScriptLoading || editLoadError)}
          >
            <label className="create-script-page__field">
              <span className="create-script-page__label">Script name</span>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                autoComplete="off"
                maxLength={200}
                placeholder="e.g. Teensyville"
              />
            </label>
            <label className="create-script-page__field">
              <span className="create-script-page__label">Description (optional)</span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                maxLength={2000}
                placeholder="Short summary for your group…"
              />
            </label>

            <div className="create-script-page__preview-wrap">
              <h2 className="create-script-page__preview-title">Your script</h2>
              {scriptChars.length === 0 ? (
                <p className="create-script-page__preview-empty">
                  No characters yet. Choose from the sidebar.
                </p>
              ) : (
                <ol className="create-script-page__script-list">
                  {scriptChars.map((c) => {
                    const iconSrc = getCharacterIconSrc(c)
                    return (
                      <li key={c.id} className="create-script-page__script-row">
                        <span className="create-script-page__script-icon-wrap">
                          {iconSrc ? (
                            <img
                              className="create-script-page__script-icon"
                              src={iconSrc}
                              alt=""
                              width={48}
                              height={48}
                              loading="lazy"
                              decoding="async"
                            />
                          ) : (
                            <span
                              className="create-script-page__script-icon create-script-page__script-icon--placeholder"
                              aria-hidden
                            />
                          )}
                        </span>
                        <div className="create-script-page__script-meta">
                          <span className="create-script-page__script-name">{c.name}</span>
                          <span className={`create-script-page__type-tag create-script-page__type-tag--${c.type}`}>
                            {typeLabel(c.type)}
                          </span>
                        </div>
                      </li>
                    )
                  })}
                </ol>
              )}
            </div>

            <ul className="create-script-page__req" aria-label="Save requirements">
              <li className={title.trim() ? 'create-script-page__req--ok' : ''}>
                Script name
                {!title.trim() ? ' — required' : ' — done'}
              </li>
              <li
                className={
                  roleCounts.townsfolk >= SCRIPT_REQUIREMENTS.townsfolk
                    ? 'create-script-page__req--ok'
                    : ''
                }
              >
                Townsfolk: {roleCounts.townsfolk} / {SCRIPT_REQUIREMENTS.townsfolk}
              </li>
              <li
                className={
                  roleCounts.outsider >= SCRIPT_REQUIREMENTS.outsider
                    ? 'create-script-page__req--ok'
                    : ''
                }
              >
                Outsiders: {roleCounts.outsider} / {SCRIPT_REQUIREMENTS.outsider}
              </li>
              <li
                className={
                  roleCounts.minion >= SCRIPT_REQUIREMENTS.minion
                    ? 'create-script-page__req--ok'
                    : ''
                }
              >
                Minions: {roleCounts.minion} / {SCRIPT_REQUIREMENTS.minion}
              </li>
              <li
                className={
                  roleCounts.demon >= SCRIPT_REQUIREMENTS.demon
                    ? 'create-script-page__req--ok'
                    : ''
                }
              >
                Demons: {roleCounts.demon} / {SCRIPT_REQUIREMENTS.demon}
              </li>
            </ul>

            {saveError === 'sign_in_required' && (
              <p className="create-script-page__form-error" role="alert">
                Sign in to save a script.{' '}
                <Link to="/auth" className="create-script-page__inline-link">
                  Go to Account
                </Link>
              </p>
            )}
            {saveError && saveError !== 'sign_in_required' && (
              <p className="create-script-page__form-error" role="alert">
                {saveError}
              </p>
            )}

            <div className="create-script-page__actions">
              <button
                type="submit"
                className="create-script-page__submit"
                disabled={saving || !canSave || (isEditMode && (editScriptLoading || Boolean(editLoadError)))}
              >
                {saving ? 'Saving…' : isEditMode ? 'Save changes' : 'Save script'}
              </button>
            </div>
          </form>
        </main>
      </div>
    </div>
  )
}
