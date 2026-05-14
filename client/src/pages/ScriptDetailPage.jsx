import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import '../App.css'
import './ScriptDetailPage.css'
import { useAuth } from '../auth/useAuth.js'
import { getCharacterIconSrc } from '../utils/characterIcon.js'

const CHARACTER_TYPE_ORDER = [
  'townsfolk',
  'outsider',
  'minion',
  'demon',
  'traveller',
]

const TWO_COL_QUERY = '(min-width: 44rem)'

function formatTypeLabel(type) {
  return type.charAt(0).toUpperCase() + type.slice(1)
}

function groupCharactersByType(characters) {
  const buckets = new Map()
  for (const c of characters) {
    if (!buckets.has(c.type)) buckets.set(c.type, [])
    buckets.get(c.type).push(c)
  }

  const seen = new Set()
  const sections = []

  for (const t of CHARACTER_TYPE_ORDER) {
    const list = buckets.get(t)
    if (list?.length) {
      sections.push({ type: t, characters: list })
      seen.add(t)
    }
  }

  for (const t of buckets.keys()) {
    if (!seen.has(t)) {
      const list = buckets.get(t)
      if (list?.length) sections.push({ type: t, characters: list })
    }
  }

  return sections
}

function useWideScriptLayout() {
  const [wide, setWide] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(TWO_COL_QUERY).matches : false
  )

  useEffect(() => {
    const mq = window.matchMedia(TWO_COL_QUERY)
    const onChange = () => setWide(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  return wide
}

function gridItemStyle(twoCol, index, total) {
  if (!twoCol) {
    return { gridColumn: 1, gridRow: index + 1 }
  }
  const leftColCount = Math.ceil(total / 2)
  const isLeft = index < leftColCount
  return {
    gridColumn: isLeft ? 1 : 2,
    gridRow: isLeft ? index + 1 : index - leftColCount + 1,
  }
}

function ScriptCharacterRow({ character: c, style }) {
  const iconSrc = getCharacterIconSrc(c)
  return (
    <li className="script-detail__row" style={style}>
      <div className="script-detail__row-icon">
        {iconSrc ? (
          <img
            className="script-detail__icon-img"
            src={iconSrc}
            alt=""
            width={56}
            height={56}
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div
            className="script-detail__icon-img script-detail__icon-placeholder"
            aria-hidden
          />
        )}
      </div>
      <div className="script-detail__row-body">
        <div className="script-detail__row-title">
          <span className="script-detail__char-name">{c.name}</span>
        </div>
        <p className="script-detail__ability">{c.ability}</p>
      </div>
    </li>
  )
}

function ScriptTypeCharacterGrid({ characters }) {
  const twoCol = useWideScriptLayout()
  const n = characters.length

  return (
    <ul
      className={`script-detail__type-grid${twoCol ? ' script-detail__type-grid--two' : ''}`}
    >
      {characters.map((c, i) => (
        <ScriptCharacterRow
          key={c.id}
          character={c}
          style={gridItemStyle(twoCol, i, n)}
        />
      ))}
    </ul>
  )
}

function ScriptTypeSection({ type, characters }) {
  const [open, setOpen] = useState(true)

  return (
    <details
      className="script-detail__details"
      open={open}
      onToggle={(e) => setOpen(e.currentTarget.open)}
    >
      <summary className="script-detail__summary">
        <span className="script-detail__summary-label">{formatTypeLabel(type)}</span>
        <span className="script-detail__summary-count">{characters.length}</span>
      </summary>
      <ScriptTypeCharacterGrid characters={characters} />
    </details>
  )
}

function ScriptDetailView({ scriptId }) {
  const navigate = useNavigate()
  const { user, isAuthenticated, authorizedFetch } = useAuth()
  const [script, setScript] = useState(null)
  const [loadError, setLoadError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState(null)

  const canEdit =
    isAuthenticated &&
    script &&
    user?.username &&
    script.author &&
    user.username === script.author

  const handleDeleteScript = async () => {
    if (!canEdit || deleting) return
    if (
      !window.confirm(
        `Delete “${script.name}”? This cannot be undone.`
      )
    ) {
      return
    }
    setDeleteError(null)
    setDeleting(true)
    try {
      const res = await authorizedFetch(
        `/api/scripts/${encodeURIComponent(scriptId)}`,
        { method: 'DELETE' }
      )
      if (res.status === 204) {
        navigate('/my-scripts', { replace: true })
        return
      }
      const body = await res.json().catch(() => ({}))
      if (res.status === 403) {
        setDeleteError(body.message || 'You can only delete scripts you own.')
      } else if (res.status === 404) {
        setDeleteError(body.message || 'Script not found.')
      } else {
        setDeleteError(
          body.error || body.message || `Could not delete script (${res.status}).`
        )
      }
    } catch (e) {
      setDeleteError(e.message || 'Could not delete script.')
    } finally {
      setDeleting(false)
    }
  }

  const sections = useMemo(
    () => (script?.characters?.length ? groupCharactersByType(script.characters) : []),
    [script]
  )

  useEffect(() => {
    let cancelled = false

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
        if (!data || typeof data !== 'object') {
          setLoadError('Script not found.')
          setScript(null)
          return
        }
        setScript(data)
      })
      .catch((err) => {
        if (!cancelled) {
          setLoadError(err.message || 'Could not load script.')
          setScript(null)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [scriptId])

  return (
    <div className="page script-detail-page">
      <p className="script-detail__back-wrap">
        <Link to="/scripts" className="script-detail__back">
          ← All scripts
        </Link>
      </p>

      {loading && <p className="script-detail__status">Loading script…</p>}
      {!loading && loadError && (
        <p className="script-detail__status script-detail__status--error" role="alert">
          {loadError}
        </p>
      )}

      {!loading && !loadError && script && (
        <>
          <header className="script-detail__header">
            <div className="script-detail__title-row">
              <h1 className="page__title script-detail__title">{script.name}</h1>
              {canEdit && (
                <div className="script-detail__actions">
                  <Link
                    to={`/scripts/${encodeURIComponent(scriptId)}/edit`}
                    className="script-detail__edit"
                  >
                    Edit script
                  </Link>
                  <button
                    type="button"
                    className="script-detail__delete"
                    disabled={deleting}
                    onClick={handleDeleteScript}
                  >
                    {deleting ? 'Deleting…' : 'Delete script'}
                  </button>
                </div>
              )}
            </div>
            {deleteError && (
              <p
                className="script-detail__status script-detail__status--error script-detail__delete-error"
                role="alert"
              >
                {deleteError}
              </p>
            )}
            <div className="script-detail__meta">
              {script.is_official && (
                <span className="script-detail__badge script-detail__badge--official">
                  Official
                </span>
              )}
              <span className="script-detail__author">by {script.author}</span>
            </div>
            {script.description ? (
              <p className="script-detail__description">{script.description}</p>
            ) : (
              <p className="script-detail__description script-detail__description--muted">
                No description.
              </p>
            )}
          </header>

          <section className="script-detail__characters" aria-labelledby="script-characters-heading">
            <h2 id="script-characters-heading" className="script-detail__h2">
              Characters ({script.characters?.length ?? 0})
            </h2>
            {script.characters?.length ? (
              <div className="script-detail__sections">
                {sections.map(({ type, characters }) => (
                  <ScriptTypeSection key={type} type={type} characters={characters} />
                ))}
              </div>
            ) : (
              <p className="script-detail__empty">No characters in this script.</p>
            )}
          </section>
        </>
      )}
    </div>
  )
}

export default function ScriptDetailPage() {
  const { scriptId } = useParams()
  return <ScriptDetailView key={scriptId} scriptId={scriptId} />
}
