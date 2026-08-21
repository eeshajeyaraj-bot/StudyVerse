import { useEffect, useState } from 'react'
import { useTimer } from '../context/TimerContext'
import { supabase } from '../lib/supabase'

export default function Timer() {
  const [subjects, setSubjects] = useState([])
  const { isRunning, setIsRunning, seconds, setSeconds, selectedSubject, setSelectedSubject, selectedSubjectId, setSelectedSubjectId, startTime, setStartTime } = useTimer()
  const [playerStats, setPlayerStats] = useState(null)
  const [showCompletion, setShowCompletion] = useState(false)

  useEffect(() => { fetchSubjects(); fetchPlayerStats() }, [])

  async function fetchSubjects() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data, error } = await supabase.from('subjects').select('*').eq('user_id', user.id)
    if (!error) setSubjects(data || [])
  }

  async function fetchPlayerStats() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data, error } = await supabase.from('player_stats').select('*').eq('user_id', user.id)
    if (error) return
    if (!data?.length) {
      const { data: created } = await supabase.from('player_stats').insert([{ user_id: user.id, xp: 0, level: 1 }]).select().single()
      if (created) setPlayerStats(created)
      return
    }
    setPlayerStats(data[0])
  }

  function handleStartSubject(sub) {
    if (isRunning) { alert('Stop the current session before switching subjects.'); return }
    setSelectedSubject(sub.name); setSelectedSubjectId(sub.id); setStartTime(new Date().toISOString()); setSeconds(0); setIsRunning(true)
  }

  async function stopTimer() {
    setIsRunning(false)
    if (seconds === 0 || !selectedSubjectId) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const endTime = new Date().toISOString()
    const { error: sessionError } = await supabase.from('study_sessions').insert([{ user_id: user.id, subject_id: selectedSubjectId, start_time: startTime, end_time: endTime, duration: seconds }])
    if (sessionError) { alert('Failed to save session: ' + sessionError.message); return }
    if (playerStats) {
      const gained = Math.floor(seconds / 60) * 2
      const newXP = playerStats.xp + gained
      const newLevel = Math.floor(newXP / 100) + 1
      const { error } = await supabase.from('player_stats').update({ xp: newXP, level: newLevel }).eq('id', playerStats.id).eq('user_id', user.id)
      if (!error) setPlayerStats({ ...playerStats, xp: newXP, level: newLevel })
    }
    setShowCompletion(true)
    setSeconds(0); setSelectedSubject(''); setSelectedSubjectId(null); setStartTime(null)
    setTimeout(() => setShowCompletion(false), 3000)
  }

  function formatTime(totalSeconds) {
    const hrs = String(Math.floor(totalSeconds / 3600)).padStart(2, '0')
    const mins = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0')
    const secs = String(totalSeconds % 60).padStart(2, '0')
    return `${hrs}:${mins}:${secs}`
  }

  return <div className="sv-page">
    {showCompletion && <div className="sv-toast">Study session saved</div>}
    <div className="sv-container" style={{ paddingTop: 32 }}>
      <div className="sv-page-header">
        <div><p className="sv-eyebrow">Timer</p><h1>Focus on your study session.</h1><p className="sv-eyebrow" style={{ marginTop: 8 }}>Choose a subject, start the timer, and your session will be recorded automatically.</p></div>
      </div>

      <div className="sv-card">
        <p className="sv-section-label">Choose a subject</p>
        {subjects.length === 0 ? <p className="sv-empty" style={{ padding: '28px 0 10px' }}>No subjects yet. Add a subject first.</p> : <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 12 }}>{subjects.map(sub => {
          const active = selectedSubjectId === sub.id && isRunning
          return <button key={sub.id} onClick={() => handleStartSubject(sub)} className={active ? 'sv-primary-button' : ''}>{active ? '● Studying' : 'Start'} · {sub.name}</button>
        })}</div>}
      </div>

      <div className="sv-card" style={{ textAlign: 'center', padding: '40px 24px' }}>
        <p className="sv-section-label">Current session</p>
        <p style={{ marginTop: 12, color: 'var(--app-muted)', fontSize: 15 }}>{selectedSubject || 'No subject selected'}</p>
        <div style={{ fontSize: 'clamp(44px, 8vw, 72px)', fontWeight: 700, letterSpacing: 4, color: isRunning ? 'var(--app-accent)' : 'var(--app-muted)', padding: '24px 0', fontVariantNumeric: 'tabular-nums' }}>{formatTime(seconds)}</div>
        {isRunning ? <button className="sv-primary-button" style={{ width: '100%' }} onClick={stopTimer}>Stop & save session</button> : <p style={{ color: 'var(--app-muted)', fontSize: 13 }}>{seconds > 0 ? 'Session paused.' : 'Select a subject above to begin.'}</p>}
      </div>

      <div className="sv-card">
        <p className="sv-section-label">Study tips</p>
        <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
          <div className="sv-action-card">Work in focused blocks and take short breaks.</div>
          <div className="sv-action-card">Keep your phone away during focused sessions.</div>
          <div className="sv-action-card">Review your analytics regularly to understand your habits.</div>
        </div>
      </div>
    </div>
  </div>
}
