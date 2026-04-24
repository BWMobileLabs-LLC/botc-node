import { useEffect, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
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

  const toggleNav = () => setNavOpen((o) => !o)

  return (
    <div className={`layout ${navOpen ? 'layout--nav-open' : ''} ${wide ? 'layout--wide' : ''}`}>
      {!wide && navOpen && (
        <button
          type="button"
          className="layout__backdrop"
          aria-label="Close menu"
          onClick={() => setNavOpen(false)}
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
      </div>
    </div>
  )
}
