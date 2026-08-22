import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Link } from 'react-router-dom'

const DAY = 86400000
const pad = n => String(n).padStart(2, '0')
const dateKey = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

export default function Dashboard() {
  const [sessions, setSessions] = useState([])
  const [tasks, setTasks] = useState([])
  const [subjects, setSubjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [heatRange, setHeatRange] = useState('year')
  const [heatSubject, setHeatSubject] = useState('all')
  const [weeklyGoal, setWeeklyGoal] = useState(() => Number(localStorage.getItem('studyverse-weekly-goal')) || 10)

  useEffect(() => { loadDashboard().finally(() => setLoading(false)) }, [])

  async function loadDashboard() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const [sessionResult, taskResult, subjectResult] = await Promise.all([
      supabase.from('study_sessions').select('*, subjects(*)').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('tasks').select('*, subjects(*)').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('subjects').select('*').eq('user_id', user.id).order('name'),
    ])
    if (!sessionResult.error) setSessions(sessionResult.data || [])
    if (!taskResult.error) setTasks(taskResult.data || [])
    if (!subjectResult.error) setSubjects(subjectResult.data || [])
  }

  function formatTime(s) {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60
    if (h > 0) return `${h}h ${m}m`
    if (m > 0) return `${m}m ${sec}s`
    return `${sec}s`
  }

  function changeGoal(value) {
    const next = Math.max(1, Math.min(168, Number(value) || 1))
    setWeeklyGoal(next)
    localStorage.setItem('studyverse-weekly-goal', String(next))
  }

  const today = new Date()
  const todayKey = dateKey(today)
  const weekStart = new Date(today)
  weekStart.setHours(0, 0, 0, 0)
  weekStart.setDate(weekStart.getDate() - weekStart.getDay())

  const todayStudyTime = sessions.filter(s => dateKey(new Date(s.created_at)) === todayKey).reduce((sum, s) => sum + (s.duration || 0), 0)
  const weekSessions = sessions.filter(s => new Date(s.created_at) >= weekStart)
  const weekStudyTime = weekSessions.reduce((sum, s) => sum + (s.duration || 0), 0)
  const goalPct = Math.min(100, Math.round((weekStudyTime / (weeklyGoal * 3600)) * 100))
  const doneCount = tasks.filter(t => t.completed).length
  const pendingTasks = tasks.filter(t => !t.completed).slice(0, 5)
  const completionPct = tasks.length ? Math.round((doneCount / tasks.length) * 100) : 0

  const subjectStats = {}
  sessions.forEach(s => {
    const name = s.subjects?.name
    if (name) subjectStats[name] = (subjectStats[name] || 0) + (s.duration || 0)
  })
  const topSubject = Object.entries(subjectStats).sort((a, b) => b[1] - a[1])[0]?.[0] || '—'

  const streak = useMemo(() => {
    const dates = [...new Set(sessions.map(s => dateKey(new Date(s.created_at))))].sort()
    if (!dates.length) return 0
    let value = 1
    for (let i = dates.length - 1; i > 0; i--) {
      if (Math.round((new Date(dates[i]) - new Date(dates[i - 1])) / DAY) === 1) value++
      else break
    }
    return value
  }, [sessions])

  const heatmap = useMemo(() => {
    const days = heatRange === 'week' ? 7 : heatRange === 'month' ? 30 : 365
    const start = new Date(today)
    start.setHours(0, 0, 0, 0)
    start.setDate(start.getDate() - (days - 1))
    const totals = {}
    sessions.forEach(s => {
      if (heatSubject !== 'all' && s.subjects?.name !== heatSubject) return
      const key = dateKey(new Date(s.created_at))
      totals[key] = (totals[key] || 0) + (s.duration || 0)
    })
    return Array.from({ length: days }, (_, index) => {
      const d = new Date(start)
      d.setDate(start.getDate() + index)
      const seconds = totals[dateKey(d)] || 0
      const level = seconds === 0 ? 0 : seconds < 900 ? 1 : seconds < 1800 ? 2 : seconds < 3600 ? 3 : 4
      return { key: dateKey(d), label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), seconds, level }
    })
  }, [sessions, heatRange, heatSubject])

  const rating = Math.min(100, Math.round(goalPct * 0.55 + Math.min(streak, 14) / 14 * 25 + completionPct * 0.2))
  const stats = [
    ['Total Study Time', formatTime(sessions.reduce((sum, s) => sum + (s.duration || 0), 0)), '⏱️'],
    ['Today', formatTime(todayStudyTime), '📅'],
    ['Sessions', sessions.length, '📚'],
    ['Study Streak', `${streak} days`, '🔥'],
    ['Top Subject', topSubject, '🏆'],
  ]

  return <div className="sv-page"><div className="sv-container sv-dashboard-page">
    <div className="sv-page-header"><div><p className="sv-eyebrow">Overview</p><h1>Good to see you back.</h1><p className="sv-page-subtitle">Your goals, consistency, recent sessions and tasks — all in one place.</p></div></div>

    <div className="sv-stats-grid">{stats.map(([label, value, icon]) => <div key={label} className="sv-card sv-stat-card"><span>{icon}</span><strong>{value}</strong><small>{label}</small></div>)}</div>

    <div className="sv-dashboard-two-col">
      <section className="sv-card sv-goal-card">
        <div className="sv-section-heading"><span className="sv-section-label">Goal Progress</span><span className="sv-badge">{goalPct}% this week</span></div>
        <div className="sv-goal-row"><strong>{formatTime(weekStudyTime)}</strong><span>of {weeklyGoal}h weekly goal</span></div>
        <div className="sv-progress-bg"><div className="sv-progress-fill" style={{ width: `${goalPct}%` }} /></div>
        <label className="sv-goal-control">Weekly target (hours)<input type="number" min="1" max="168" value={weeklyGoal} onChange={e => changeGoal(e.target.value)} /></label>
      </section>
      <section className="sv-card sv-rating-card"><span className="sv-section-label">Productivity Rating</span><strong>{rating}/100</strong><small>{rating >= 80 ? 'Excellent consistency — keep going.' : rating >= 60 ? 'Good momentum — a little more focus will raise it.' : 'Build a steady routine and your score will grow.'}</small></section>
    </div>

    <div className="sv-section-heading"><span className="sv-section-label">Quick Actions</span></div>
    <div className="sv-action-grid">{[['/timer','Start a Session','⏱️','Focus for a set amount of time'],['/tasks','Tasks','✓','Review and manage your tasks'],['/subjects','Subjects','📚','Track your subjects'],['/analytics','Analytics','▥','View your study insights'],['/calendar','Calendar','📅','Plan your study schedule']].map(([to, label, icon, desc]) => <Link key={to} to={to} className="sv-action-card"><span>{icon}</span><strong>{label}</strong><small>{desc}</small></Link>)}</div>

    <section className="sv-card sv-heatmap-card">
      <div className="sv-section-heading"><div><span className="sv-section-label">Study Consistency</span><h2>365-day study heatmap</h2></div><div className="sv-heat-controls"><select value={heatRange} onChange={e => setHeatRange(e.target.value)}><option value="week">Week</option><option value="month">Month</option><option value="year">Year</option></select><select value={heatSubject} onChange={e => setHeatSubject(e.target.value)}><option value="all">All subjects</option>{subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}</select></div></div>
      <div className="sv-heatmap-grid">{heatmap.map(day => <span key={day.key} className={`sv-heat-cell level-${day.level}`} title={`${day.label}: ${formatTime(day.seconds)}`} />)}</div>
      <div className="sv-heatmap-legend"><span>Less</span><i className="level-0"/><i className="level-1"/><i className="level-2"/><i className="level-3"/><i className="level-4"/><span>More</span></div>
    </section>

    <div className="sv-dashboard-two-col">
      <section className="sv-card"><div className="sv-section-heading"><span className="sv-section-label">Upcoming Tasks</span><Link to="/tasks">View all →</Link></div>{loading ? <div className="sv-empty">Loading...</div> : pendingTasks.length === 0 ? <div className="sv-empty">No pending tasks. Nice work! ✨</div> : <div className="sv-list">{pendingTasks.map(task => <div className="sv-list-row" key={task.id}><div className="sv-list-main"><i/><div><strong>{task.title}</strong><small>{task.subjects?.name || 'General study'}</small></div></div><span className="sv-badge">Pending</span></div>)}</div>}</section>
      <section className="sv-card"><div className="sv-section-heading"><span className="sv-section-label">Recent Sessions</span><Link to="/analytics">Analytics →</Link></div>{loading ? <div className="sv-empty">Loading sessions...</div> : sessions.length === 0 ? <div className="sv-empty">No study sessions yet. <Link to="/timer">Start a session →</Link></div> : <div className="sv-list">{sessions.slice(0, 6).map(session => <div className="sv-list-row" key={session.id}><div className="sv-list-main"><i/><div><strong>{session.subjects?.name || 'General Study'}</strong><small>{new Date(session.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</small></div></div><span className="sv-badge">{formatTime(session.duration)}</span></div>)}</div>}</section>
    </div>
  </div></div>
}
