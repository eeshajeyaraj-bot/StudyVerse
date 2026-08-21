import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

function initials(profile) { return (profile?.display_name || profile?.username || 'U').trim().slice(0, 1).toUpperCase() }
function friendProfile(row, userId) { return row.requester_id === userId ? row.recipient : row.requester }

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
    const [{ data: me }, { data: rows }, { data: pending }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
      supabase.from('friendships').select('id,requester_id,recipient_id,status,nickname,created_at,requester:profiles!friendships_requester_id_fkey(id,display_name,username,bio,study_goal,profile_picture_url,emoji_avatar,status),recipient:profiles!friendships_recipient_id_fkey(id,display_name,username,bio,study_goal,profile_picture_url,emoji_avatar,status)').or(`requester_id.eq.${userId},recipient_id.eq.${userId}`).order('updated_at', { ascending: false }),
      supabase.from('friendships').select('id,requester_id,status,created_at,requester:profiles!friendships_requester_id_fkey(id,display_name,username,bio,study_goal,profile_picture_url,emoji_avatar,status)').eq('recipient_id', userId).eq('status', 'pending').order('created_at', { ascending: false }),
    ])
    if (me) setProfile(me)
    setFriends((rows || []).filter(r => r.status === 'accepted'))
    setRequests(pending || [])
    setLoading(false)
  }

  useEffect(() => { loadSocial() }, [userId])

  useEffect(() => {
    if (!userId) return
    const channel = supabase.channel(`social:${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friendships', filter: `recipient_id=eq.${userId}` }, loadSocial)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friendships', filter: `requester_id=eq.${userId}` }, loadSocial)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [userId])

  useEffect(() => {
    const q = search.trim().toLowerCase()
    if (!q || q.length < 2 || !userId) { setResults([]); return }
    const timer = setTimeout(async () => {
      const { data } = await supabase.from('profiles').select('id,display_name,username,bio,study_goal,profile_picture_url,emoji_avatar,status').neq('id', userId).or(`username.ilike.%${q}%,display_name.ilike.%${q}%`).limit(12)
      setResults(data || [])
    }, 250)
    return () => clearTimeout(timer)
  }, [search, userId])

  async function sendRequest(targetId) {
    const { error } = await supabase.from('friendships').insert({ requester_id: userId, recipient_id: targetId })
    if (error) setNotice(error.code === '23505' ? 'A request already exists.' : error.message)
    else { setNotice('Friend request sent.'); setSearch(''); setResults([]) }
  }

  async function respond(id, status) {
    const { error } = await supabase.from('friendships').update({ status }).eq('id', id).eq('recipient_id', userId)
    if (error) setNotice(error.message); else { setNotice(status === 'accepted' ? 'Friend added.' : 'Request declined.'); await loadSocial() }
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
    if (!error) setMessages(data || [])
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
    if (error) setNotice(error.message); else setMessage('')
  }

  if (loading) return <div className="sv-page sv-container"><div className="sv-card" style={{padding:32}}>Loading your study circle…</div></div>

  return <div className="sv-page sv-container sv-friends-page">
    <div className="sv-page-header"><div><span className="sv-eyebrow">STUDY TOGETHER</span><h1>Friends</h1><p className="sv-page-subtitle">Build your study circle, keep your connections close, and chat while you learn.</p></div><div className="sv-profile-mini"><span>{profile?.emoji_avatar || '👤'}</span><div><strong>{profile?.display_name || 'StudyVerse member'}</strong><small>@{profile?.username || 'student'}</small></div></div></div>

    {notice && <button className="sv-social-notice" onClick={()=>setNotice('')}>{notice} ×</button>}

    <section className="sv-social-search sv-card"><div><span className="sv-section-label">FIND STUDY PARTNERS</span><h2>Search by name or username</h2></div><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search e.g. eesha_studies" aria-label="Search users"/>{results.length>0&&<div className="sv-search-results">{results.map(person=>{const existing=acceptedIds.has(person.id);return <div className="sv-person-row" key={person.id}><Avatar person={person}/><div className="sv-person-info"><strong>{person.display_name}</strong><small>@{person.username || 'student'} · {person.status}</small></div><button className="sv-primary-button" disabled={existing} onClick={()=>sendRequest(person.id)}>{existing?'Friends':'Add friend'}</button></div>})}</div>}</section>

    {requests.length>0&&<section className="sv-card"><div className="sv-section-head"><div><span className="sv-section-label">PENDING</span><h2>Friend requests <span className="sv-count">{requests.length}</span></h2></div></div><div className="sv-people-list">{requests.map(req=><div className="sv-person-row" key={req.id}><Avatar person={req.requester}/><div className="sv-person-info"><strong>{req.requester?.display_name}</strong><small>@{req.requester?.username || 'student'} · {req.requester?.status || 'Available'}</small></div><div className="sv-request-actions"><button className="sv-primary-button" onClick={()=>respond(req.id,'accepted')}>Accept</button><button onClick={()=>respond(req.id,'declined')}>Decline</button></div></div>)}</div></section>}

    <section className="sv-friends-layout"><div className="sv-card"><div className="sv-section-head"><div><span className="sv-section-label">YOUR STUDY CIRCLE</span><h2>{friends.length} friend{friends.length===1?'':'s'}</h2></div></div>{friends.length===0?<div className="sv-empty-social"><span>👥</span><strong>Your study circle is empty</strong><p>Search for a classmate or friend above to start building it.</p></div>:<div className="sv-people-list">{friends.map(row=>{const person=friendProfile(row,userId);return <button className={`sv-person-row sv-friend-button ${selected?.id===person?.id?'selected':''}`} key={row.id} onClick={()=>openChat(row)}><Avatar person={person}/><div className="sv-person-info"><strong>{row.nickname || person?.display_name}</strong><small>@{person?.username || 'student'} · <i className={`sv-status-dot ${person?.status==='Studying'?'online':''}`}></i>{person?.status || 'Available'}</small></div><span className="sv-chat-arrow">Chat →</span></button>})}</div>}</div>

    {selected?<aside className="sv-chat-panel sv-card"><div className="sv-chat-header"><Avatar person={selected}/><div><strong>{selected.nickname || selected.display_name}</strong><small>@{selected.username || 'student'} · {selected.status || 'Available'}</small></div><button onClick={()=>setSelected(null)} aria-label="Close chat">×</button></div><div className="sv-nickname"><label>Nickname for this friend<input value={nickname} onChange={e=>setNickname(e.target.value)} onBlur={()=>saveNickname(selected)} placeholder="e.g. Study Buddy"/></label></div><div className="sv-messages">{messages.length===0?<div className="sv-chat-empty">No messages yet.<br/>Say hello and start studying together.</div>:messages.map(m=><div className={`sv-message ${m.sender_id===userId?'mine':''}`} key={m.id}><span>{m.body}</span><small>{new Date(m.created_at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</small></div>)}</div><div className="sv-message-compose"><input value={message} onChange={e=>setMessage(e.target.value)} onKeyDown={e=>e.key==='Enter'&&sendMessage()} placeholder="Write a message…"/><button className="sv-primary-button" onClick={sendMessage}>Send</button></div></aside>:<aside className="sv-social-side sv-card"><span>💬</span><h2>Private study chat</h2><p>Select a friend to open a realtime conversation. You can also give each friend your own nickname.</p></aside>}
    </section>
  </div>
}

function Avatar({person}) { return person?.profile_picture_url ? <img className="sv-avatar" src={person.profile_picture_url} alt=""/> : <span className="sv-avatar sv-avatar-emoji">{person?.emoji_avatar || initials(person)}</span> }
