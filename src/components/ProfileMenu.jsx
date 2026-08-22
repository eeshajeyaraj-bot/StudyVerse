import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

export default function ProfileMenu() {
  const { user, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [notificationError, setNotificationError] = useState('')
  const ref = useRef(null)
  const notificationRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    function close(event) {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false)
      if (notificationRef.current && !notificationRef.current.contains(event.target)) setNotificationsOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  useEffect(() => {
    if (!user?.id) return undefined
    let channel

    async function loadNotifications() {
      const { data, error } = await supabase
        .from('notifications')
        .select('id,type,title,body,link,actor_id,metadata,is_read,created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) {
        setNotificationError(error.message.includes('notifications') ? 'Notifications need to be enabled in Supabase.' : error.message)
        return
      }

      setNotificationError('')
      setNotifications(data || [])
    }

    loadNotifications()

    channel = supabase
      .channel(`notifications-${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, payload => {
        setNotifications(prev => [payload.new, ...prev.filter(item => item.id !== payload.new.id)].slice(0, 50))
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, payload => {
        setNotifications(prev => prev.map(item => item.id === payload.new.id ? payload.new : item))
      })
      .subscribe()

    return () => {
      if (channel) supabase.removeChannel(channel)
    }
  }, [user?.id])

  async function logout() {
    await signOut()
    navigate('/login')
  }

  async function markRead(id) {
    const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id).eq('user_id', user.id)
    if (!error) setNotifications(prev => prev.map(item => item.id === id ? { ...item, is_read: true } : item))
  }

  async function markAllRead() {
    const { error } = await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false)
    if (!error) setNotifications(prev => prev.map(item => ({ ...item, is_read: true })))
  }

  function openNotification(item) {
    markRead(item.id)
    setNotificationsOpen(false)
    if (item.link) navigate(item.link)
  }

  if (!user) return null

  const metadata = user.user_metadata || {}
  const name = metadata.display_name || user.email?.split('@')[0] || 'StudyVerse member'
  const username = metadata.username ? `@${metadata.username}` : 'StudyVerse member'
  const avatar = metadata.avatar_url
  const emoji = metadata.emoji_avatar || '👤'
  const status = metadata.status || 'Available'
  const unreadCount = notifications.filter(item => !item.is_read).length

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div ref={notificationRef} style={{ position: 'relative' }}>
        <button
          type="button"
          onClick={() => setNotificationsOpen(value => !value)}
          aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
          style={{
            position: 'relative', width: 42, height: 42, borderRadius: 12,
            border: '1px solid var(--app-border)', background: 'var(--app-surface)',
            color: 'var(--app-text)', cursor: 'pointer', fontSize: 19,
          }}
        >
          🔔
          {unreadCount > 0 && (
            <span style={{
              position: 'absolute', top: -5, right: -5, minWidth: 18, height: 18,
              padding: '0 4px', borderRadius: 99, background: 'var(--app-accent)', color: '#fff',
              fontSize: 10, fontWeight: 700, display: 'grid', placeItems: 'center', border: '2px solid var(--app-background)',
            }}>{unreadCount > 99 ? '99+' : unreadCount}</span>
          )}
        </button>

        {notificationsOpen && (
          <div style={{
            position: 'absolute', right: 0, top: 50, width: 'min(390px, calc(100vw - 28px))',
            maxHeight: 520, overflow: 'hidden', zIndex: 120,
            background: 'var(--app-surface)', border: '1px solid var(--app-border)',
            borderRadius: 16, boxShadow: 'var(--app-shadow)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px 16px', borderBottom: '1px solid var(--app-border)' }}>
              <div>
                <strong style={{ color: 'var(--app-text)' }}>Notifications</strong>
                <div style={{ fontSize: 11, color: 'var(--app-muted)', marginTop: 3 }}>{unreadCount ? `${unreadCount} unread` : 'All caught up'}</div>
              </div>
              {unreadCount > 0 && <button type="button" onClick={markAllRead} style={{ border: 0, background: 'transparent', color: 'var(--app-accent)', cursor: 'pointer', fontSize: 12 }}>Mark all read</button>}
            </div>
            <div style={{ maxHeight: 430, overflowY: 'auto' }}>
              {notificationError ? (
                <div style={{ padding: 22, color: 'var(--app-muted)', fontSize: 13, lineHeight: 1.5 }}>{notificationError}</div>
              ) : notifications.length === 0 ? (
                <div style={{ padding: 34, textAlign: 'center', color: 'var(--app-muted)', fontSize: 13 }}>No notifications yet. You're all caught up ✨</div>
              ) : notifications.map(item => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => openNotification(item)}
                  style={{
                    width: '100%', textAlign: 'left', padding: '13px 16px', border: 0,
                    borderBottom: '1px solid var(--app-border)', cursor: 'pointer',
                    background: item.is_read ? 'transparent' : 'var(--app-accent-soft)', color: 'var(--app-text)',
                  }}
                >
                  <div style={{ display: 'flex', gap: 10 }}>
                    <span style={{ fontSize: 19 }}>{item.type === 'message' ? '💬' : item.type === 'friend_request' ? '👥' : item.type === 'room_invite' ? '🏠' : item.type === 'task_deadline' ? '⏰' : item.type === 'achievement' ? '🏆' : '🔔'}</span>
                    <span style={{ minWidth: 0, flex: 1 }}>
                      <strong style={{ display: 'block', fontSize: 13 }}>{item.title}</strong>
                      {item.body && <span style={{ display: 'block', marginTop: 3, fontSize: 12, color: 'var(--app-muted)', lineHeight: 1.45 }}>{item.body}</span>}
                      <span style={{ display: 'block', marginTop: 5, fontSize: 10, color: 'var(--app-muted)' }}>{new Date(item.created_at).toLocaleString()}</span>
                    </span>
                    {!item.is_read && <span style={{ width: 7, height: 7, borderRadius: 99, background: 'var(--app-accent)', marginTop: 5, flex: '0 0 auto' }} />}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

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
            <button onClick={() => { setOpen(false); setNotificationsOpen(true) }}>🔔 Notifications</button>
            <button onClick={() => { setOpen(false); navigate('/settings?section=privacy') }}>🔒 Privacy</button>
            <button onClick={() => { setOpen(false); navigate('/settings') }}>⚙️ Settings</button>
            <div className="sv-profile-divider" />
            <button className="danger" onClick={logout}>🚪 Logout</button>
          </div>
        )}
      </div>
    </div>
  )
}
