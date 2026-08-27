import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function RoomDiscovery({ onJoined }) {
  const [rooms, setRooms] = useState([])
  const [subject, setSubject] = useState('All')
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState('')
  const [message, setMessage] = useState('')

  async function load() {
    setLoading(true)
    const { data, error } = await supabase.from('study_rooms').select('id,room_name,room_code,subject,description,max_members,room_members(count)').eq('is_active', true).order('created_at', { ascending: false }).limit(50)
    if (error) setMessage(`Room discovery needs the latest Supabase migration: ${error.message}`)
    else setMessage('')
    setRooms(data || []); setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function join(room) {
    setJoining(room.id); setMessage('')
    const { data: auth } = await supabase.auth.getUser(); const uid = auth?.user?.id
    if (!uid) { setMessage('Please sign in first.'); setJoining(''); return }
    const count = room.room_members?.[0]?.count || 0
    if (count >= room.max_members) { setMessage('That room is full.'); setJoining(''); return }
    const { error } = await supabase.from('room_members').upsert({ room_id: room.id, user_id: uid, display_name: auth.user.user_metadata?.display_name || auth.user.email?.split('@')[0] || 'StudyVerse member', status: 'studying' }, { onConflict: 'room_id,user_id' })
    if (error) setMessage(error.message)
    else {
      localStorage.setItem(`studyverse_active_room_${uid}`, room.id)
      onJoined?.(room.id)
    }
    setJoining('')
  }

  const subjects = ['All', ...new Set(rooms.map(r => r.subject).filter(Boolean))]
  const visible = subject === 'All' ? rooms : rooms.filter(r => r.subject === subject)
  return <section className="sv-card sv-room-discovery"><div className="sv-room-discovery-head"><div><p className="sv-section-label">DISCOVER</p><h2>Study rooms by subject</h2><p>Find an active room without needing to know its invite code.</p></div><button type="button" onClick={load}>↻ Refresh</button></div><div className="sv-subject-filters">{subjects.map(s => <button type="button" key={s} className={subject === s ? 'active' : ''} onClick={() => setSubject(s)}>{s}</button>)}</div>{message && <div className="sv-room-discovery-message">{message}</div>}{loading ? <p>Loading rooms…</p> : visible.length === 0 ? <p>No public-discovery rooms yet. Create one and tag it with a subject.</p> : <div className="sv-room-discovery-grid">{visible.map(r => <article className="sv-room-discovery-card" key={r.id}><span>{r.subject || 'General'}</span><h3>{r.room_name}</h3><p>{r.description || 'Collaborative study room'}</p><small>{r.room_members?.[0]?.count || 0}/{r.max_members} members</small><button type="button" disabled={joining === r.id} onClick={() => join(r)}>{joining === r.id ? 'Joining…' : 'Join room'}</button></article>)}</div>}</section>
}
