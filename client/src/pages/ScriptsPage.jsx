import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import '../App.css'
import './ScriptsPage.css'

export default function ScriptsPage() {
  const [scripts, setScripts] = useState([])
  const [loadError, setLoadError] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    fetch('/api/scripts/')
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.error || `Request failed (${res.status})`)
        }
        return res.json()
      })
      .then((data) => {
        if (cancelled) return
        if (!Array.isArray(data)) {
          setLoadError('Unexpected response from server.')
          setScripts([])
          return
        }
        setScripts(data)
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

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="page scripts-page">
      <h1 className="page__title">Scripts</h1>
      <p className="scripts-page__intro">
        Public scripts from the catalog (up to 20). More browsing and editing will come later.
      </p>

      {loading && <p className="scripts-page__status">Loading scripts…</p>}
      {!loading && loadError && (
        <p className="scripts-page__status scripts-page__status--error" role="alert">
          {loadError}
        </p>
      )}

      {!loading && !loadError && (
        <>
          {scripts.length === 0 ? (
            <p className="scripts-page__empty">No scripts returned.</p>
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
