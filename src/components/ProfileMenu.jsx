import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProfileMenu() {
  const { user, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    function close(event) {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  async function logout() {
    await signOut()
    navigate('/login')
  }

  if (!user) return null

  const metadata = user.user_metadata || {}
  const name = metadata.display_name || user.email?.split('@')[0] || 'StudyVerse member'
  const username = metadata.username ? `@${metadata.username}` : 'StudyVerse member'
  const avatar = metadata.avatar_url
  const emoji = metadata.emoji_avatar || '👤'
  const status = metadata.status || 'Available'

  return (
    <div className="sv-profile" ref={ref}>
      <button className="sv-profile-trigger" onClick={() => setOpen(value => !value)} aria-expanded={open} aria-label="Open profile menu">
        <span className="sv-avatar">
          {avatar ? <img src={avatar} alt="Profile" /> : emoji}
        </span>
        <span className="sv-profile-text">
          <strong>{name}</strong>
          <small>{username}</small>
        </span>
        <span className="sv-profile-chevron">⌄</span>
      </button>

      {open && (
        <div className="sv-profile-menu">
          <div className="sv-profile-menu-header">
            <span className="sv-avatar large">
              {avatar ? <img src={avatar} alt="Profile" /> : emoji}
            </span>
            <div>
              <strong>{name}</strong>
              <small>{username}</small>
              <span className="sv-profile-status">● {status}</span>
            </div>
          </div>
          <button onClick={() => { setOpen(false); navigate('/settings?section=profile') }}>✏️ Edit Profile</button>
          <button onClick={() => { setOpen(false); navigate('/settings?section=appearance') }}>🎨 Appearance</button>
          <button onClick={() => { setOpen(false); navigate('/settings?section=notifications') }}>🔔 Notifications</button>
          <button onClick={() => { setOpen(false); navigate('/settings?section=privacy') }}>🔒 Privacy</button>
          <button onClick={() => { setOpen(false); navigate('/settings') }}>⚙️ Settings</button>
          <div className="sv-profile-divider" />
          <button className="danger" onClick={logout}>🚪 Logout</button>
        </div>
      )}
    </div>
  )
}
