import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const subjectCss = `
.sv-subject-hero{position:relative;overflow:hidden;padding:25px;background:linear-gradient(115deg,rgba(124,58,237,.19),rgba(236,72,153,.07) 58%,rgba(255,255,255,.025));border-color:rgba(192,132,252,.3)}
.sv-subject-hero:after{content:"";position:absolute;width:190px;height:190px;right:-55px;top:-100px;border-radius:50%;background:rgba(168,85,247,.16);filter:blur(8px);pointer-events:none}
.sv-subject-hero-inner{position:relative;z-index:1;display:flex;justify-content:space-between;align-items:center;gap:22px;flex-wrap:wrap}
.sv-subject-hero h1{font-size:clamp(25px,3vw,34px);line-height:1.15;letter-spacing:-.8px;margin:5px 0 9px}
.sv-subject-hero-copy{max-width:680px;color:var(--text-muted);font-size:13px;line-height:1.7}
.sv-subject-count{width:116px;height:116px;display:grid;place-content:center;text-align:center;flex:0 0 auto;border-radius:25px;border:1px solid rgba(216,180,254,.32);background:linear-gradient(145deg,rgba(168,85,247,.18),rgba(255,255,255,.035));box-shadow:inset 0 1px rgba(255,255,255,.08)}
.sv-subject-count strong{font-size:34px;line-height:1.1;color:var(--purple-light)}.sv-subject-count span{font-size:12px;color:var(--text-muted);margin-top:5px}
.sv-subject-summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin:0 0 20px}
.sv-subject-summary-card{display:flex;align-items:center;gap:13px;padding:16px;margin:0;min-width:0;background:linear-gradient(145deg,rgba(255,255,255,.055),rgba(255,255,255,.018))}
.sv-subject-summary-icon{width:42px;height:42px;display:grid;place-items:center;flex:0 0 42px;border-radius:13px;background:rgba(168,85,247,.14);font-size:20px}
.sv-subject-summary-card strong{display:block;font-size:21px;line-height:1.2}.sv-subject-summary-card small{display:block;margin-top:4px;color:var(--text-muted);font-size:11px}
.sv-subject-form{border-color:rgba(192,132,252,.22)}.sv-subject-form-row{display:grid;grid-template-columns:minmax(0,1fr) 150px auto;gap:10px;margin-top:13px;align-items:center}
.sv-subject-tools{display:grid;grid-template-columns:minmax(200px,1fr) minmax(140px,170px) minmax(140px,170px);gap:10px;align-items:center}
.sv-subject-toggle{display:flex;gap:7px;flex-wrap:wrap;margin-top:13px}
.sv-subject-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,265px),1fr));gap:14px}
.sv-subject-card{position:relative;isolation:isolate;overflow:hidden;display:flex;flex-direction:column;min-height:220px;margin:0;padding:19px;background:linear-gradient(155deg,rgba(168,85,247,.075),rgba(255,255,255,.025) 55%);transition:transform .18s ease,border-color .18s ease,box-shadow .18s ease}
.sv-subject-card:before{content:"";position:absolute;z-index:-1;top:0;left:18px;right:18px;height:2px;border-radius:0 0 6px 6px;background:linear-gradient(90deg,#7c3aed,#f0abfc);opacity:.75}
.sv-subject-card:hover{transform:translateY(-3px);border-color:rgba(192,132,252,.42);box-shadow:0 15px 35px rgba(0,0,0,.18)}
.sv-subject-top{display:flex;justify-content:space-between;align-items:flex-start;gap:12px}.sv-subject-title{display:flex;align-items:center;gap:7px;min-width:0}.sv-subject-title h3{font-size:17px;overflow-wrap:anywhere}
.sv-subject-star{border:0!important;background:transparent!important;padding:2px!important;min-height:28px!important;font-size:18px!important;box-shadow:none!important}.sv-subject-star:hover{transform:scale(1.08)!important;box-shadow:none!important}
.sv-subject-goal{display:inline-flex;align-items:center;gap:5px;margin-top:7px;padding:4px 8px;border-radius:7px;background:rgba(168,85,247,.1);color:var(--text-muted);font-size:11px}
.sv-subject-progress{margin-top:23px}.sv-subject-progress-row{display:flex;justify-content:space-between;gap:8px;color:var(--text-muted);font-size:12px;margin-bottom:8px}.sv-subject-progress-row strong{color:var(--purple-light)}
.sv-subject-card .sv-progress-bg{height:8px;margin-top:0;background:rgba(255,255,255,.08)}.sv-subject-card .sv-progress-fill{background:linear-gradient(90deg,#7c3aed,#c084fc,#f0abfc);transition:width .35s ease}
.sv-subject-actions{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-top:auto;padding-top:15px}.sv-subject-actions small{color:var(--text-muted);font-size:11px}.sv-subject-remove{min-height:31px!important;padding:5px 9px!important;font-size:11px!important;background:rgba(255,255,255,.035)!important}
.sv-subject-empty{grid-column:1/-1}.sv-subject-empty-card{padding:32px 20px;text-align:center;border:1px dashed var(--border-bright);border-radius:16px;background:rgba(168,85,247,.035);color:var(--text-muted)}.sv-subject-empty-card strong{display:block;margin-bottom:6px;color:var(--text-primary)}
@media(max-width:760px){.sv-subject-tools{grid-template-columns:1fr}.sv-subject-tools select{width:100%}.sv-subject-form-row{grid-template-columns:minmax(0,1fr) 125px}.sv-subject-form-row button{grid-column:1/-1}.sv-subject-summary{gap:9px}}
@media(max-width:520px){.sv-subject-hero{padding:19px}.sv-subject-count{width:80px;height:80px;border-radius:18px}.sv-subject-count strong{font-size:27px}.sv-subject-summary{grid-template-columns:1fr}.sv-subject-summary-card{padding:12px}.sv-subject-form-row{grid-template-columns:1fr}.sv-subject-form-row button{grid-column:auto}.sv-subject-grid{grid-template-columns:1fr}}
`

export default function Subjects() {
  const navigate = useNavigate()
  const [subject, setSubject] = useState('')
  const [goalMinutes, setGoalMinutes] = useState(60)
  const [subjects, setSubjects] = useState([])
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
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
    try {
      const user = await getUser()
      const { data, error } = await supabase.from('subjects').select('*').eq('user_id', user.id)
      if (error) throw error
      setSubjects(data || [])
    } catch (e) { console.error('Unable to load subjects:', e) }
  }

  async function fetchSessions() {
    try {
      const user = await getUser()
      const { data, error } = await supabase.from('study_sessions').select('*').eq('user_id', user.id)
      if (error) throw error
      setSessions(data || [])
    } catch (e) { console.error('Unable to load study sessions:', e) }
  }

  async function addSubject() {
    const name = subject.trim()
    if (!name) { alert('Enter a subject name'); return }
    if (!Number.isFinite(goalMinutes) || goalMinutes < 1) { alert('Set a goal of at least 1 minute'); return }
    if (subjects.some(item => item.name.trim().toLowerCase() === name.toLowerCase())) { alert('That subject already exists'); return }
    setSaving(true)
    try {
      const user = await getUser()
      const { data, error } = await supabase.from('subjects').insert([{ user_id: user.id, name, goal_minutes: goalMinutes }]).select().single()
      if (error) throw error
      setSubjects(prev => [...prev, data])
      setSubject('')
      setGoalMinutes(60)
    } catch (e) { alert(`Unable to add subject: ${e.message}`) }
    finally { setSaving(false) }
  }

  async function deleteSubject(id) {
    if (!window.confirm('Remove this subject? This action cannot be undone.')) return
    try {
      const user = await getUser()
      const { error } = await supabase.from('subjects').delete().eq('id', id).eq('user_id', user.id)
      if (error) throw error
      setSubjects(prev => prev.filter(item => item.id !== id))
      setPinned(prev => { const next = prev.filter(x => x !== id); localStorage.setItem('studyverse-pinned-subjects', JSON.stringify(next)); return next })
      setFavorites(prev => { const next = prev.filter(x => x !== id); localStorage.setItem('studyverse-favorite-subjects', JSON.stringify(next)); return next })
    } catch (e) { alert(`Unable to remove subject: ${e.message}`) }
  }

  function toggleLocal(id, setter, key) {
    setter(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
      localStorage.setItem(key, JSON.stringify(next))
      return next
    })
  }

  const subjectProgress = {}
  sessions.forEach(session => {
    if (session.subject_id) subjectProgress[session.subject_id] = (subjectProgress[session.subject_id] || 0) + Math.floor((session.duration || 0) / 60)
  })

  const totalMinutes = sessions.reduce((sum, session) => sum + Math.floor((session.duration || 0) / 60), 0)
  const goalsReached = subjects.filter(sub => (subjectProgress[sub.id] || 0) >= (sub.goal_minutes || 1)).length

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
    <div className="sv-container" style={{ paddingTop: 28 }}>
      <section className="sv-card sv-subject-hero">
        <div className="sv-subject-hero-inner">
          <div>
            <p className="sv-eyebrow">YOUR STUDY SPACE / SUBJECTS</p>
            <h1>Make every study session count.</h1>
            <p className="sv-subject-hero-copy">Keep your subjects organized, track your progress, and celebrate every goal you reach. Small steps add up.</p>
          </div>
          <div className="sv-subject-count"><strong>{subjects.length}</strong><span>{subjects.length === 1 ? 'subject' : 'subjects'}</span></div>
        </div>
      </section>

      <section className="sv-subject-summary" aria-label="Subject study summary">
        <div className="sv-card sv-subject-summary-card"><span className="sv-subject-summary-icon">📚</span><div><strong>{subjects.length}</strong><small>Total subjects</small></div></div>
        <div className="sv-card sv-subject-summary-card"><span className="sv-subject-summary-icon">⏱️</span><div><strong>{totalMinutes.toLocaleString()} min</strong><small>Study time recorded</small></div></div>
        <div className="sv-card sv-subject-summary-card"><span className="sv-subject-summary-icon">✨</span><div><strong>{goalsReached} / {subjects.length}</strong><small>Goals reached</small></div></div>
      </section>

      <section className="sv-card sv-subject-form">
        <p className="sv-section-label">＋ Add a subject</p>
        <div className="sv-subject-form-row">
          <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Subject name, e.g. Mathematics" aria-label="Subject name" onKeyDown={e => e.key === 'Enter' && addSubject()} />
          <input type="number" value={goalMinutes} onChange={e => setGoalMinutes(Number(e.target.value))} min={1} max={1440} aria-label="Goal minutes" title="Goal in minutes" />
          <button className="sv-primary-button" onClick={addSubject} disabled={saving}>{saving ? 'Adding…' : '+ Add subject'}</button>
        </div>
      </section>

      <section className="sv-card">
        <div className="sv-section-heading" style={{ marginTop: 0, marginBottom: 13 }}><span className="sv-section-label">Find and organize</span></div>
        <div className="sv-subject-tools">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="⌕  Search your subjects..." aria-label="Search subjects" />
          <select value={sort} onChange={e => setSort(e.target.value)} aria-label="Sort subjects"><option value="name">Sort: Name</option><option value="progress">Sort: Progress</option><option value="goal">Sort: Goal</option></select>
          <select value={filter} onChange={e => setFilter(e.target.value)} aria-label="Filter subjects"><option value="all">All subjects</option><option value="pinned">Pinned</option><option value="favorite">Favorites</option><option value="complete">Completed</option></select>
        </div>
        <div className="sv-subject-toggle"><span className="sv-badge">{visibleSubjects.length} shown</span><span className="sv-badge">📌 {pinned.length} pinned</span><span className="sv-badge">⭐ {favorites.length} favorites</span></div>
      </section>

      <div className="sv-section-heading" style={{ marginTop: 25 }}><span className="sv-section-label">Your subjects</span><span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Select a subject below to keep your next goal in focus.</span></div>
      {loading ? <div className="sv-empty">Loading your subjects…</div> : visibleSubjects.length === 0 ? <div className="sv-subject-empty-card"><strong>{subjects.length ? 'No subjects found' : 'Your study space starts here'}</strong><span>{subjects.length ? 'Try another search or filter.' : 'Add your first subject above and start tracking your progress.'}</span></div> : <div className="sv-subject-grid">
        {visibleSubjects.map(sub => {
          const completed = subjectProgress[sub.id] || 0
          const percentage = Math.min((completed / Math.max(sub.goal_minutes || 1, 1)) * 100, 100)
          const isPinned = pinned.includes(sub.id), isFavorite = favorites.includes(sub.id)
          return <article className="sv-card sv-subject-card" key={sub.id}>
            <div className="sv-subject-top">
              <div><div className="sv-subject-title"><h3>{sub.name}</h3><button className="sv-subject-star" title={isFavorite ? 'Remove favorite' : 'Add favorite'} aria-label={isFavorite ? 'Remove favorite' : 'Add favorite'} onClick={() => toggleLocal(sub.id, setFavorites, 'studyverse-favorite-subjects')}>{isFavorite ? '⭐' : '☆'}</button></div><span className="sv-subject-goal">🎯 {sub.goal_minutes} min goal</span></div>
              <button className="sv-subject-star" title={isPinned ? 'Unpin subject' : 'Pin subject'} aria-label={isPinned ? 'Unpin subject' : 'Pin subject'} onClick={() => toggleLocal(sub.id, setPinned, 'studyverse-pinned-subjects')}>{isPinned ? '📌' : '📍'}</button>
            </div>
            <div className="sv-subject-progress"><div className="sv-subject-progress-row"><span>{completed} min studied</span><strong>{Math.round(percentage)}%</strong></div><div className="sv-progress-bg" role="progressbar" aria-valuenow={Math.round(percentage)} aria-valuemin={0} aria-valuemax={100} aria-label={`${sub.name} goal progress`}><div className="sv-progress-fill" style={{ width: `${percentage}%` }} /></div></div>
            <div className="sv-subject-actions"><small>{percentage >= 100 ? '✓ Goal reached — nice work!' : `${Math.max((sub.goal_minutes || 0) - completed, 0)} min to go`}</small><button className="sv-subject-remove" onClick={() => deleteSubject(sub.id)}>Remove</button></div>
          </article>
        })}
      </div>}
    </div>
  </div>
}
