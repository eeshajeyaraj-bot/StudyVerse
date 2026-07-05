import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Navbar from '../components/Navbar'
import RoomView from '../components/RoomView'

function randomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}

export default function Rooms() {
  const [userId, setUserId]           = useState(null)
  const [displayName, setDisplayName] = useState('Scholar')
  const [view, setView]               = useState('browse') // browse | create | join | room
  const [activeRoomId, setActiveRoomId] = useState(null)
  const [openRooms, setOpenRooms]     = useState([])
  const [loading, setLoading]         = useState(true)

  // Create form state
  const [roomName, setRoomName]   = useState('')
  const [maxMembers, setMaxMembers] = useState(5)
  const [creating, setCreating]   = useState(false)

  // Join form state
  const [joinCode, setJoinCode]   = useState('')
  const [joining, setJoining]     = useState(false)

  const [error, setError] = useState('')

  useEffect(() => {
    getUser()
  }, [])

  useEffect(() => {
    if (view === 'browse' && userId) fetchOpenRooms()
  }, [view, userId])

 async function getUser() {
  const { data, error } = await supabase.auth.getUser()

  console.log("USER DATA:", data)
  console.log("USER:", data?.user)
  console.log("ERROR:", error)

  if (data?.user) {
    setUserId(data.user.id)
    setDisplayName(data.user.email?.split("@")[0] || "Scholar")
  }

  setLoading(false)
}

  async function fetchOpenRooms() {
    const { data } = await supabase
      .from('study_rooms')
      .select('id, room_name, room_code, max_members, room_members(count)')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(20)
    setOpenRooms(data || [])
  }

  async function handleCreate() {
    if (!roomName.trim()) { setError('Give your guild a name.'); return }
    setCreating(true)
    setError('')

    for (let attempt = 0; attempt < 3; attempt++) {
      const code = randomCode()
      const { data: newRoom, error: roomErr } = await supabase
        .from('study_rooms')
        .insert({ room_name: roomName.trim(), room_code: code, host_id: userId, max_members: maxMembers })
        .select()
        .single()

      if (roomErr) {
        if (roomErr.code === '23505') continue
        setError(roomErr.message)
        setCreating(false)
        return
      }

      await supabase.from('room_members').insert({
        room_id: newRoom.id, user_id: userId, display_name: displayName, status: 'studying',
      })

      setCreating(false)
      setRoomName('')
      setActiveRoomId(newRoom.id)
      setView('room')
      return
    }
    setError('Could not generate a unique room code, try again.')
    setCreating(false)
  }

  async function handleJoin() {
    const code = joinCode.trim().toUpperCase()
    if (code.length !== 6) { setError('Room codes are 6 characters.'); return }
    setJoining(true)
    setError('')

    const { data: room, error: roomErr } = await supabase
      .from('study_rooms')
      .select('*, room_members(count)')
      .eq('room_code', code)
      .eq('is_active', true)
      .single()

    if (roomErr || !room) {
      setError('No active guild found with that code.')
      setJoining(false)
      return
    }

    const currentCount = room.room_members?.[0]?.count ?? 0
    if (currentCount >= room.max_members) {
      setError('That guild is full.')
      setJoining(false)
      return
    }

    const { error: joinErr } = await supabase.from('room_members').upsert(
      { room_id: room.id, user_id: userId, display_name: displayName, status: 'studying' },
      { onConflict: 'room_id,user_id' }
    )

    if (joinErr) { setError(joinErr.message); setJoining(false); return }

    setJoining(false)
    setJoinCode('')
    setActiveRoomId(room.id)
    setView('room')
  }

  async function quickJoin(room) {
    await supabase.from('room_members').upsert(
      { room_id: room.id, user_id: userId, display_name: displayName, status: 'studying' },
      { onConflict: 'room_id,user_id' }
    )
    setActiveRoomId(room.id)
    setView('room')
  }

  return (
    <div className="sv-page">
      <Navbar />
      <div className="sv-container" style={{ paddingTop: '28px' }}>

        {view === 'room' && activeRoomId ? (
          <RoomView
            roomId={activeRoomId}
            userId={userId}
            onLeft={() => { setActiveRoomId(null); setView('browse') }}
          />
        ) : (
          <>
            {/* Header */}
            <div style={s.header}>
              <div>
                <p style={s.welcomeLabel}>Study Together</p>
                <h1 style={s.pageTitle}>Study <span style={s.accent}>Rooms</span></h1>
              </div>
              {view !== 'browse' && (
                <button className="sv-btn-ghost" onClick={() => { setView('browse'); setError('') }}>
                  ← Back
                </button>
              )}
            </div>

            {view === 'browse' && (
              <>
                <div style={s.actionsRow}>
                  <button className="sv-btn-primary" onClick={() => setView('create')}>
                    + Create Guild
                  </button>
                  <button className="sv-btn-ghost" onClick={() => setView('join')}>
                    Join Guild
                  </button>
                </div>

                <p className="sv-section-label" style={{ marginTop: '24px' }}>
                  Open Guilds ({openRooms.length})
                </p>

                {loading ? (
                  <div style={s.empty}>Loading guilds...</div>
                ) : openRooms.length === 0 ? (
                  <div style={s.empty}>No open guilds right now. Start one! 🏰</div>
                ) : (
                  <div style={s.roomGrid}>
                    {openRooms.map(r => {
                      const count = r.room_members?.[0]?.count ?? 0
                      const full = count >= r.max_members
                      return (
                        <div key={r.id} className="sv-card" style={s.roomCard}>
                          <div>
                            <div style={s.roomName}>🏰 {r.room_name}</div>
                            <span className="sv-badge">{count}/{r.max_members} members</span>
                          </div>
                          <button
                            className="sv-btn-primary"
                            disabled={full}
                            style={full ? { opacity: 0.4, cursor: 'not-allowed' } : {}}
                            onClick={() => quickJoin(r)}
                          >
                            {full ? 'Full' : 'Join'}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </>
            )}

            {view === 'create' && (
              <div className="sv-card" style={{ maxWidth: '420px' }}>
                <p className="sv-section-label">Create Guild</p>
                <div style={s.formCol}>
                  <input
                    type="text"
                    placeholder="Guild name (e.g. Night Study)"
                    value={roomName}
                    onChange={e => setRoomName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleCreate()}
                    maxLength={40}
                  />
                  <select value={maxMembers} onChange={e => setMaxMembers(Number(e.target.value))}>
                    {[2, 3, 4, 5, 6, 8].map(n => <option key={n} value={n}>{n} members</option>)}
                  </select>
                  {error && <p style={s.errorText}>{error}</p>}
                  <button className="sv-btn-primary" onClick={handleCreate} disabled={creating}>
                    {creating ? 'Creating...' : '🏰 Create Guild'}
                  </button>
                </div>
              </div>
            )}

            {view === 'join' && (
              <div className="sv-card" style={{ maxWidth: '420px' }}>
                <p className="sv-section-label">Join Guild</p>
                <div style={s.formCol}>
                  <input
                    type="text"
                    placeholder="Room code (e.g. AB12CD)"
                    value={joinCode}
                    onChange={e => setJoinCode(e.target.value.toUpperCase())}
                    onKeyDown={e => e.key === 'Enter' && handleJoin()}
                    maxLength={6}
                    style={{ textTransform: 'uppercase', letterSpacing: '3px', textAlign: 'center' }}
                  />
                  {error && <p style={s.errorText}>{error}</p>}
                  <button className="sv-btn-primary" onClick={handleJoin} disabled={joining}>
                    {joining ? 'Joining...' : '⚔️ Join Guild'}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

const s = {
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    flexWrap: 'wrap', gap: '16px', marginBottom: '24px',
  },
  welcomeLabel: { fontSize: '13px', color: 'rgba(255,255,255,0.4)', marginBottom: '4px', fontWeight: 500 },
  pageTitle: { fontSize: '28px', fontWeight: 700, color: '#f1e8ff', lineHeight: 1.2 },
  accent: {
    background: 'linear-gradient(90deg, #f0abfc, #a855f7)',
    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
  },
  actionsRow: { display: 'flex', gap: '12px', flexWrap: 'wrap' },
  roomGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '14px',
  },
  roomCard: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '16px 18px', margin: 0,
  },
  roomName: { fontSize: '15px', fontWeight: 700, color: '#f1e8ff', marginBottom: '6px' },
  formCol: { display: 'flex', flexDirection: 'column', gap: '12px' },
  errorText: { fontSize: '13px', color: '#f87171' },
  empty: { textAlign: 'center', color: 'rgba(255,255,255,0.3)', padding: '40px 20px', fontSize: '14px' },
}