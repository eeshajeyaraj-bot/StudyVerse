import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Subjects() {
  const [subject, setSubject] = useState('')
  const [goalMinutes, setGoalMinutes] = useState(60)
  const [subjects, setSubjects] = useState([])
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { Promise.all([fetchSubjects(), fetchSessions()]).finally(() => setLoading(false)) }, [])

  async function getUser() {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) throw new Error('You must be signed in.')
    return user
  }

  async function fetchSubjects() {
    try { const user = await getUser(); const { data, error } = await supabase.from('subjects').select('*').eq('user_id', user.id); if (!error) setSubjects(data || []) } catch (e) { console.error(e) }
  }

  async function fetchSessions() {
    try { const user = await getUser(); const { data, error } = await supabase.from('study_sessions').select('*').eq('user_id', user.id); if (!error) setSessions(data || []) } catch (e) { console.error(e) }
  }

  async function addSubject() {
    if (!subject.trim()) { alert('Enter a subject name'); return }
    try {
      const user = await getUser()
      const { error } = await supabase.from('subjects').insert([{ user_id: user.id, name: subject.trim(), goal_minutes: goalMinutes }])
      if (error) throw error
      setSubject(''); setGoalMinutes(60); fetchSubjects()
    } catch (e) { alert(`Unable to add subject: ${e.message}`) }
  }

  async function deleteSubject(id) {
    const user = await getUser()
    const { error } = await supabase.from('subjects').delete().eq('id', id).eq('user_id', user.id)
    if (error) alert(`Unable to remove subject: ${error.message}`)
    fetchSubjects()
  }

  const subjectProgress = {}
  sessions.forEach(session => { if (session.subject_id) subjectProgress[session.subject_id] = (subjectProgress[session.subject_id] || 0) + Math.floor((session.duration || 0) / 60) })

  return <div className="sv-page">
    <div className="sv-container" style={{ paddingTop: 32 }}>
      <div className="sv-page-header">
        <div><p className="sv-eyebrow">Subjects</p><h1>Organize your study areas.</h1><p className="sv-eyebrow" style={{ marginTop: 8 }}>Set study goals and track your progress for each subject.</p></div>
        <div className="sv-card" style={{ minWidth: 110, textAlign: 'center', margin: 0 }}><strong style={{ display: 'block', fontSize: 28, color: 'var(--app-accent)' }}>{subjects.length}</strong><small>Subjects</small></div>
      </div>

      <div className="sv-card">
        <p className="sv-section-label">Add a subject</p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 10 }}>
          <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Subject name, e.g. Mathematics" onKeyDown={e => e.key === 'Enter' && addSubject()} style={{ flex: 1, minWidth: 220 }} />
          <input type="number" value={goalMinutes} onChange={e => setGoalMinutes(Number(e.target.value))} min={1} placeholder="Daily goal (minutes)" style={{ width: 180 }} />
          <button className="sv-primary-button" onClick={addSubject}>+ Add subject</button>
        </div>
      </div>

      <div className="sv-section-heading"><span className="sv-section-label">Your subjects ({subjects.length})</span></div>
      {loading ? <div className="sv-empty">Loading subjects...</div> : subjects.length === 0 ? <div className="sv-empty">No subjects yet. Add your first one above.</div> : <div className="sv-action-grid" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))' }}>
        {subjects.map(sub => {
          const completed = subjectProgress[sub.id] || 0
          const percentage = Math.min((completed / Math.max(sub.goal_minutes || 1, 1)) * 100, 100)
          return <div className="sv-card" key={sub.id} style={{ margin: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
              <div><h3 style={{ color: 'var(--app-text)', fontSize: 17 }}>{sub.name}</h3><small style={{ color: 'var(--app-muted)' }}>{sub.goal_minutes} min goal</small></div>
              {percentage >= 100 && <span className="sv-badge">Complete</span>}
            </div>
            <div style={{ marginTop: 18 }}><div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--app-muted)', fontSize: 12, marginBottom: 7 }}><span>{completed} min studied</span><strong style={{ color: 'var(--app-accent)' }}>{Math.round(percentage)}%</strong></div><div className="sv-progress-bg"><div className="sv-progress-fill" style={{ width: `${percentage}%` }} /></div></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 15, paddingTop: 12, borderTop: '1px solid var(--app-border)' }}><small style={{ color: 'var(--app-muted)' }}>{percentage >= 100 ? 'Goal reached' : `${Math.max((sub.goal_minutes || 0) - completed, 0)} min remaining`}</small><button onClick={() => deleteSubject(sub.id)}>Remove</button></div>
          </div>
        })}
      </div>}
    </div>
  </div>
}
