import { useEffect, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { GameScriptPanelSidebar } from './GameScriptPanelSidebar.jsx'
import { useGameScriptPanel } from '../context/GameScriptPanelContext.jsx'
import './AppLayout.css'

function useWideScreen() {
  const [wide, setWide] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(min-width: 768px)').matches
      : false
  )

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    const onChange = () => setWide(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  return wide
}

export default function AppLayout() {
  const wide = useWideScreen()
  const [navOpen, setNavOpen] = useState(wide)
  const { scriptDetail } = useGameScriptPanel()
  const [scriptPanelOpen, setScriptPanelOpen] = useState(false)

  const closeNavIfNarrow = () => {
    if (!wide) setNavOpen(false)
  }

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    const onBreakpoint = () => {
      if (mq.matches) setNavOpen(true)
      else setNavOpen(false)
    }
    mq.addEventListener('change', onBreakpoint)
    return () => mq.removeEventListener('change', onBreakpoint)
  }, [])

  useEffect(() => {
    if (!scriptDetail) setScriptPanelOpen(false)
  }, [scriptDetail])

  useEffect(() => {
    if (!scriptPanelOpen || !scriptDetail) return
    const onKey = (e) => {
      if (e.key === 'Escape') setScriptPanelOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [scriptPanelOpen, scriptDetail])

  const toggleNav = () => setNavOpen((o) => !o)

  const toggleScriptPanel = () => setScriptPanelOpen((o) => !o)
  const showScriptPanel = Boolean(scriptDetail && scriptPanelOpen)

  const layoutClass = [
    'layout',
    navOpen ? 'layout--nav-open' : '',
    wide ? 'layout--wide' : '',
    scriptDetail && scriptPanelOpen ? 'layout--script-open' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={layoutClass}>
      {!wide && navOpen && (
        <button
          type="button"
          className="layout__backdrop"
          aria-label="Close menu"
          onClick={() => setNavOpen(false)}
        />
      )}
      {!wide && showScriptPanel && (
        <button
          type="button"
          className="layout__script-backdrop"
          aria-label="Close script panel"
          onClick={() => setScriptPanelOpen(false)}
        />
      )}

      <header className="layout__header">
        <button
          type="button"
          className="layout__menu-btn"
          onClick={toggleNav}
          aria-expanded={navOpen}
          aria-controls="app-sidebar"
          aria-label={navOpen ? 'Close navigation menu' : 'Open navigation menu'}
        >
          <span className="layout__menu-icon" aria-hidden>
            <span />
            <span />
            <span />
          </span>
        </button>
        <NavLink to="/" className="layout__brand" end onClick={closeNavIfNarrow}>
          Blood on the Clocktower
        </NavLink>
        {scriptDetail && (
          <button
            type="button"
            className="layout__script-toggle"
            onClick={toggleScriptPanel}
            aria-expanded={scriptPanelOpen}
            aria-controls="game-script-panel"
          >
            {scriptPanelOpen ? 'Hide script' : 'Show script'}
          </button>
        )}
      </header>

      <div className="layout__body">
        <aside id="app-sidebar" className="layout__sidebar" aria-label="Main navigation">
          <nav className="layout__nav">
            <NavLink
              to="/game"
              onClick={closeNavIfNarrow}
              className={({ isActive }) =>
                `layout__nav-link${isActive ? ' layout__nav-link--active' : ''}`
              }
            >
              Game
            </NavLink>
            <NavLink
              to="/characters"
              onClick={closeNavIfNarrow}
              className={({ isActive }) =>
                `layout__nav-link${isActive ? ' layout__nav-link--active' : ''}`
              }
            >
              Characters
            </NavLink>
            <NavLink
              to="/scripts"
              end
              onClick={closeNavIfNarrow}
              className={({ isActive }) =>
                `layout__nav-link${isActive ? ' layout__nav-link--active' : ''}`
              }
            >
              Scripts
            </NavLink>
            <NavLink
              to="/my-scripts"
              onClick={closeNavIfNarrow}
              className={({ isActive }) =>
                `layout__nav-link${isActive ? ' layout__nav-link--active' : ''}`
              }
            >
              My Scripts
            </NavLink>
            <NavLink
              to="/auth"
              onClick={closeNavIfNarrow}
              className={({ isActive }) =>
                `layout__nav-link${isActive ? ' layout__nav-link--active' : ''}`
              }
            >
              Account
            </NavLink>
          </nav>
        </aside>

        <main className="layout__main">
          <Outlet />
        </main>

        {showScriptPanel && (
          <aside
            id="game-script-panel"
            className="layout__script-panel"
            aria-label="Active game script"
            aria-hidden={!showScriptPanel}
          >
            <GameScriptPanelSidebar
              detail={scriptDetail}
              onClose={wide ? undefined : () => setScriptPanelOpen(false)}
            />
          </aside>
        )}
      </div>
    </div>
  )
}
