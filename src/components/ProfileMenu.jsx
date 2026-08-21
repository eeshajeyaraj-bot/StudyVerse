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

  const name = user.user_metadata?.display_name || user.email?.split('@')[0] || 'Scholar'
  const avatar = user.user_metadata?.avatar_url

  return (
    <div className="sv-profile" ref={ref}>
      <button className="sv-profile-trigger" onClick={() => setOpen(value => !value)} aria-expanded={open}>
        <span className="sv-avatar">
          {avatar ? <img src={avatar} alt="Profile" /> : (user.user_metadata?.emoji_avatar || '👤')}
        </span>
        <span className="sv-profile-text">
          <strong>{name}</strong>
          <small>StudyVerse member</small>
        </span>
        <span className="sv-profile-chevron">⌄</span>
      </button>

      {open && (
        <div className="sv-profile-menu">
          <div className="sv-profile-menu-header">
            <span className="sv-avatar large">{user.user_metadata?.emoji_avatar || '👤'}</span>
            <div><strong>{name}</strong><small>{user.email}</small></div>
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
