import { useEffect, useState, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const STATUS_ICON = { studying: '🟢', break: '🟡', offline: '⚫' }

function formatTime(totalSeconds) {
  const hrs  = String(Math.floor(totalSeconds / 3600)).padStart(2, '0')
  const mins = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0')
  const secs = String(totalSeconds % 60).padStart(2, '0')
  return `${hrs}:${mins}:${secs}`
}

export default function RoomView({ roomId, userId, onLeft }) {
  const [room, setRoom]       = useState(null)
  const [members, setMembers] = useState([])
  const [elapsed, setElapsed] = useState(0)
  const [subjectInput, setSubjectInput] = useState('')
  const [loading, setLoading] = useState(true)
  const tickRef = useRef(null)

  useEffect(() => {
    fetchRoom()
    fetchMembers()
  }, [roomId])

  async function fetchRoom() {
    const { data } = await supabase.from('study_rooms').select('*').eq('id', roomId).single()
    setRoom(data)
    setLoading(false)
  }

  async function fetchMembers() {
    const { data } = await supabase
      .from('room_members')
      .select('*')
      .eq('room_id', roomId)
      .order('joined_at', { ascending: true })
    setMembers(data || [])
  }

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`room-${roomId}`)
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'study_rooms', filter: `id=eq.${roomId}` },
        payload => setRoom(payload.new)
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'room_members', filter: `room_id=eq.${roomId}` },
        payload => {
          setMembers(prev => {
            if (payload.eventType === 'INSERT') return [...prev, payload.new]
            if (payload.eventType === 'UPDATE') return prev.map(m => m.id === payload.new.id ? payload.new : m)
            if (payload.eventType === 'DELETE') return prev.filter(m => m.id !== payload.old.id)
            return prev
          })
        }
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [roomId])

  // Local ticking clock synced off timer_started_at
  useEffect(() => {
    clearInterval(tickRef.current)
    if (room?.timer_status === 'running' && room?.timer_started_at) {
      const start = new Date(room.timer_started_at).getTime()
      tickRef.current = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000)
    } else {
      setElapsed(0)
    }
    return () => clearInterval(tickRef.current)
  }, [room?.timer_status, room?.timer_started_at])

  const isHost    = room?.host_id === userId
  const isRunning = room?.timer_status === 'running'

  async function startQuest() {
    await supabase.from('study_rooms').update({
      timer_status: 'running',
      timer_started_at: new Date().toISOString(),
      current_subject: subjectInput || 'General',
    }).eq('id', roomId)
  }

  async function endQuest() {
    if (!room?.timer_started_at) return
    const startedAt = room.timer_started_at
    const endedAt = new Date().toISOString()
    const durationSeconds = Math.floor((new Date(endedAt) - new Date(startedAt)) / 1000)
    if (durationSeconds <= 0) return

    const studyingMembers = members.filter(m => m.status === 'studying')
    const xpEarned = Math.floor(durationSeconds / 60) * 2 // same 2 XP/min rule as Timer.jsx

    if (studyingMembers.length > 0) {
      await supabase.from('room_sessions').insert(
        studyingMembers.map(m => ({
          room_id: roomId,
          user_id: m.user_id,
          subject: room.current_subject,
          started_at: startedAt,
          ended_at: endedAt,
          duration_seconds: durationSeconds,
          xp_earned: xpEarned,
        }))
      )

      // Bump XP for the current user if they were studying (same pattern as Timer.jsx)
      const wasStudying = studyingMembers.some(m => m.user_id === userId)
      if (wasStudying) {
        // Same lookup pattern Timer.jsx uses (single-row player_stats table)
        const { data: rows } = await supabase.from('player_stats').select('*')
        const current = rows?.[0]
        if (current) {
          const newXP = current.xp + xpEarned
          const newLevel = Math.floor(newXP / 100) + 1
          await supabase.from('player_stats').update({ xp: newXP, level: newLevel }).eq('id', current.id)
        }
      }
    }

    await supabase.from('study_rooms').update({ timer_status: 'idle', timer_started_at: null }).eq('id', roomId)
  }

  async function setMyStatus(status) {
    await supabase.from('room_members').update({ status }).eq('room_id', roomId).eq('user_id', userId)
  }

  async function leaveRoom() {
    await supabase.from('room_members').delete().eq('room_id', roomId).eq('user_id', userId)
    onLeft?.()
  }

  if (loading || !room) {
    return <div className="sv-card" style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>Loading guild...</div>
  }

  return (
    <div>
      {/* Header */}
      <div style={s.header}>
        <div>
          <p style={s.welcomeLabel}>Study Room</p>
          <h1 style={s.pageTitle}>🏰 <span style={s.accent}>{room.room_name}</span></h1>
        </div>
        <div style={s.codeBadge}>
          <span style={s.codeLabel}>Room Code</span>
          <span style={s.codeValue}>{room.room_code}</span>
        </div>
      </div>

      {/* Party Members */}
      <div className="sv-card">
        <p className="sv-section-label">Party Members ({members.length}/{room.max_members})</p>
        <div style={s.memberList}>
          {members.map(m => (
            <div key={m.id} style={s.memberRow}>
              <div style={s.memberLeft}>
                <span>{m.user_id === room.host_id ? '👑' : '⚔️'}</span>
                <span style={s.memberName}>{m.display_name}</span>
              </div>
              <span className="sv-badge">{STATUS_ICON[m.status] || '⚫'} {m.status}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Quest Timer */}
      <div className="sv-card" style={s.timerCard}>
        <p className="sv-section-label" style={{ textAlign: 'center' }}>
          {room.current_subject ? `Quest — ${room.current_subject}` : 'Quest'}
        </p>
        <div style={{ ...s.timerDisplay, color: isRunning ? '#f0abfc' : 'rgba(255,255,255,0.2)' }}>
          {formatTime(elapsed)}
        </div>
        <p style={s.roomStatus}>{isRunning ? 'Studying together' : 'Waiting to start...'}</p>

        {isHost ? (
          isRunning ? (
            <button className="sv-btn-primary" style={s.fullBtn} onClick={endQuest}>⏹ End Quest</button>
          ) : (
            <div style={s.startRow}>
              <input
                type="text"
                placeholder="Subject (e.g. Maths)"
                value={subjectInput}
                onChange={e => setSubjectInput(e.target.value)}
              />
              <button className="sv-btn-primary" onClick={startQuest}>⚔️ Begin Quest</button>
            </div>
          )
        ) : (
          <p style={s.hintText}>Only the Guild Leader can start or end the quest.</p>
        )}
      </div>

      {/* My Status */}
      <div className="sv-card">
        <p className="sv-section-label">My Status</p>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="sv-btn-ghost" onClick={() => setMyStatus('studying')}>🟢 Studying</button>
          <button className="sv-btn-ghost" onClick={() => setMyStatus('break')}>🟡 Break</button>
        </div>
      </div>

      <button className="sv-btn-danger" onClick={leaveRoom}>🚪 Leave Guild</button>
    </div>
  )
}

const s = {
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    flexWrap: 'wrap', gap: '16px', marginBottom: '24px',
  },
  welcomeLabel: { fontSize: '13px', color: 'rgba(255,255,255,0.4)', marginBottom: '4px', fontWeight: 500 },
  pageTitle: { fontSize: '26px', fontWeight: 700, color: '#f1e8ff', lineHeight: 1.2 },
  accent: {
    background: 'linear-gradient(90deg, #f0abfc, #a855f7)',
    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
  },
  codeBadge: {
    textAlign: 'center', background: 'rgba(168, 85, 247, 0.1)',
    border: '1px solid rgba(168, 85, 247, 0.25)', borderRadius: '12px',
    padding: '10px 18px', minWidth: '120px',
  },
  codeLabel: { fontSize: '11px', color: 'rgba(255,255,255,0.4)', display: 'block' },
  codeValue: { fontSize: '18px', fontWeight: 700, color: '#f0abfc', letterSpacing: '2px' },
  memberList: { display: 'flex', flexDirection: 'column', gap: '10px' },
  memberRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '10px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px',
  },
  memberLeft: { display: 'flex', alignItems: 'center', gap: '10px' },
  memberName: { fontWeight: 600, fontSize: '14px', color: '#f1e8ff' },
  timerCard: { textAlign: 'center', padding: '32px 24px' },
  timerDisplay: {
    fontSize: '52px', fontWeight: 700, letterSpacing: '5px',
    textShadow: '0 0 40px rgba(240, 171, 252, 0.4)', padding: '16px 0',
    fontVariantNumeric: 'tabular-nums', transition: 'color 0.3s',
  },
  roomStatus: { fontSize: '13px', color: 'rgba(255,255,255,0.4)', marginBottom: '18px' },
  startRow: { display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' },
  fullBtn: { width: '100%' },
  hintText: { fontSize: '13px', color: 'rgba(255,255,255,0.25)' },
}