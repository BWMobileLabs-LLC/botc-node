import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import '../App.css'
import './AuthPage.css'
import { useAuth } from '../auth/useAuth.js'

async function readAuthError(res) {
  try {
    const body = await res.json()
    return body.error || `Request failed (${res.status})`
  } catch {
    return `Request failed (${res.status})`
  }
}

export default function AuthPage() {
  const navigate = useNavigate()
  const {
    isAuthenticated,
    authReady,
    user,
    accessToken,
    applySession,
    signOut,
    authorizedFetch,
  } = useAuth()
  const [mode, setMode] = useState('signin')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [pending, setPending] = useState(false)

  const [profileLoading, setProfileLoading] = useState(false)
  const [profileLoadError, setProfileLoadError] = useState(null)
  const [editUsername, setEditUsername] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editDisplayName, setEditDisplayName] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [profileError, setProfileError] = useState(null)
  const [profileOk, setProfileOk] = useState(false)
  const [profileSaving, setProfileSaving] = useState(false)

  const resetForm = () => {
    setPassword('')
    setError(null)
  }

  const onSignIn = async (e) => {
    e.preventDefault()
    setError(null)
    setPending(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password }),
      })
      if (!res.ok) {
        setError(await readAuthError(res))
        return
      }
      const data = await res.json()
      applySession(data.accessToken, data.user)
      resetForm()
      navigate('/')
    } catch {
      setError('Network error — try again.')
    } finally {
      setPending(false)
    }
  }

  const onRegister = async (e) => {
    e.preventDefault()
    setError(null)
    setPending(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, email, password }),
      })
      if (!res.ok) {
        setError(await readAuthError(res))
        return
      }
      const data = await res.json()
      applySession(data.accessToken, data.user)
      setEmail('')
      resetForm()
      navigate('/')
    } catch {
      setError('Network error — try again.')
    } finally {
      setPending(false)
    }
  }

  useEffect(() => {
    if (!authReady) return

    if (!isAuthenticated) {
      setEditUsername('')
      setEditEmail('')
      setEditDisplayName('')
      setNewPassword('')
      setProfileLoadError(null)
      setProfileError(null)
      setProfileOk(false)
      return
    }

    let cancelled = false
    setProfileLoading(true)
    setProfileLoadError(null)

    authorizedFetch('/api/auth/me')
      .then(async (res) => {
        if (!res.ok) throw new Error(await readAuthError(res))
        return res.json()
      })
      .then((data) => {
        if (cancelled) return
        setEditUsername(data.username ?? '')
        setEditEmail(data.email ?? '')
        setEditDisplayName(data.display_name ?? '')
      })
      .catch(() => {
        if (!cancelled) setProfileLoadError('Could not load your profile.')
      })
      .finally(() => {
        if (!cancelled) setProfileLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [authReady, isAuthenticated, authorizedFetch])

  async function onUpdateProfile(e) {
    e.preventDefault()
    setProfileError(null)
    setProfileOk(false)

    const u = editUsername.trim()
    const em = editEmail.trim()
    if (!u) {
      setProfileError('Username is required.')
      return
    }
    if (newPassword && newPassword.length < 8) {
      setProfileError('New password must be at least 8 characters, or leave it blank.')
      return
    }

    const body = {
      username: u,
      email: em,
      display_name: editDisplayName.trim() || null,
    }
    if (newPassword) body.password = newPassword

    setProfileSaving(true)
    try {
      const res = await authorizedFetch('/api/auth/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.status === 401) {
        setProfileError('Session expired — sign in again.')
        return
      }
      if (!res.ok) {
        setProfileError(await readAuthError(res))
        return
      }
      const data = await res.json()
      if (accessToken && data?.id != null && data.username) {
        applySession(accessToken, {
          id: data.id,
          username: data.username,
          ...(data.email ? { email: data.email } : {}),
        })
      }
      setNewPassword('')
      setProfileOk(true)
    } catch {
      setProfileError('Network error — try again.')
    } finally {
      setProfileSaving(false)
    }
  }

  return (
    <div className="page auth-page">
      <h1 className="page__title">Account</h1>

      {!authReady ? (
        <p className="auth-profile-status">Restoring session…</p>
      ) : isAuthenticated ? (
        <div className="auth-panel">
          <p className="auth-signed-in">
            Signed in as <strong>{user?.username ?? '…'}</strong>
          </p>

          {profileLoading && <p className="auth-profile-status">Loading profile…</p>}
          {profileLoadError && (
            <p className="auth-error" role="alert">
              {profileLoadError}
            </p>
          )}

          {!profileLoading && !profileLoadError && (
            <form className="auth-form auth-profile-form" onSubmit={onUpdateProfile}>
              <label className="auth-field">
                <span className="auth-field__label">Username</span>
                <input
                  name="profile_username"
                  autoComplete="username"
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  required
                  minLength={1}
                  maxLength={30}
                />
              </label>
              <label className="auth-field">
                <span className="auth-field__label">Email</span>
                <input
                  name="profile_email"
                  type="email"
                  autoComplete="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  required
                />
              </label>
              <label className="auth-field">
                <span className="auth-field__label">Display name</span>
                <input
                  name="profile_display_name"
                  autoComplete="nickname"
                  value={editDisplayName}
                  onChange={(e) => setEditDisplayName(e.target.value)}
                  maxLength={80}
                  placeholder="Optional"
                />
              </label>
              <label className="auth-field">
                <span className="auth-field__label">New password</span>
                <input
                  name="profile_new_password"
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Leave blank to keep current"
                />
              </label>
              <p className="auth-field-hint">Password must be at least 8 characters if you change it.</p>

              {profileError && (
                <p className="auth-error" role="alert">
                  {profileError}
                </p>
              )}
              {profileOk && (
                <p className="auth-success" role="status">
                  Changes saved.
                </p>
              )}

              <button type="submit" className="auth-submit" disabled={profileSaving}>
                {profileSaving ? 'Saving…' : 'Save changes'}
              </button>
            </form>
          )}

          <button type="button" className="auth-signout" onClick={() => signOut()}>
            Sign out
          </button>
        </div>
      ) : (
        <>
          <div className="auth-tabs" role="tablist" aria-label="Authentication mode">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'signin'}
              className={`auth-tab${mode === 'signin' ? ' auth-tab--active' : ''}`}
              onClick={() => {
                setMode('signin')
                setError(null)
              }}
            >
              Sign in
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'register'}
              className={`auth-tab${mode === 'register' ? ' auth-tab--active' : ''}`}
              onClick={() => {
                setMode('register')
                setError(null)
              }}
            >
              Register
            </button>
          </div>

          {mode === 'signin' ? (
            <form className="auth-form" onSubmit={onSignIn}>
              <label className="auth-field">
                <span className="auth-field__label">Username</span>
                <input
                  name="username"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  minLength={1}
                />
              </label>
              <label className="auth-field">
                <span className="auth-field__label">Password</span>
                <input
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={1}
                />
              </label>
              {error && (
                <p className="auth-error" role="alert">
                  {error}
                </p>
              )}
              <button type="submit" className="auth-submit" disabled={pending}>
                {pending ? 'Signing in…' : 'Sign in'}
              </button>
            </form>
          ) : (
            <form className="auth-form" onSubmit={onRegister}>
              <label className="auth-field">
                <span className="auth-field__label">Username</span>
                <input
                  name="username"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  minLength={1}
                  maxLength={30}
                />
              </label>
              <label className="auth-field">
                <span className="auth-field__label">Email</span>
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </label>
              <label className="auth-field">
                <span className="auth-field__label">Password</span>
                <input
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                />
              </label>
              {error && (
                <p className="auth-error" role="alert">
                  {error}
                </p>
              )}
              <button type="submit" className="auth-submit" disabled={pending}>
                {pending ? 'Creating account…' : 'Create account'}
              </button>
            </form>
          )}
        </>
      )}
    </div>
  )
}
