import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import '../App.css'
import './ScriptsPage.css'

async function readScriptArrayResponse(res) {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || body.message || `Request failed (${res.status})`)
  }
  const data = await res.json()
  if (!Array.isArray(data)) {
    throw new Error('Unexpected response from server.')
  }
  return data
}

function mergeBaseAndCatalog(baseList, catalogList) {
  const base = Array.isArray(baseList) ? baseList : []
  const more = Array.isArray(catalogList) ? catalogList : []
  const baseIds = new Set(base.map((s) => String(s?.id)))
  return [...base, ...more.filter((s) => s != null && !baseIds.has(String(s.id)))]
}

async function fetchScriptList(url) {
  const res = await fetch(url)
  return readScriptArrayResponse(res)
}

async function fetchDefaultScriptList() {
  const [baseRes, catalogRes] = await Promise.all([
    fetch('/api/scripts/base-scripts'),
    fetch('/api/scripts/'),
  ])
  const base = await readScriptArrayResponse(baseRes)
  const catalog = await readScriptArrayResponse(catalogRes)
  return mergeBaseAndCatalog(base, catalog)
}

export default function ScriptsPage() {
  const [scripts, setScripts] = useState([])
  const [loadError, setLoadError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [searchInput, setSearchInput] = useState('')

  useEffect(() => {
    let cancelled = false
    const q = searchInput.trim()
    const url = q
      ? `/api/scripts/search?${new URLSearchParams({ q })}`
      : '/api/scripts/'

    setLoading(true)
    const t = window.setTimeout(() => {
      const run = q
        ? fetchScriptList(url)
        : fetchDefaultScriptList()
      run
        .then((list) => {
          if (!cancelled) {
            setLoadError(null)
            setScripts(list)
          }
        })
        .catch((err) => {
          if (!cancelled) {
            setLoadError(err.message || 'Could not load scripts.')
            setScripts([])
          }
        })
        .finally(() => {
          if (!cancelled) setLoading(false)
        })
    }, q ? 300 : 0)

    return () => {
      cancelled = true
      window.clearTimeout(t)
    }
  }, [searchInput])

  return (
    <div className="page scripts-page">
      <div className="scripts-page__head">
        <h1 className="page__title">Scripts</h1>
        <Link to="/scripts/new" className="scripts-page__action-btn">
          Create script
        </Link>
      </div>
      <p className="scripts-page__intro">
        Base scripts appear first, then up to 20 more from the catalog. Search matches script names.
      </p>

      <label className="scripts-page__search">
        <span className="scripts-page__search-label">Search by name</span>
        <input
          type="search"
          className="scripts-page__search-input"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Type to filter…"
          autoComplete="off"
          spellCheck="false"
        />
      </label>

      {loading && <p className="scripts-page__status">Loading scripts…</p>}
      {!loading && loadError && (
        <p className="scripts-page__status scripts-page__status--error" role="alert">
          {loadError}
        </p>
      )}

      {!loading && !loadError && (
        <>
          {scripts.length === 0 ? (
            <p className="scripts-page__empty">
              {searchInput.trim() ? 'No scripts match that search.' : 'No scripts returned.'}
            </p>
          ) : (
            <ul className="scripts-list">
              {scripts.map((s) => (
                <li key={s.id} className="scripts-list__item">
                  <Link to={`/scripts/${s.id}`} className="scripts-list__link">
                    <div className="scripts-list__head">
                      <h2 className="scripts-list__name">{s.name}</h2>
                      <div className="scripts-list__meta">
                        {s.is_official && (
                          <span className="scripts-list__badge scripts-list__badge--official">
                            Official
                          </span>
                        )}
                        <span className="scripts-list__author">by {s.author}</span>
                      </div>
                    </div>
                    {s.description ? (
                      <p className="scripts-list__description">{s.description}</p>
                    ) : (
                      <p className="scripts-list__description scripts-list__description--muted">
                        No description.
                      </p>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}
