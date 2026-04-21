import { useEffect, useMemo, useState } from 'react'
import '../App.css'
import './CharactersPage.css'
import { getCharacterIconSrc } from '../utils/characterIcon.js'

const CHARACTER_TYPES = [
  'townsfolk',
  'outsider',
  'minion',
  'demon',
  'traveller',
]

const defaultTypeVisibility = () =>
  Object.fromEntries(CHARACTER_TYPES.map((t) => [t, true]))

function formatTypeLabel(type) {
  return type.charAt(0).toUpperCase() + type.slice(1)
}

const WIKI_BASE = 'https://wiki.bloodontheclocktower.com/'

function characterWikiHref(wikiLinkName) {
  if (!wikiLinkName) return null
  return `${WIKI_BASE}${wikiLinkName}`
}

export default function CharactersPage() {
  const [characters, setCharacters] = useState([])
  const [loadError, setLoadError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [typeVisible, setTypeVisible] = useState(defaultTypeVisibility)

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
          setCharacters([])
          return
        }
        setCharacters(data)
      })
      .catch((err) => {
        if (!cancelled) {
          setLoadError(err.message || 'Could not load characters.')
          setCharacters([])
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return characters.filter((c) => {
      const typeOn = typeVisible[c.type] ?? true
      if (!typeOn) return false
      if (!q) return true
      return c.name.toLowerCase().includes(q)
    })
  }, [characters, query, typeVisible])

  const toggleType = (type) => {
    setTypeVisible((prev) => ({ ...prev, [type]: !prev[type] }))
  }

  return (
    <div className="page characters-page">
      <h1 className="page__title">Characters</h1>

      <div className="characters-toolbar">
        <label className="characters-search">
          <span className="characters-search__label">Search by name</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter by name…"
            autoComplete="off"
            spellCheck="false"
          />
        </label>

        <fieldset className="characters-types">
          <legend className="characters-types__legend">Show types</legend>
          <div className="characters-types__grid">
            {CHARACTER_TYPES.map((type) => (
              <label key={type} className="characters-type-toggle">
                <input
                  type="checkbox"
                  checked={typeVisible[type]}
                  onChange={() => toggleType(type)}
                />
                <span>{formatTypeLabel(type)}</span>
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      {loading && <p className="characters-status">Loading characters…</p>}
      {!loading && loadError && (
        <p className="characters-status characters-status--error" role="alert">
          {loadError}
        </p>
      )}

      {!loading && !loadError && (
        <>
          {filtered.length === 0 ? (
            <p className="characters-empty">
              No characters match your search and type filters.
            </p>
          ) : (
            <ul className="characters-grid">
              {filtered.map((c) => {
                const iconSrc = getCharacterIconSrc(c)
                const wikiHref = characterWikiHref(c.wiki_link_name)
                const cardInner = (
                  <>
                    <div className="characters-card__icon-wrap">
                      {iconSrc ? (
                        <img
                          className="characters-card__icon"
                          src={iconSrc}
                          alt=""
                          width={88}
                          height={88}
                          loading="lazy"
                          decoding="async"
                        />
                      ) : (
                        <div
                          className="characters-card__icon characters-card__icon--placeholder"
                          aria-hidden
                        />
                      )}
                    </div>
                    <div className="characters-card__meta">
                      <span
                        className={`characters-card__badge characters-card__badge--${c.type}`}
                      >
                        {formatTypeLabel(c.type)}
                      </span>
                      <h2 className="characters-card__name">{c.name}</h2>
                    </div>
                    <p className="characters-card__ability">{c.ability}</p>
                  </>
                )
                return (
                  <li key={c.id} className="characters-card-wrap">
                    {wikiHref ? (
                      <a
                        className="characters-card characters-card--clickable"
                        href={wikiHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${c.name} on the Blood on the Clocktower wiki (opens in new tab)`}
                      >
                        {cardInner}
                      </a>
                    ) : (
                      <div className="characters-card">{cardInner}</div>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </>
      )}
    </div>
  )
}
