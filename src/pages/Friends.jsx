import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

function profileName(profile) { return profile?.display_name || profile?.name || 'StudyVerse member' }
function profileUsername(profile) { return profile?.name || 'student' }
function profileStatus(profile) { return profile?.status || 'Available' }
function initials(profile) { return profileName(profile).trim().slice(0, 1).toUpperCase() }
function friendProfile(row, userId) { return row.user_id === userId ? row.friend : row.user }

const profileFields = 'id,name,display_name,avatar_url,avatar_emoji,bio'

export default function Friends() {
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [friends, setFriends] = useState([])
  const [requests, setRequests] = useState([])
  const [search, setSearch] = useState('')
  const [results, setResults] = useState([])
  const [selected, setSelected] = useState(null)
  const [messages, setMessages] = useState([])
  const [message, setMessage] = useState('')
  const [nickname, setNickname] = useState('')
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState('')

  const userId = user?.id
  const acceptedIds = useMemo(() => new Set(friends.map(f => friendProfile(f, userId)?.id)), [friends, userId])

  async function loadSocial() {
    if (!userId) return
    setLoading(true)
    const [{ data: me, error: meError }, { data: rows, error: rowsError }, { data: pending, error: pendingError }] = await Promise.all([
      supabase.from('profiles').select(profileFields).eq('id', userId).maybeSingle(),
      supabase.from('friendships').select(`id,user_id,friend_id,status,nickname,created_at,user:profiles!friendships_user_id_fkey(${profileFields}),friend:profiles!friendships_friend_id_fkey(${profileFields})`).or(`user_id.eq.${userId},friend_id.eq.${userId}`).order('created_at', { ascending: false }),
      supabase.from('friendships').select(`id,user_id,friend_id,status,created_at,user:profiles!friendships_user_id_fkey(${profileFields})`).eq('friend_id', userId).eq('status', 'pending').order('created_at', { ascending: false }),
    ])
    if (me) setProfile(me)
    const socialError = meError || rowsError || pendingError
    if (socialError) setNotice(`Friends could not be loaded: ${socialError.message}`)
    setFriends((rows || []).filter(r => r.status === 'accepted'))
    setRequests(pending || [])
    setLoading(false)
  }

  useEffect(() => { loadSocial() }, [userId])

  useEffect(() => {
    if (!userId) return
    const channel = supabase.channel(`social:${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friendships', filter: `friend_id=eq.${userId}` }, loadSocial)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friendships', filter: `user_id=eq.${userId}` }, loadSocial)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [userId])

  useEffect(() => {
    const q = search.trim().replace(/[%_]/g, '')
    if (!q || q.length < 2 || !userId) { setResults([]); return }
    const timer = setTimeout(async () => {
      const [displayResult, nameResult] = await Promise.all([
        supabase.from('profiles').select(profileFields).neq('id', userId).ilike('display_name', `%${q}%`).limit(12),
        supabase.from('profiles').select(profileFields).neq('id', userId).ilike('name', `%${q}%`).limit(12),
      ])
      const searchError = displayResult.error || nameResult.error
      if (searchError) {
        setResults([])
        setNotice(`Friend search failed: ${searchError.message}`)
        return
      }
      const merged = [...(displayResult.data || []), ...(nameResult.data || [])]
      const unique = Array.from(new Map(merged.map(person => [person.id, person])).values())
      setResults(unique.slice(0, 12))
    }, 250)
    return () => clearTimeout(timer)
  }, [search, userId])

  async function sendRequest(targetId) {
    const { error } = await supabase.from('friendships').insert({ user_id: userId, friend_id: targetId, status: 'pending' })
    if (error) setNotice(error.code === '23505' ? 'A request already exists.' : error.message)
    else {
      const senderName = profileName(profile) || user.email?.split('@')[0] || 'A StudyVerse member'
      const { error: notificationError } = await supabase.from('notifications').insert({
        user_id: targetId,
        type: 'friend_request',
        title: 'New friend request',
        message: `${senderName} sent you a friend request.`,
        link: '/friends',
        actor_id: userId,
        metadata: { requester_id: userId },
      })
      if (notificationError) console.error('Friend request notification failed:', notificationError.message)
      setNotice('Friend request sent.'); setSearch(''); setResults([])
    }
  }

  async function respond(id, status) {
    const { data: request } = await supabase.from('friendships').select('id,user_id,friend_id').eq('id', id).eq('friend_id', userId).maybeSingle()
    const { error } = await supabase.from('friendships').update({ status }).eq('id', id).eq('friend_id', userId)
    if (error) setNotice(error.message)
    else {
      if (status === 'accepted' && request?.user_id) {
        const accepterName = profileName(profile) || user.email?.split('@')[0] || 'A StudyVerse member'
        const { error: notificationError } = await supabase.from('notifications').insert({
          user_id: request.user_id,
          type: 'friend_request',
          title: 'Friend request accepted',
          message: `${accepterName} accepted your friend request.`,
          link: '/friends',
          actor_id: userId,
          metadata: { friendship_id: id },
        })
        if (notificationError) console.error('Friend accepted notification failed:', notificationError.message)
      }
      setNotice(status === 'accepted' ? 'Friend added.' : 'Request declined.'); await loadSocial()
    }
  }

  async function saveNickname(row) {
    const value = nickname.trim() || null
    const { error } = await supabase.from('friendships').update({ nickname: value }).eq('id', row.id)
    if (error) setNotice(error.message); else { setNotice('Nickname saved.'); setNickname(value || ''); await loadSocial() }
  }

  async function openChat(row) {
    const other = friendProfile(row, userId)
    if (!other) return
    setSelected({ ...other, friendshipId: row.id, nickname: row.nickname || '' })
    setNickname(row.nickname || '')
    const { data, error } = await supabase.from('direct_messages').select('*').or(`and(sender_id.eq.${userId},recipient_id.eq.${other.id}),and(sender_id.eq.${other.id},recipient_id.eq.${userId})`).order('created_at', { ascending: true }).limit(100)
    if (error) setNotice(`Chat could not be loaded: ${error.message}`)
    else setMessages(data || [])
  }

  useEffect(() => {
    if (!selected || !userId) return
    const channel = supabase.channel(`dm:${userId}:${selected.id}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'direct_messages' }, payload => {
      const m = payload.new
      if ((m.sender_id === userId && m.recipient_id === selected.id) || (m.sender_id === selected.id && m.recipient_id === userId)) setMessages(prev => prev.some(x => x.id === m.id) ? prev : [...prev, m])
    }).subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [selected?.id, userId])

  async function sendMessage() {
    const body = message.trim()
    if (!body || !selected || !userId) return
    const { error } = await supabase.from('direct_messages').insert({ sender_id: userId, recipient_id: selected.id, body })
    if (error) setNotice(error.message)
    else {
      const senderName = profileName(profile) || user.email?.split('@')[0] || 'A StudyVerse member'
      const { error: notificationError } = await supabase.from('notifications').insert({
        user_id: selected.id,
        type: 'message',
        title: `Message from ${senderName}`,
        message: body.slice(0, 180),
        link: '/friends',
        actor_id: userId,
        metadata: { sender_id: userId },
      })
      if (notificationError) console.error('Direct message notification failed:', notificationError.message)
      setMessage('')
    }
  }

  if (loading) return <div className="sv-page sv-container"><div className="sv-card" style={{padding:32}}>Loading your study circle…</div></div>

  return <div className="sv-page sv-container sv-friends-page">
    <div className="sv-page-header"><div><span className="sv-eyebrow">STUDY TOGETHER</span><h1>Friends</h1><p className="sv-page-subtitle">Build your study circle, keep your connections close, and chat while you learn.</p></div><div className="sv-profile-mini"><span>{profile?.avatar_emoji || '👤'}</span><div><strong>{profileName(profile)}</strong><small>@{profileUsername(profile)}</small></div></div></div>

    {notice && <button className="sv-social-notice" onClick={()=>setNotice('')}>{notice} ×</button>}

    <section className="sv-social-search sv-card"><div><span className="sv-section-label">FIND STUDY PARTNERS</span><h2>Search by name or username</h2></div><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by name or username" aria-label="Search users"/>{search.trim().length >= 2 && !notice && results.length===0 && <div style={{paddingTop:12,color:'var(--app-muted)',fontSize:12}}>No matching StudyVerse user found. Try their display name or account name.</div>}{results.length>0&&<div className="sv-search-results">{results.map(person=>{const existing=acceptedIds.has(person.id);return <div className="sv-person-row" key={person.id}><Avatar person={person}/><div className="sv-person-info"><strong>{profileName(person)}</strong><small>@{profileUsername(person)} · {profileStatus(person)}</small></div><button className="sv-primary-button" disabled={existing} onClick={()=>sendRequest(person.id)}>{existing?'Friends':'Add friend'}</button></div>})}</div>}</section>

    {requests.length>0&&<section className="sv-card"><div className="sv-section-head"><div><span className="sv-section-label">PENDING</span><h2>Friend requests <span className="sv-count">{requests.length}</span></h2></div></div><div className="sv-people-list">{requests.map(req=><div className="sv-person-row" key={req.id}><Avatar person={req.user}/><div className="sv-person-info"><strong>{profileName(req.user)}</strong><small>@{profileUsername(req.user)} · {profileStatus(req.user)}</small></div><div className="sv-request-actions"><button className="sv-primary-button" onClick={()=>respond(req.id,'accepted')}>Accept</button><button onClick={()=>respond(req.id,'declined')}>Decline</button></div></div>)}</div></section>}

    <section className="sv-friends-layout"><div className="sv-card"><div className="sv-section-head"><div><span className="sv-section-label">YOUR STUDY CIRCLE</span><h2>{friends.length} friend{friends.length===1?'':'s'}</h2></div></div>{friends.length===0?<div className="sv-empty-social"><span>👥</span><strong>Your study circle is empty</strong><p>Search for a classmate or friend above to start building it.</p></div>:<div className="sv-people-list">{friends.map(row=>{const person=friendProfile(row,userId);return <button className={`sv-person-row sv-friend-button ${selected?.id===person?.id?'selected':''}`} key={row.id} onClick={()=>openChat(row)}><Avatar person={person}/><div className="sv-person-info"><strong>{row.nickname || profileName(person)}</strong><small>@{profileUsername(person)} · <i className={`sv-status-dot ${profileStatus(person)==='Studying'?'online':''}`}></i>{profileStatus(person)}</small></div><span className="sv-chat-arrow">Chat →</span></button>})}</div>}</div>

    {selected?<aside className="sv-chat-panel sv-card"><div className="sv-chat-header"><Avatar person={selected}/><div><strong>{selected.nickname || profileName(selected)}</strong><small>@{profileUsername(selected)} · {profileStatus(selected)}</small></div><button onClick={()=>setSelected(null)} aria-label="Close chat">×</button></div><div className="sv-nickname"><label>Nickname for this friend<input value={nickname} onChange={e=>setNickname(e.target.value)} onBlur={()=>saveNickname(selected)} placeholder="e.g. Study Buddy"/></label></div><div className="sv-messages">{messages.length===0?<div className="sv-chat-empty">No messages yet.<br/>Say hello and start studying together.</div>:messages.map(m=><div className={`sv-message ${m.sender_id===userId?'mine':''}`} key={m.id}><span>{m.body}</span><small>{new Date(m.created_at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</small></div>)}</div><div className="sv-message-compose"><input value={message} onChange={e=>setMessage(e.target.value)} onKeyDown={e=>e.key==='Enter'&&sendMessage()} placeholder="Write a message…"/><button className="sv-primary-button" onClick={sendMessage}>Send</button></div></aside>:<aside className="sv-social-side sv-card"><span>💬</span><h2>Private study chat</h2><p>Select a friend to open a realtime conversation. You can also give each friend your own nickname.</p></aside>}
    </section>
  </div>
}

function Avatar({person}) { return person?.avatar_url ? <img className="sv-avatar" src={person.avatar_url} alt=""/> : <span className="sv-avatar sv-avatar-emoji">{person?.avatar_emoji || initials(person)}</span> }
