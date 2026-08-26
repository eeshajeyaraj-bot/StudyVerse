import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import RoomView from '../components/RoomView'

function randomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export default function Rooms() {
  const [userId, setUserId] = useState(null)
  const [displayName, setDisplayName] = useState('Scholar')
  const [view, setView] = useState('home')
  const [activeRoomId, setActiveRoomId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [roomName, setRoomName] = useState('')
  const [roomSubject, setRoomSubject] = useState('General')
  const [roomDescription, setRoomDescription] = useState('')
  const [maxMembers, setMaxMembers] = useState(5)
  const [creating, setCreating] = useState(false)
  const [joinCode, setJoinCode] = useState('')
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function getUserAndRestoreRoom() {
      const { data } = await supabase.auth.getUser(); const user = data?.user
      if (!user) { setLoading(false); return }
      const id = user.id; setUserId(id); setDisplayName(user.user_metadata?.display_name || user.email?.split('@')[0] || 'Scholar')
      const storageKey = `studyverse_active_room_${id}`; const savedRoomId = window.localStorage.getItem(storageKey)
      if (savedRoomId) {
        const { data: membership } = await supabase.from('room_members').select('room_id, study_rooms!inner(id, is_active)').eq('room_id', savedRoomId).eq('user_id', id).eq('study_rooms.is_active', true).maybeSingle()
        if (membership?.room_id) { setActiveRoomId(membership.room_id); setView('room') } else window.localStorage.removeItem(storageKey)
      }
      setLoading(false)
    }
    getUserAndRestoreRoom()
  }, [])

  function persistActiveRoom(roomId) { if (userId && roomId) window.localStorage.setItem(`studyverse_active_room_${userId}`, roomId) }

  async function handleCreate() {
    if (!roomName.trim()) return setError('Give your room a name.')
    if (!userId) return setError('You must be signed in to create a room.')
    setCreating(true); setError('')
    for (let attempt = 0; attempt < 3; attempt++) {
      const code = randomCode()
      const { data: room, error: roomError } = await supabase.from('study_rooms').insert({ room_name: roomName.trim(), room_code: code, host_id: userId, max_members: maxMembers, subject: roomSubject.trim() || 'General', description: roomDescription.trim() }).select().single()
      if (roomError) { if (roomError.code === '23505') continue; setError(roomError.message); setCreating(false); return }
      const { error: memberError } = await supabase.from('room_members').insert({ room_id: room.id, user_id: userId, display_name: displayName, status: 'studying' })
      if (memberError) { setError(memberError.message); setCreating(false); return }
      const { error: historyError } = await supabase.from('room_history').insert({ host_id: userId, room_id: room.id, room_name: room.room_name, room_code: room.room_code })
      if (historyError) setError(`Room created, but history could not be saved: ${historyError.message}`)
      setRoomName(''); setRoomDescription(''); setRoomSubject('General'); setCreating(false); setActiveRoomId(room.id); persistActiveRoom(room.id); setView('room'); return
    }
    setError('Could not generate a unique room code. Please try again.'); setCreating(false)
  }

  async function handleJoin() {
    const code = joinCode.trim().toUpperCase()
    if (code.length !== 6) return setError('Enter the 6-character room code shared by the host.')
    if (!userId) return setError('You must be signed in to join a room.')
    setJoining(true); setError('')
    const { data: room, error: roomError } = await supabase.from('study_rooms').select('*, room_members(count)').eq('room_code', code).eq('is_active', true).single()
    if (roomError || !room) { setError('No active room was found with that code.'); setJoining(false); return }
    if ((room.room_members?.[0]?.count ?? 0) >= room.max_members) { setError('That room is full.'); setJoining(false); return }
    const { error: joinError } = await supabase.from('room_members').upsert({ room_id: room.id, user_id: userId, display_name: displayName, status: 'studying' }, { onConflict: 'room_id,user_id' })
    if (joinError) { setError(joinError.message); setJoining(false); return }
    setJoinCode(''); setJoining(false); setActiveRoomId(room.id); persistActiveRoom(room.id); setView('room')
  }

  function backHome() { if (userId) window.localStorage.removeItem(`studyverse_active_room_${userId}`); setActiveRoomId(null); setView('home'); setError('') }
  if (loading) return <div className="sv-page"><div className="sv-container">Loading rooms...</div></div>

  return <div className="sv-page"><div className="sv-container" style={{ paddingTop: '34px' }}>
    {view === 'room' && activeRoomId ? <RoomView roomId={activeRoomId} userId={userId} onLeft={backHome} /> : <>
      <div style={styles.header}><div><p style={styles.label}>Study Together</p><h1 style={styles.title}>Study <span style={styles.accent}>Rooms</span></h1><p style={styles.subtitle}>Subject-based collaborative rooms with focused sessions, chat, resources and study tools.</p></div></div>
      {view === 'home' && <div style={styles.grid}>
        <button className="sv-card sv-room-choice" onClick={() => { setView('create'); setError('') }}><span className="sv-room-choice-icon">🏠</span><strong className="sv-room-choice-title">Create a Study Room</strong><span className="sv-room-choice-text">Tag it with a subject so other students can discover it.</span></button>
        <button className="sv-card sv-room-choice" onClick={() => { setView('join'); setError('') }}><span className="sv-room-choice-icon">🔐</span><strong className="sv-room-choice-title">Join with Code</strong><span className="sv-room-choice-text">Enter the exact 6-character invite code from a host.</span></button>
      </div>}
      {view === 'create' && <div className="sv-card" style={{ maxWidth: 560 }}><p className="sv-section-label">Create Study Room</p><p style={styles.helper}>Choose a subject and a short description. Members can use the room's study tools after joining.</p><div style={styles.form}>
        <input value={roomName} onChange={e => setRoomName(e.target.value)} placeholder="Room name" maxLength={40}/><input value={roomSubject} onChange={e => setRoomSubject(e.target.value)} placeholder="Subject / topic (e.g. Data Structures)" maxLength={40}/><textarea value={roomDescription} onChange={e => setRoomDescription(e.target.value)} placeholder="What are you studying here?" maxLength={180} rows={3}/><select value={maxMembers} onChange={e => setMaxMembers(Number(e.target.value))}>{[2,3,4,5,6,8].map(n => <option key={n} value={n}>{n} members</option>)}</select>{error && <p style={styles.error}>{error}</p>}<button className="sv-btn-primary" onClick={handleCreate} disabled={creating}>{creating ? 'Creating...' : 'Create Study Room'}</button>
      </div></div>}
      {view === 'join' && <div className="sv-card" style={{ maxWidth: 520 }}><p className="sv-section-label">Join Private Room</p><p style={styles.helper}>You can join with the host's 6-character code, or discover an active subject room below.</p><div style={styles.form}><input value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,6))} placeholder="ENTER CODE" maxLength={6} autoComplete="off" style={styles.code} onKeyDown={e => e.key === 'Enter' && handleJoin()}/>{error && <p style={styles.error}>{error}</p>}<button className="sv-btn-primary" onClick={handleJoin} disabled={joining || joinCode.length !== 6}>{joining ? 'Checking code...' : 'Join with Code'}</button></div></div>}
    </>}
  </div></div>
}

const styles = { header:{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:16,marginBottom:34}, label:{fontSize:13,color:'var(--app-muted)',marginBottom:6,fontWeight:600,letterSpacing:'.2px'}, title:{fontSize:34,fontWeight:750,color:'var(--app-text)',lineHeight:1.15,letterSpacing:'-.7px'}, accent:{color:'var(--app-accent)'}, subtitle:{marginTop:11,color:'var(--app-muted)',maxWidth:650,lineHeight:1.6,fontSize:14}, grid:{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:20,maxWidth:900}, helper:{fontSize:13,color:'var(--app-muted)',lineHeight:1.5,margin:'8px 0 18px'}, form:{display:'flex',flexDirection:'column',gap:12}, code:{textTransform:'uppercase',letterSpacing:6,textAlign:'center',fontWeight:700}, error:{fontSize:13,color:'#f87171'}}
