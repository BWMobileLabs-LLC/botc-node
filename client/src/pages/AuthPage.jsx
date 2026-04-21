import { useState } from 'react'
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
  const { isAuthenticated, user, applySession, signOut } = useAuth()
  const [mode, setMode] = useState('signin')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [pending, setPending] = useState(false)

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

  return (
    <div className="page auth-page">
      <h1 className="page__title">Account</h1>

      {isAuthenticated ? (
        <div className="auth-panel">
          <p className="auth-signed-in">
            Signed in as <strong>{user?.username}</strong>
          </p>
          <button type="button" className="auth-submit" onClick={() => signOut()}>
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
