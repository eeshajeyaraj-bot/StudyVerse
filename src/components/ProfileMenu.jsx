import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

const SELECT = 'id,type,title,message,link,actor_id,metadata,is_read,created_at'

export default function ProfileMenu() {
  const { user, signOut, refreshUser } = useAuth()
  const [open, setOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [notificationError, setNotificationError] = useState('')
  const [profile, setProfile] = useState(user?.user_metadata || {})
  const ref = useRef(null)
  const notificationRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => { setProfile(user?.user_metadata || {}) }, [user?.id, user?.user_metadata?.display_name, user?.user_metadata?.username, user?.user_metadata?.avatar_url, user?.user_metadata?.emoji_avatar, user?.user_metadata?.status])

  useEffect(() => {
    const onClick = event => {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false)
      if (notificationRef.current && !notificationRef.current.contains(event.target)) setNotificationsOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  useEffect(() => {
    if (!user?.id) return undefined
    let active = true
    let channel
    const uid = user.id
    const seenKey = `studyverse-notification-seen-${uid}`
    const readKey = `studyverse-notification-read-${uid}`
    const getSet = key => { try { return new Set(JSON.parse(localStorage.getItem(key) || '[]')) } catch { return new Set() } }
    const saveSet = (key, set) => localStorage.setItem(key, JSON.stringify([...set].slice(-300)))
    const merge = rows => {
      if (!active || !rows?.length) return
      setNotifications(prev => {
        const map = new Map(prev.map(x => [x.id, x]))
        rows.forEach(x => map.set(x.id, x))
        return [...map.values()].sort((a,b) => new Date(b.created_at)-new Date(a.created_at)).slice(0,50)
      })
    }

    async function loadNotifications() {
      const { data, error } = await supabase.from('notifications').select(SELECT).eq('user_id', uid).order('created_at', { ascending: false }).limit(50)
      if (!active) return
      if (error) setNotificationError(error.message)
      else { setNotificationError(''); merge(data || []) }
    }

    async function buildFallbackNotifications() {
      // Some Supabase projects block client inserts into notifications with RLS.
      // Build account-scoped notifications from the source tables as a fallback.
      const [dm, fr] = await Promise.all([
        supabase.from('direct_messages').select('id,sender_id,body,created_at').eq('recipient_id', uid).order('created_at', { ascending: false }).limit(30),
        supabase.from('friendships').select('id,user_id,status,created_at').eq('friend_id', uid).eq('status', 'pending').order('created_at', { ascending: false }).limit(30)
      ])
      if (!active) return
      const rows = []
      const seen = getSet(seenKey)
      const read = getSet(readKey)
      const baseline = localStorage.getItem(`${seenKey}-initialized`) === '1'
      ;(dm.data || []).forEach(m => rows.push({ id:`local-dm-${m.id}`, type:'message', title:'New message', message:(m.body || '').startsWith('__SV_ATTACHMENT__') ? 'You received an attachment.' : (m.body || '').slice(0,180), link:'/friends', actor_id:m.sender_id, metadata:{sender_id:m.sender_id,source_id:m.id}, is_read:read.has(`local-dm-${m.id}`), created_at:m.created_at }))
      ;(fr.data || []).forEach(r => rows.push({ id:`local-fr-${r.id}`, type:'friend_request', title:'New friend request', message:'Someone sent you a friend request.', link:'/friends', actor_id:r.user_id, metadata:{requester_id:r.user_id,source_id:r.id}, is_read:read.has(`local-fr-${r.id}`), created_at:r.created_at }))
      const currentIds = new Set(rows.map(x => x.id))
      if (!baseline) { currentIds.forEach(id => seen.add(id)); localStorage.setItem(`${seenKey}-initialized`, '1'); saveSet(seenKey, seen); return }
      rows.forEach(row => { if (!seen.has(row.id)) seen.add(row.id) })
      saveSet(seenKey, seen)
      merge(rows)
    }

    loadNotifications()
    buildFallbackNotifications()
    const poll = window.setInterval(() => { loadNotifications(); buildFallbackNotifications() }, 2500)
    channel = supabase.channel(`notifications-live-${uid}`)
      .on('postgres_changes', { event:'INSERT', schema:'public', table:'notifications', filter:`user_id=eq.${uid}` }, p => merge([p.new]))
      .on('postgres_changes', { event:'UPDATE', schema:'public', table:'notifications', filter:`user_id=eq.${uid}` }, p => merge([p.new]))
      .subscribe()
    return () => { active=false; clearInterval(poll); if(channel) supabase.removeChannel(channel) }
  }, [user?.id])

  if (!user) return null
  const name = profile.display_name || user.email?.split('@')[0] || 'StudyVerse member'
  const username = profile.username ? `@${profile.username}` : 'StudyVerse member'
  const avatar = profile.avatar_url
  const emoji = profile.emoji_avatar || '👤'
  const status = profile.status || 'Available'
  const unreadCount = notifications.filter(x => !x.is_read).length

  async function logout() { await signOut(); navigate('/login') }
  async function markRead(id) {
    setNotifications(prev => prev.map(x => x.id === id ? { ...x, is_read:true } : x))
    if (id.startsWith('local-')) {
      const key = `studyverse-notification-read-${user.id}`
      try { const set = new Set(JSON.parse(localStorage.getItem(key) || '[]')); set.add(id); localStorage.setItem(key, JSON.stringify([...set].slice(-300))) } catch {}
      return
    }
    const { error } = await supabase.from('notifications').update({is_read:true}).eq('id',id).eq('user_id',user.id)
    if (error) setNotificationError(`Could not mark notification as read: ${error.message}`)
  }
  async function markAllRead() {
    setNotifications(prev => prev.map(x => ({...x,is_read:true})))
    const local = notifications.filter(x => x.id.startsWith('local-')).map(x => x.id)
    if (local.length) { const key=`studyverse-notification-read-${user.id}`; try { const set=new Set(JSON.parse(localStorage.getItem(key)||'[]')); local.forEach(id=>set.add(id)); localStorage.setItem(key,JSON.stringify([...set].slice(-300))) } catch {} }
    await supabase.from('notifications').update({is_read:true}).eq('user_id',user.id).eq('is_read',false)
  }
  async function openNotifications() { setNotificationsOpen(true); if(unreadCount>0) await markAllRead() }
  async function refreshProfile() { const fresh=await refreshUser(); if(fresh) setProfile(fresh.user_metadata||{}) }

  return <div style={{display:'flex',alignItems:'center',gap:10}}>
    <div ref={notificationRef} style={{position:'relative'}}>
      <button type="button" onClick={openNotifications} aria-label="Notifications" style={{position:'relative',width:42,height:42,borderRadius:12,border:'1px solid var(--app-border)',background:'var(--app-surface)',color:'var(--app-text)',cursor:'pointer',fontSize:19}}>
        🔔{unreadCount>0&&<span style={{position:'absolute',top:-5,right:-5,minWidth:18,height:18,padding:'0 4px',borderRadius:99,background:'var(--app-accent)',color:'#fff',fontSize:10,fontWeight:700,display:'grid',placeItems:'center',border:'2px solid var(--app-background)'}}>{unreadCount>99?'99+':unreadCount}</span>}
      </button>
      {notificationsOpen&&<div style={{position:'absolute',right:0,top:50,width:'min(390px, calc(100vw - 28px))',maxHeight:520,overflow:'hidden',zIndex:120,background:'var(--app-surface)',border:'1px solid var(--app-border)',borderRadius:16,boxShadow:'var(--app-shadow)'}}>
        <div style={{display:'flex',justifyContent:'space-between',padding:'15px 16px',borderBottom:'1px solid var(--app-border)'}}><div><strong>Notifications</strong><div style={{fontSize:11,color:'var(--app-muted)',marginTop:3}}>Updates from chats and friend requests</div></div></div>
        <div style={{maxHeight:430,overflowY:'auto'}}>{notificationError?<div style={{padding:22,color:'var(--app-muted)',fontSize:13}}>{notificationError}</div>:notifications.length===0?<div style={{padding:34,textAlign:'center',color:'var(--app-muted)',fontSize:13}}>No notifications yet ✨</div>:notifications.map(item=><button key={item.id} onClick={()=>{markRead(item.id);setNotificationsOpen(false);if(item.link)navigate(item.link)}} style={{width:'100%',textAlign:'left',padding:'13px 16px',border:0,borderBottom:'1px solid var(--app-border)',cursor:'pointer',background:item.is_read?'transparent':'var(--app-accent-soft)',color:'var(--app-text)'}}><div style={{display:'flex',gap:10}}><span style={{fontSize:19}}>{item.type==='message'?'💬':item.type==='friend_request'?'👥':item.type==='room_invite'?'🏠':item.type==='task_deadline'?'⏰':item.type==='achievement'?'🏆':'🔔'}</span><span style={{minWidth:0,flex:1}}><strong style={{display:'block',fontSize:13}}>{item.title}</strong>{item.message&&<span style={{display:'block',marginTop:3,fontSize:12,color:'var(--app-muted)',lineHeight:1.45}}>{item.message}</span>}<span style={{display:'block',marginTop:5,fontSize:10,color:'var(--app-muted)'}}>{new Date(item.created_at).toLocaleString()}</span></span>{!item.is_read&&<span style={{width:7,height:7,borderRadius:99,background:'var(--app-accent)',marginTop:5}}/>}</div></button>)}</div>
      </div>}
    </div>
    <div className="sv-profile" ref={ref}>
      <button className="sv-profile-trigger" onClick={()=>setOpen(v=>!v)} aria-expanded={open}><span className="sv-avatar">{avatar?<img src={avatar} alt="Profile"/>:emoji}</span><span className="sv-profile-text"><strong>{name}</strong><small>{username}</small></span><span className="sv-profile-chevron">⌄</span></button>
      {open&&<div className="sv-profile-menu"><div className="sv-profile-menu-header"><span className="sv-avatar large">{avatar?<img src={avatar} alt="Profile"/>:emoji}</span><div><strong>{name}</strong><small>{username}</small><span className="sv-profile-status">● {status}</span></div></div><button onClick={()=>{setOpen(false);navigate('/settings?section=profile')}}>✏️ Edit Profile</button><button onClick={()=>{setOpen(false);navigate('/settings?section=appearance')}}>🎨 Appearance</button><button onClick={()=>{setOpen(false);openNotifications()}}>🔔 Notifications</button><button onClick={()=>{setOpen(false);navigate('/settings?section=privacy')}}>🔒 Privacy</button><button onClick={async()=>{setOpen(false);await refreshProfile();navigate('/settings')}}>⚙️ Settings</button><div className="sv-profile-divider"/><button className="danger" onClick={logout}>🚪 Logout</button></div>}
    </div>
  </div>
}
