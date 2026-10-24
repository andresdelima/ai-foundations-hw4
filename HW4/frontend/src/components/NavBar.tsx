import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../authContext'
import { useBag } from '../bagContext'
import { BulldogMark } from './Brand'
import HeaderSearch from './HeaderSearch'

const links = [
  { to: '/', label: 'Home', end: true },
  { to: '/products', label: 'Products' },
  { to: '/about', label: 'About Us' },
]

export default function NavBar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { user, logout } = useAuth()
  const bag = useBag()
  const navigate = useNavigate()
  const close = () => setMenuOpen(false)

  return (
    <header className="site-header">
      <div className="announcement" aria-label="Store announcements">
        <div className="announcement-roll">
          <span>✦ Officially licensed Yale apparel ✦</span>
          <span>Made to order at 57 Broadway, New Haven</span>
          <span>Open online 24/7: ask the Bulldog anything</span>
          <span>30-day returns on unworn items</span>
          <span>✦ Officially licensed Yale apparel ✦</span>
        </div>
      </div>
      <nav className="nav container" aria-label="Main">
        <Link to="/" className="brand" onClick={close}>
          <BulldogMark size={46} className="brand-dog" />
          <span className="brand-text">
            <strong>Campus Customs</strong>
            <small>Yale Bulldog Blue · Est. New Haven</small>
          </span>
        </Link>

        <div className="nav-search">
          <HeaderSearch onNavigate={close} />
        </div>

        <button
          className="menu-toggle"
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((o) => !o)}
        >
          ☰
        </button>

        <div className={`nav-links ${menuOpen ? 'open' : ''}`}>
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} onClick={close}>
              {l.label}
            </NavLink>
          ))}
          <span className="nav-divider" aria-hidden />
          {user ? (
            <>
              <span className="nav-user">Hi, {user.first_name}</span>
              <button
                className="btn btn-outline btn-sm"
                onClick={async () => {
                  close()
                  await logout()
                  navigate('/')
                }}
              >
                Log Out
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login" onClick={close}>
                Log In
              </NavLink>
              <NavLink to="/signup" className="btn btn-primary btn-sm" onClick={close}>
                Create Account
              </NavLink>
            </>
          )}
        </div>

        <button
          className="bag-button"
          onClick={() => bag.setOpen(true)}
          aria-label={`Open bag, ${bag.count} item${bag.count === 1 ? '' : 's'}`}
        >
          <span aria-hidden>🛍️</span>
          <span className="bag-label">Bag</span>
          {bag.count > 0 && <span className="bag-count">{bag.count}</span>}
        </button>
      </nav>
    </header>
  )
}
