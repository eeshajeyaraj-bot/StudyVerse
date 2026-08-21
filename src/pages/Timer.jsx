import { useEffect, useState } from 'react'
import { useTimer } from '../context/TimerContext'
import { supabase } from '../lib/supabase'

export default function Timer() {
  const [subjects, setSubjects] = useState([])
  const [saving, setSaving] = useState(false)
  const [showCompletion, setShowCompletion] = useState(false)
  const { isRunning, setIsRunning, seconds, setSeconds, selectedSubject, setSelectedSubject, selectedSubjectId, setSelectedSubjectId, startTime, setStartTime } = useTimer()

  useEffect(() => { fetchSubjects() }, [])

  async function fetchSubjects() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data, error } = await supabase.from('subjects').select('*').eq('user_id', user.id).order('name')
    if (!error) setSubjects(data || [])
  }

  function handleStartSubject(sub) {
    if (isRunning) { alert('Stop the current session before switching subjects.'); return }
    setSelectedSubject(sub.name)
    setSelectedSubjectId(sub.id)
    setStartTime(new Date().toISOString())
    setSeconds(0)
    setIsRunning(true)
  }

  async function stopTimer() {
    setIsRunning(false)
    if (seconds === 0 || !selectedSubjectId) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }
    const endTime = new Date().toISOString()
    const { error } = await supabase.from('study_sessions').insert([{ user_id: user.id, subject_id: selectedSubjectId, start_time: startTime, end_time: endTime, duration: seconds }])
    setSaving(false)
    if (error) { alert('Failed to save session: ' + error.message); return }
    setShowCompletion(true)
    setSeconds(0)
    setSelectedSubject('')
    setSelectedSubjectId(null)
    setStartTime(null)
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
    <div className="sv-container sv-timer-page">
      <div className="sv-page-header">
        <div>
          <p className="sv-eyebrow">Study Timer</p>
          <h1>Focus on your study session.</h1>
          <p className="sv-page-subtitle">Choose a subject, start the timer, and your session will be recorded automatically.</p>
        </div>
      </div>

      <section className="sv-card sv-timer-subject-card">
        <div className="sv-section-heading"><span className="sv-section-label">Choose a subject</span></div>
        {subjects.length === 0 ? <p className="sv-empty">No subjects yet. Add a subject first.</p> : <div className="sv-timer-subjects">{subjects.map(sub => {
          const active = selectedSubjectId === sub.id && isRunning
          return <button key={sub.id} onClick={() => handleStartSubject(sub)} className={active ? 'sv-primary-button' : ''}>{active ? '● Studying' : 'Start'} · {sub.name}</button>
        })}</div>}
      </section>

      <section className="sv-card sv-timer-session-card">
        <p className="sv-section-label">Current session</p>
        <p className="sv-timer-subject-name">{selectedSubject || 'No subject selected'}</p>
        <div className={`sv-timer-display ${isRunning ? 'is-running' : ''}`}>{formatTime(seconds)}</div>
        {isRunning ? <button className="sv-primary-button sv-timer-stop" onClick={stopTimer} disabled={saving}>{saving ? 'Saving session…' : 'Stop & save session'}</button> : <p className="sv-timer-hint">Select a subject above to begin.</p>}
      </section>

      <section className="sv-card sv-timer-tips-card">
        <div className="sv-section-heading"><span className="sv-section-label">Study tips</span></div>
        <div className="sv-tips-list">
          <div>Work in focused blocks and take short breaks.</div>
          <div>Keep your phone away during focused sessions.</div>
          <div>Review your analytics regularly to understand your habits.</div>
        </div>
      </section>
    </div>
  </div>
}
