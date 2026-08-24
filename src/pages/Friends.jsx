import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import '../styles/chat.css'

const F = 'id,name,display_name,avatar_url,avatar_emoji,bio'
const nm = (p) => p?.display_name || p?.name || 'StudyVerse member'
const av = (p) => p?.avatar_url
  ? <img className="sv-avatar" src={p.avatar_url} alt="" />
  : <span className="sv-avatar sv-avatar-emoji">{p?.avatar_emoji || nm(p).slice(0, 1)}</span>

const ATTACHMENT_PREFIX = '__SV_ATTACHMENT__'

function attachmentFrom(message) {
  const raw = message?.body || message?.message || ''
  if (!raw.startsWith(ATTACHMENT_PREFIX)) return null
  try { return JSON.parse(raw.slice(ATTACHMENT_PREFIX.length)) } catch { return null }
}

export default function Friends() {
  const { user } = useAuth()
  const uid = user?.id
  const [profile, setProfile] = useState(null)
  const [friends, setFriends] = useState([])
  const [requests, setRequests] = useState([])
  const [search, setSearch] = useState('')
  const [results, setResults] = useState([])
  const [selected, setSelected] = useState(null)
  const [messages, setMessages] = useState([])
  const [hidden, setHidden] = useState(new Set())
  const [text, setText] = useState('')
  const [editing, setEditing] = useState(null)
  const [editText, setEditText] = useState('')
  const [menu, setMenu] = useState(null)
  const [deleteMenu, setDeleteMenu] = useState(null)
  const [chatMenu, setChatMenu] = useState(false)
  const [nickname, setNickname] = useState('')
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef()
  const cameraRef = useRef()

  const accepted = useMemo(
    () => new Set(friends.map(r => r.user_id === uid ? r.friend_id : r.user_id)),
    [friends, uid]
  )

  async function load() {
    if (!uid) return
    setLoading(true)
    const [a, b] = await Promise.all([
      supabase.from('profiles').select(F).eq('id', uid).maybeSingle(),
      supabase.from('friendships').select('id,user_id,friend_id,status,nickname,created_at').or(`user_id.eq.${uid},friend_id.eq.${uid}`).order('created_at', { ascending: false })
    ])
    if (a.data) setProfile(a.data)
    if (b.error) { setNotice(b.error.message); setLoading(false); return }
    const ids = [...new Set((b.data || []).flatMap(r => [r.user_id, r.friend_id]).filter(Boolean))]
    const p = ids.length ? await supabase.from('profiles').select(F).in('id', ids) : { data: [] }
    const map = new Map((p.data || []).map(x => [x.id, x]))
    const rows = (b.data || []).map(r => ({ ...r, user: map.get(r.user_id), friend: map.get(r.friend_id) }))
    setFriends(rows.filter(r => r.status === 'accepted'))
    setRequests(rows.filter(r => r.friend_id === uid && r.status === 'pending'))
    setLoading(false)
  }

  useEffect(() => { load() }, [uid])

  useEffect(() => {
    const q = search.trim().replace(/[%_]/g, '')
    if (q.length < 2 || !uid) { setResults([]); return }
    const t = setTimeout(async () => {
      const [a, b] = await Promise.all([
        supabase.from('profiles').select(F).neq('id', uid).ilike('display_name', `%${q}%`).limit(12),
        supabase.from('profiles').select(F).neq('id', uid).ilike('name', `%${q}%`).limit(12)
      ])
      if (a.error || b.error) { setNotice((a.error || b.error).message); return }
      setResults([...new Map([...(a.data || []), ...(b.data || [])].map(x => [x.id, x])).values()])
    }, 250)
    return () => clearTimeout(t)
  }, [search, uid])

  async function request(id) {
    const { error } = await supabase.from('friendships').insert({ user_id: uid, friend_id: id, status: 'pending' })
    if (error) { setNotice(error.message); return }
    await supabase.from('notifications').insert({ user_id: id, type: 'friend_request', title: 'New friend request', message: `${nm(profile)} sent you a friend request.`, link: '/friends', actor_id: uid, metadata: { requester_id: uid } })
    setSearch(''); setResults([]); load()
  }

  async function respond(id, status) {
    const { data: r } = await supabase.from('friendships').select('user_id').eq('id', id).eq('friend_id', uid).maybeSingle()
    const { error } = await supabase.from('friendships').update({ status }).eq('id', id).eq('friend_id', uid)
    if (error) { setNotice(error.message); return }
    if (status === 'accepted' && r?.user_id) await supabase.from('notifications').insert({ user_id: r.user_id, type: 'friend_request', title: 'Friend request accepted', message: `${nm(profile)} accepted your request.`, link: '/friends', actor_id: uid, metadata: { friendship_id: id } })
    load()
  }

  async function open(row) {
    const p = row.user_id === uid ? row.friend : row.user
    if (!p) return
    setSelected({ ...p, friendshipId: row.id, nickname: row.nickname || '' })
    setNickname(row.nickname || '')
    setMenu(null); setDeleteMenu(null); setChatMenu(false)
    const { data, error } = await supabase.from('direct_messages').select('*').or(`and(sender_id.eq.${uid},recipient_id.eq.${p.id}),and(sender_id.eq.${p.id},recipient_id.eq.${uid})`).order('created_at')
    if (error) setNotice(error.message); else setMessages(data || [])
    const { data: h } = await supabase.from('message_hides').select('message_id').eq('user_id', uid)
    setHidden(new Set((h || []).map(x => x.message_id)))
  }

  useEffect(() => {
    if (!selected || !uid) return
    const c = supabase.channel(`dm:${uid}:${selected.id}`).on('postgres_changes', { event: '*', schema: 'public', table: 'direct_messages' }, p => {
      if (p.eventType === 'DELETE') { setMessages(x => x.filter(a => a.id !== p.old.id)); return }
      const m = p.new
      if (!m || !((m.sender_id === uid && m.recipient_id === selected.id) || (m.sender_id === selected.id && m.recipient_id === uid))) return
      setMessages(x => [...x.filter(a => a.id !== m.id), m].sort((a, b) => new Date(a.created_at) - new Date(b.created_at)))
    }).subscribe()
    return () => supabase.removeChannel(c)
  }, [selected?.id, uid])

  async function send(body = text, att = null) {
    if (!selected || !uid || (!body.trim() && !att)) return
    const payload = att
      ? `${ATTACHMENT_PREFIX}${JSON.stringify(att)}`
      : body.trim()
    const { error } = await supabase.from('direct_messages').insert({ sender_id: uid, recipient_id: selected.id, body: payload, message: payload })
    if (error) { setNotice(error.message); return }
    await supabase.from('notifications').insert({ user_id: selected.id, type: 'message', title: `Message from ${nm(profile)}`, message: att ? `Sent ${att.name || 'an attachment'}` : body.trim().slice(0, 180), link: '/friends', actor_id: uid, metadata: { sender_id: uid } })
    setText('')
  }

  async function upload(file) {
    if (!file) return
    setUploading(true)
    const ext = (file.name.split('.').pop() || 'bin').toLowerCase()
    const path = `${uid}/dm-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const u = await supabase.storage.from('studyverse-chat').upload(path, file)
    if (u.error) { setNotice(u.error.message); setUploading(false); return }
    const s = await supabase.storage.from('studyverse-chat').createSignedUrl(path, 60 * 60 * 24 * 30)
    if (s.error) { setNotice(s.error.message); setUploading(false); return }
    await send('', { url: s.data.signedUrl, name: file.name, type: file.type || 'application/octet-stream' })
    setUploading(false)
  }

  async function edit(m) {
    setMenu(null); setDeleteMenu(null); setEditing(m.id); setEditText(m.body || m.message || '')
  }

  async function saveEdit(m) {
    const v = editText.trim()
    if (!v) return
    const { error } = await supabase.from('direct_messages').update({ body: v, message: v }).eq('id', m.id).eq('sender_id', uid)
    if (error) setNotice(`Edit failed: ${error.message}`)
    else { setMessages(x => x.map(a => a.id === m.id ? { ...a, body: v, message: v } : a)); setEditing(null); setEditText('') }
  }

  async function deleteForMe(m) {
    setDeleteMenu(null); setMenu(null)
    const { error } = await supabase.from('message_hides').upsert({ message_id: m.id, user_id: uid }, { onConflict: 'message_id,user_id' })
    if (error) setNotice(`Delete for me failed: ${error.message}`)
    else setHidden(h => new Set([...h, m.id]))
  }

  async function deleteForEveryone(m) {
    setDeleteMenu(null); setMenu(null)
    if (m.sender_id !== uid) return
    const { error } = await supabase.from('direct_messages').delete().eq('id', m.id).eq('sender_id', uid)
    if (error) setNotice(`Delete for everyone failed: ${error.message}`)
    else setMessages(x => x.filter(a => a.id !== m.id))
  }

  async function saveNick() {
    if (!selected) return
    const value = nickname.trim() || null
    const { error } = await supabase.from('friendships').update({ nickname: value }).eq('id', selected.friendshipId)
    if (error) { setNotice(error.message); return }
    setSelected(s => s ? { ...s, nickname: value || '' } : s)
    setChatMenu(false)
    load()
  }

  if (loading) return <div className="sv-page sv-container"><div className="sv-card">Loading your study circle…</div></div>

  return <div className="sv-page sv-container sv-friends-page">
    <div className="sv-page-header">
      <div><span className="sv-eyebrow">STUDY TOGETHER</span><h1>Friends</h1><p className="sv-page-subtitle">Build your study circle and chat while you learn.</p></div>
    </div>

    {notice && <button className="sv-social-notice" onClick={() => setNotice('')}>{notice} ×</button>}

    <section className="sv-social-search sv-card">
      <span className="sv-section-label">FIND STUDY PARTNERS</span>
      <h2>Search by name or username</h2>
      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or username" />
      {results.map(p => <div className="sv-person-row" key={p.id}>{av(p)}<div className="sv-person-info"><strong>{nm(p)}</strong><small>@{p.name}</small></div><button disabled={accepted.has(p.id)} onClick={() => request(p.id)}>{accepted.has(p.id) ? 'Friends' : 'Add friend'}</button></div>)}
    </section>

    {requests.length > 0 && <section className="sv-card"><span className="sv-section-label">PENDING</span><h2>Friend requests</h2>{requests.map(r => <div className="sv-person-row" key={r.id}>{av(r.user)}<div className="sv-person-info"><strong>{nm(r.user)}</strong><small>@{r.user?.name}</small></div><button onClick={() => respond(r.id, 'accepted')}>Accept</button><button onClick={() => respond(r.id, 'declined')}>Decline</button></div>)}</section>}

    <section className="sv-friends-layout">
      <div className="sv-card">
        <span className="sv-section-label">YOUR STUDY CIRCLE</span>
        <h2>{friends.length} friend{friends.length === 1 ? '' : 's'}</h2>
        {friends.map(r => {
          const p = r.user_id === uid ? r.friend : r.user
          return <button className={`sv-person-row sv-friend-button ${selected?.id === p?.id ? 'selected' : ''}`} key={r.id} onClick={() => open(r)}>{av(p)}<div className="sv-person-info"><strong>{r.nickname || nm(p)}</strong><small>@{p?.name}</small></div><span>Chat →</span></button>
        })}
        {!friends.length && <div className="sv-empty-social">👥 Your study circle is empty</div>}
      </div>

      {selected && <aside className="sv-chat-panel sv-card">
        <div className="sv-chat-header">
          {av(selected)}
          <div><strong>{selected.nickname || nm(selected)}</strong><small>@{selected.name}</small></div>
          <div className="sv-chat-header-menu">
            <button aria-label="Chat options" title="Chat options" onClick={() => setChatMenu(v => !v)}><span className="sv-dots-icon"><i></i><i></i><i></i></span></button>
            {chatMenu && <div className="sv-chat-header-menu-panel">
              <button onClick={() => { setNickname(selected.nickname || ''); setChatMenu(false); setTimeout(() => document.getElementById('sv-nickname-dialog')?.showModal(), 0) }}>✏️ Nickname</button>
              <button onClick={() => { setChatMenu(false); setSelected(null) }}>✕ Close chat</button>
            </div>}
          </div>
        </div>

        <dialog id="sv-nickname-dialog" className="sv-nickname-dialog">
          <form method="dialog" onSubmit={e => { e.preventDefault(); saveNick(); document.getElementById('sv-nickname-dialog')?.close() }}>
            <h3>Set nickname</h3>
            <p>Choose how this friend appears in your StudyVerse chat.</p>
            <input autoFocus value={nickname} onChange={e => setNickname(e.target.value)} placeholder="Nickname" />
            <div><button type="button" onClick={() => document.getElementById('sv-nickname-dialog')?.close()}>Cancel</button><button type="submit">Save</button></div>
          </form>
        </dialog>

        <div className="sv-messages">
          {messages.filter(m => !hidden.has(m.id)).map(m => {
            const att = attachmentFrom(m)
            return <div className={`sv-message ${m.sender_id === uid ? 'mine' : ''}`} key={m.id}>
              <div className="sv-message-bubble">
                <small>{m.sender_id === uid ? 'You' : nm(selected)}</small>
                {editing === m.id ? <div className="sv-inline-edit"><input value={editText} onChange={e => setEditText(e.target.value)} onKeyDown={e => e.key === 'Enter' && saveEdit(m)} /><button onClick={() => saveEdit(m)}>Save</button></div> : <>
                  {att ? <a className="sv-chat-attachment" href={att.url} target="_blank" rel="noreferrer">📎 {att.name || 'Open attachment'}</a> : <span>{m.body || m.message}</span>}
                  <button className="sv-message-menu-button" aria-label="Message options" onClick={() => { setMenu(menu === m.id ? null : m.id); setDeleteMenu(null) }}><span className="sv-dots-icon"><i></i><i></i><i></i></span></button>
                  {menu === m.id && <div className="sv-message-menu">
                    {m.sender_id === uid && <button onClick={() => edit(m)}>Edit</button>}
                    <button onClick={() => setDeleteMenu(deleteMenu === m.id ? null : m.id)}>Delete</button>
                    {deleteMenu === m.id && <div className="sv-delete-submenu"><button onClick={() => deleteForMe(m)}>Delete for me</button>{m.sender_id === uid && <button onClick={() => deleteForEveryone(m)}>Delete for everyone</button>}</div>}
                  </div>}
                </>}
              </div>
            </div>
          })}
        </div>

        <div className="sv-chat-tools">
          <button title="Take photo" aria-label="Take photo" onClick={() => cameraRef.current?.click()}>📷</button>
          <button title="Attach any file" aria-label="Attach any file" onClick={() => fileRef.current?.click()}>📎</button>
          <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={e => upload(e.target.files?.[0])} />
          <input ref={fileRef} type="file" hidden onChange={e => upload(e.target.files?.[0])} />
          <input value={text} onChange={e => setText(e.target.value)} placeholder="Message..." onKeyDown={e => e.key === 'Enter' && send()} />
          <button disabled={uploading || !text.trim()} onClick={() => send()}>{uploading ? 'Uploading…' : 'Send'}</button>
        </div>
      </aside>}
    </section>
  </div>
}
