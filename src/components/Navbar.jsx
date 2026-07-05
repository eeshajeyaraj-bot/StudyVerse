import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const NAV_LINKS = [
  { to: '/',          label: 'Dashboard',  icon: '⚔️'  },
  { to: '/subjects',  label: 'Subjects',   icon: '📚'  },
  { to: '/timer',     label: 'Timer',      icon: '⏱️'  },
  { to: '/tasks',     label: 'Tasks',      icon: '✅'  },
  { to: '/analytics', label: 'Analytics',  icon: '📊'  },
  { to: '/rooms',     label: 'Rooms',      icon: '🏰'  },
]

export default function Navbar() {
  const { pathname } = useLocation()
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await signOut()
    navigate('/login')
  }

  return (
    <nav style={styles.nav}>
      <div style={styles.brand}>
        <span style={styles.brandIcon}>🌌</span>
        <span style={styles.brandName}>StudyVerse</span>
      </div>

      <div style={styles.links}>
        {NAV_LINKS.map(({ to, label, icon }) => {
          const active = pathname === to
          return (
            <Link
              key={to}
              to={to}
              style={{
                ...styles.link,
                ...(active ? styles.linkActive : {})
              }}
            >
              <span style={styles.linkIcon}>{icon}</span>
              <span style={styles.linkLabel}>{label}</span>
              {active && <span style={styles.activeDot} />}
            </Link>
          )
        })}
      </div>

      {user && (
        <div style={styles.userSection}>
          <span style={styles.userEmail}>{user.email}</span>
          <button style={styles.logoutBtn} onClick={handleLogout}>Logout</button>
        </div>
      )}
    </nav>
  )
}

const styles = {
  nav: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 24px',
    background: 'rgba(26, 16, 53, 0.95)',
    borderBottom: '1px solid rgba(168, 85, 247, 0.2)',
    backdropFilter: 'blur(16px)',
    position: 'sticky',
    top: 0,
    zIndex: 100,
    flexWrap: 'wrap',
    gap: '12px',
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  brandIcon: {
    fontSize: '20px',
  },
  brandName: {
    fontFamily: "'Inter', sans-serif",
    fontWeight: 700,
    fontSize: '17px',
    background: 'linear-gradient(90deg, #f0abfc, #a855f7)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    letterSpacing: '0.3px',
  },
  links: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    flexWrap: 'wrap',
  },
  link: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '7px 13px',
    borderRadius: '9px',
    color: 'rgba(255,255,255,0.5)',
    fontSize: '13px',
    fontWeight: '500',
    textDecoration: 'none',
    transition: 'all 0.18s ease',
    position: 'relative',
    border: '1px solid transparent',
  },
  linkActive: {
    color: '#f0abfc',
    background: 'rgba(168, 85, 247, 0.15)',
    border: '1px solid rgba(168, 85, 247, 0.3)',
  },
  linkIcon: {
    fontSize: '15px',
  },
  linkLabel: {
    letterSpacing: '0.2px',
  },
  activeDot: {
    position: 'absolute',
    bottom: '-1px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '4px',
    height: '4px',
    borderRadius: '50%',
    background: '#a855f7',
  },
  userSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  userEmail: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.35)',
  },
  logoutBtn: {
    padding: '6px 14px',
    borderRadius: '8px',
    background: 'rgba(248, 113, 113, 0.1)',
    border: '1px solid rgba(248, 113, 113, 0.3)',
    color: '#f87171',
    fontSize: '12px',
    fontWeight: 600,
  },
}