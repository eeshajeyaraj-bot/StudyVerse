import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

const subjectCss = `
.sv-subject-tools{display:grid;grid-template-columns:minmax(220px,1fr) auto auto;gap:10px;align-items:center}.sv-subject-tools select{width:auto;min-width:150px}.sv-subject-toggle{display:flex;gap:7px;flex-wrap:wrap}.sv-subject-toggle button{min-height:38px;padding:8px 11px;font-size:12px}.sv-subject-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:14px}.sv-subject-card{position:relative;display:flex;flex-direction:column;min-height:215px;margin:0}.sv-subject-top{display:flex;justify-content:space-between;align-items:flex-start;gap:12px}.sv-subject-title{display:flex;align-items:center;gap:8px}.sv-subject-title h3{font-size:18px}.sv-subject-star{border:0!important;background:transparent!important;padding:2px!important;min-height:28px!important;font-size:18px!important}.sv-subject-actions{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-top:auto;padding-top:14px;border-top:1px solid var(--app-border)}.sv-subject-actions button{min-height:34px;padding:7px 10px;font-size:11px}.sv-subject-empty{grid-column:1/-1}.sv-subject-progress{margin-top:18px}.sv-subject-progress-row{display:flex;justify-content:space-between;gap:8px;color:var(--app-muted);font-size:12px;margin-bottom:7px}.sv-subject-progress-row strong{color:var(--app-accent)}
@media(max-width:760px){.sv-subject-tools{grid-template-columns:1fr}.sv-subject-tools select{width:100%}}
`

export default function Subjects() {
  const [subject, setSubject] = useState('')
  const [goalMinutes, setGoalMinutes] = useState(60)
  const [subjects, setSubjects] = useState([])
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('name')
  const [filter, setFilter] = useState('all')
  const [pinned, setPinned] = useState(() => JSON.parse(localStorage.getItem('studyverse-pinned-subjects') || '[]'))
  const [favorites, setFavorites] = useState(() => JSON.parse(localStorage.getItem('studyverse-favorite-subjects') || '[]'))

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
    setPinned(prev => { const next = prev.filter(x => x !== id); localStorage.setItem('studyverse-pinned-subjects', JSON.stringify(next)); return next })
    setFavorites(prev => { const next = prev.filter(x => x !== id); localStorage.setItem('studyverse-favorite-subjects', JSON.stringify(next)); return next })
    fetchSubjects()
  }

  function toggleLocal(id, setter, key) {
    setter(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
      localStorage.setItem(key, JSON.stringify(next))
      return next
    })
  }

  const subjectProgress = {}
  sessions.forEach(session => { if (session.subject_id) subjectProgress[session.subject_id] = (subjectProgress[session.subject_id] || 0) + Math.floor((session.duration || 0) / 60) })

  const visibleSubjects = useMemo(() => {
    const query = search.trim().toLowerCase()
    const filtered = subjects.filter(sub => {
      const matchesSearch = !query || sub.name.toLowerCase().includes(query)
      const matchesFilter = filter === 'all' || (filter === 'pinned' && pinned.includes(sub.id)) || (filter === 'favorite' && favorites.includes(sub.id)) || (filter === 'complete' && (subjectProgress[sub.id] || 0) >= (sub.goal_minutes || 1))
      return matchesSearch && matchesFilter
    })
    return [...filtered].sort((a, b) => {
      if (pinned.includes(a.id) !== pinned.includes(b.id)) return pinned.includes(a.id) ? -1 : 1
      if (sort === 'progress') return (subjectProgress[b.id] || 0) - (subjectProgress[a.id] || 0)
      if (sort === 'goal') return (b.goal_minutes || 0) - (a.goal_minutes || 0)
      return a.name.localeCompare(b.name)
    })
  }, [subjects, sessions, search, sort, filter, pinned, favorites])

  return <div className="sv-page">
    <style>{subjectCss}</style>
    <div className="sv-container" style={{ paddingTop: 32 }}>
      <div className="sv-page-header">
        <div><p className="sv-eyebrow">Subjects</p><h1>Organize your study areas.</h1><p className="sv-page-subtitle">Track study hours, progress, pinned subjects and favorites without losing the clean StudyVerse layout.</p></div>
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

      <div className="sv-card">
        <div className="sv-section-heading" style={{ marginTop: 0 }}><span className="sv-section-label">Find and organize</span></div>
        <div className="sv-subject-tools">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search subjects..." />
          <select value={sort} onChange={e => setSort(e.target.value)}><option value="name">Sort: Name</option><option value="progress">Sort: Progress</option><option value="goal">Sort: Goal</option></select>
          <select value={filter} onChange={e => setFilter(e.target.value)}><option value="all">All subjects</option><option value="pinned">Pinned</option><option value="favorite">Favorites</option><option value="complete">Completed</option></select>
        </div>
        <div className="sv-subject-toggle" style={{ marginTop: 10 }}><span className="sv-badge">{visibleSubjects.length} shown</span><span className="sv-badge">📌 {pinned.length} pinned</span><span className="sv-badge">⭐ {favorites.length} favorites</span></div>
      </div>

      <div className="sv-section-heading"><span className="sv-section-label">Your subjects</span></div>
      {loading ? <div className="sv-empty">Loading subjects...</div> : visibleSubjects.length === 0 ? <div className="sv-empty sv-subject-empty">No subjects match your current filters.</div> : <div className="sv-subject-grid">
        {visibleSubjects.map(sub => {
          const completed = subjectProgress[sub.id] || 0
          const percentage = Math.min((completed / Math.max(sub.goal_minutes || 1, 1)) * 100, 100)
          const isPinned = pinned.includes(sub.id), isFavorite = favorites.includes(sub.id)
          return <div className="sv-card sv-subject-card" key={sub.id}>
            <div className="sv-subject-top"><div><div className="sv-subject-title"><h3>{sub.name}</h3><button className="sv-subject-star" title={isFavorite ? 'Remove favorite' : 'Add favorite'} onClick={() => toggleLocal(sub.id, setFavorites, 'studyverse-favorite-subjects')}>{isFavorite ? '⭐' : '☆'}</button></div><small style={{ color: 'var(--app-muted)' }}>{sub.goal_minutes} min goal</small></div><button className="sv-subject-star" title={isPinned ? 'Unpin subject' : 'Pin subject'} onClick={() => toggleLocal(sub.id, setPinned, 'studyverse-pinned-subjects')}>{isPinned ? '📌' : '📍'}</button></div>
            <div className="sv-subject-progress"><div className="sv-subject-progress-row"><span>{completed} min studied</span><strong>{Math.round(percentage)}%</strong></div><div className="sv-progress-bg"><div className="sv-progress-fill" style={{ width: `${percentage}%` }} /></div></div>
            <div className="sv-subject-actions"><small style={{ color: 'var(--app-muted)' }}>{percentage >= 100 ? 'Goal reached ✓' : `${Math.max((sub.goal_minutes || 0) - completed, 0)} min remaining`}</small><button onClick={() => deleteSubject(sub.id)}>Remove</button></div>
          </div>
        })}
      </div>}
    </div>
  </div>
}
