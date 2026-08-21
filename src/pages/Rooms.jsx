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
  const [maxMembers, setMaxMembers] = useState(5)
  const [creating, setCreating] = useState(false)
  const [joinCode, setJoinCode] = useState('')
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function getUser() {
      const { data } = await supabase.auth.getUser()
      if (data?.user) {
        setUserId(data.user.id)
        setDisplayName(data.user.email?.split('@')[0] || 'Scholar')
      }
      setLoading(false)
    }
    getUser()
  }, [])

  async function handleCreate() {
    if (!roomName.trim()) return setError('Give your room a name.')
    if (!userId) return setError('You must be signed in to create a room.')
    setCreating(true)
    setError('')

    for (let attempt = 0; attempt < 3; attempt++) {
      const code = randomCode()
      const { data: room, error: roomError } = await supabase
        .from('study_rooms')
        .insert({ room_name: roomName.trim(), room_code: code, host_id: userId, max_members: maxMembers })
        .select()
        .single()

      if (roomError) {
        if (roomError.code === '23505') continue
        setError(roomError.message)
        setCreating(false)
        return
      }

      const { error: memberError } = await supabase.from('room_members').insert({
        room_id: room.id, user_id: userId, display_name: displayName, status: 'studying',
      })

      if (memberError) {
        setError(memberError.message)
        setCreating(false)
        return
      }

      setRoomName('')
      setCreating(false)
      setActiveRoomId(room.id)
      setView('room')
      return
    }

    setError('Could not generate a unique room code. Please try again.')
    setCreating(false)
  }

  async function handleJoin() {
    const code = joinCode.trim().toUpperCase()
    if (code.length !== 6) return setError('Enter the 6-character room code shared by the host.')
    if (!userId) return setError('You must be signed in to join a room.')

    setJoining(true)
    setError('')

    const { data: room, error: roomError } = await supabase
      .from('study_rooms')
      .select('*, room_members(count)')
      .eq('room_code', code)
      .eq('is_active', true)
      .single()

    if (roomError || !room) {
      setError('No active room was found with that code.')
      setJoining(false)
      return
    }

    const count = room.room_members?.[0]?.count ?? 0
    if (count >= room.max_members) {
      setError('That room is full.')
      setJoining(false)
      return
    }

    const { error: joinError } = await supabase.from('room_members').upsert(
      { room_id: room.id, user_id: userId, display_name: displayName, status: 'studying' },
      { onConflict: 'room_id,user_id' }
    )

    if (joinError) {
      setError(joinError.message)
      setJoining(false)
      return
    }

    setJoinCode('')
    setJoining(false)
    setActiveRoomId(room.id)
    setView('room')
  }

  function backHome() {
    setActiveRoomId(null)
    setView('home')
    setError('')
  }

  if (loading) return <div className="sv-page"><div className="sv-container">Loading rooms...</div></div>

  return (
    <div className="sv-page">
      <div className="sv-container" style={{ paddingTop: '34px' }}>
        {view === 'room' && activeRoomId ? (
          <RoomView roomId={activeRoomId} userId={userId} onLeft={backHome} />
        ) : (
          <>
            <div style={styles.header}>
              <div>
                <p style={styles.label}>Study Together</p>
                <h1 style={styles.title}>Study <span style={styles.accent}>Rooms</span></h1>
                <p style={styles.subtitle}>Private study rooms. A room can only be joined with its unique invite code.</p>
              </div>
              {view !== 'home' && <button className="sv-btn-ghost" onClick={backHome}>← Back</button>}
            </div>

            {view === 'home' && (
              <div style={styles.grid}>
                <button className="sv-card sv-room-choice" onClick={() => { setView('create'); setError('') }}>
                  <span className="sv-room-choice-icon">🏰</span>
                  <strong className="sv-room-choice-title">Create a Private Room</strong>
                  <span className="sv-room-choice-text">Create a room and receive a random 6-character invite code.</span>
                </button>
                <button className="sv-card sv-room-choice" onClick={() => { setView('join'); setError('') }}>
                  <span className="sv-room-choice-icon">🔐</span>
                  <strong className="sv-room-choice-title">Join with Code</strong>
                  <span className="sv-room-choice-text">Enter the exact code given to you by the room host.</span>
                </button>
              </div>
            )}

            {view === 'create' && (
              <div className="sv-card" style={{ maxWidth: 520 }}>
                <p className="sv-section-label">Create Private Room</p>
                <p style={styles.helper}>StudyVerse generates the invite code automatically. Only people with that code can join.</p>
                <div style={styles.form}>
                  <input value={roomName} onChange={e => setRoomName(e.target.value)} placeholder="Room name" maxLength={40} onKeyDown={e => e.key === 'Enter' && handleCreate()} />
                  <select value={maxMembers} onChange={e => setMaxMembers(Number(e.target.value))}>
                    {[2, 3, 4, 5, 6, 8].map(n => <option key={n} value={n}>{n} members</option>)}
                  </select>
                  {error && <p style={styles.error}>{error}</p>}
                  <button className="sv-btn-primary" onClick={handleCreate} disabled={creating}>{creating ? 'Creating...' : '🏰 Create Private Room'}</button>
                </div>
              </div>
            )}

            {view === 'join' && (
              <div className="sv-card" style={{ maxWidth: 520 }}>
                <p className="sv-section-label">Join Private Room</p>
                <p style={styles.helper}>There is no public room browser or quick-join button. You need the 6-character invite code.</p>
                <div style={styles.form}>
                  <input value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))} placeholder="ENTER CODE" maxLength={6} autoComplete="off" style={styles.code} onKeyDown={e => e.key === 'Enter' && handleJoin()} />
                  {error && <p style={styles.error}>{error}</p>}
                  <button className="sv-btn-primary" onClick={handleJoin} disabled={joining || joinCode.length !== 6}>{joining ? 'Checking code...' : '🔐 Join with Code'}</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

const styles = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 34 },
  label: { fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 6, fontWeight: 600, letterSpacing: '.2px' },
  title: { fontSize: 34, fontWeight: 750, color: '#f1e8ff', lineHeight: 1.15, letterSpacing: '-.7px' },
  accent: { background: 'linear-gradient(90deg, #f0abfc, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' },
  subtitle: { marginTop: 11, color: 'rgba(255,255,255,0.52)', maxWidth: 650, lineHeight: 1.6, fontSize: 14 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 20, maxWidth: 900 },
  helper: { fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5, margin: '8px 0 18px' },
  form: { display: 'flex', flexDirection: 'column', gap: 12 },
  code: { textTransform: 'uppercase', letterSpacing: 6, textAlign: 'center', fontWeight: 700 },
  error: { fontSize: 13, color: '#f87171' },
}
