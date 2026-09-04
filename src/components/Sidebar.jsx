import { useState } from 'react'
import { NavLink } from 'react-router-dom'

const NAV_ITEMS = [
  ['/', '🏠', 'Dashboard'],
  ['/subjects', '📚', 'Subjects'],
  ['/timer', '⏱️', 'Timer'],
  ['/tasks', '✅', 'Tasks'],
  ['/analytics', '📊', 'Analytics'],
  ['/study-assistant', '🤖', 'AI Assistant'],
  ['/rooms', '🏰', 'Rooms'],
  ['/friends', '👥', 'Friends'],
  ['/calendar', '📅', 'Calendar'],
  ['/resources', '📖', 'Resources'],
]

const SECONDARY_ITEMS = [
  ['/settings', '⚙️', 'Settings'],
  ['/support', '💬', 'Support'],
]

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  const closeMobile = () => setMobileOpen(false)

  return (
    <>
      <button className="sv-mobile-menu" aria-label="Open navigation" onClick={() => setMobileOpen(true)}>☰</button>
      {mobileOpen && <button className="sv-sidebar-backdrop" aria-label="Close navigation" onClick={closeMobile} />}
      <aside className={`sv-sidebar ${collapsed ? 'is-collapsed' : ''} ${mobileOpen ? 'is-mobile-open' : ''}`}>
        <div className="sv-sidebar-brand">
          <span className="sv-sidebar-logo">🌌</span>
          {!collapsed && <span>StudyVerse</span>}
          <button className="sv-sidebar-close" aria-label="Close navigation" onClick={closeMobile}>×</button>
        </div>
        <nav className="sv-sidebar-nav" aria-label="Main navigation">
          {NAV_ITEMS.map(([to, icon, label]) => <NavLink key={to} to={to} end={to === '/'} onClick={closeMobile} className={({ isActive }) => `sv-sidebar-link ${isActive ? 'active' : ''}`}><span className="sv-sidebar-icon">{icon}</span>{!collapsed && <span>{label}</span>}</NavLink>)}
        </nav>
        <div className="sv-sidebar-bottom">
          {SECONDARY_ITEMS.map(([to, icon, label]) => <NavLink key={to} to={to} onClick={closeMobile} className={({ isActive }) => `sv-sidebar-link ${isActive ? 'active' : ''}`}><span className="sv-sidebar-icon">{icon}</span>{!collapsed && <span>{label}</span>}</NavLink>)}
          <button className="sv-sidebar-collapse" onClick={() => setCollapsed(value => !value)}><span>{collapsed ? '→' : '←'}</span>{!collapsed && <span>Collapse</span>}</button>
        </div>
      </aside>
    </>
  )
}
