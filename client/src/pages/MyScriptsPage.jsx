import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import '../App.css'
import './ScriptsPage.css'
import { useAuth } from '../auth/useAuth.js'

export default function MyScriptsPage() {
  const { authorizedFetch } = useAuth()
  const [scripts, setScripts] = useState([])
  const [loadError, setLoadError] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    ;(async () => {
      try {
        const res = await authorizedFetch('/api/scripts/my_scripts')
        if (cancelled) return
        if (res.status === 401) {
          setLoadError('sign_in_required')
          setScripts([])
          return
        }
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          setLoadError(body.error || `Request failed (${res.status})`)
          setScripts([])
          return
        }
        const data = await res.json()
        if (!Array.isArray(data)) {
          setLoadError('Unexpected response from server.')
          setScripts([])
          return
        }
        setLoadError(null)
        setScripts(data)
      } catch {
        if (!cancelled) {
          setLoadError('Could not load scripts.')
          setScripts([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [authorizedFetch])

  return (
    <div className="page scripts-page">
      <div className="scripts-page__head">
        <h1 className="page__title">My scripts</h1>
        <Link to="/scripts/new" className="scripts-page__action-btn">
          Create script
        </Link>
      </div>
      <p className="scripts-page__intro">
        Scripts you own. Open one for full character order and abilities.
      </p>

      {loading && <p className="scripts-page__status">Loading your scripts…</p>}
      {!loading && loadError === 'sign_in_required' && (
        <p className="scripts-page__status scripts-page__status--error" role="alert">
          Sign in to view your scripts.{' '}
          <Link to="/auth" className="scripts-page__inline-link">
            Go to Account
          </Link>
        </p>
      )}
      {!loading && loadError && loadError !== 'sign_in_required' && (
        <p className="scripts-page__status scripts-page__status--error" role="alert">
          {loadError}
        </p>
      )}

      {!loading && !loadError && (
        <>
          {scripts.length === 0 ? (
            <p className="scripts-page__empty">You do not have any scripts yet.</p>
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
