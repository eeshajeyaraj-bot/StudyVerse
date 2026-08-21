import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Link } from 'react-router-dom'

export default function Dashboard() {
  const [sessions, setSessions] = useState([])
  const [playerStats, setPlayerStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([fetchSessions(), fetchPlayerStats()]).finally(() => setLoading(false))
  }, [])

  async function fetchSessions() {
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase.from('study_sessions').select('*, subjects(*)').eq('user_id', user.id).order('created_at', { ascending: false })
    if (!error) setSessions(data || [])
  }

  async function fetchPlayerStats() {
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase.from('player_stats').select('*').eq('user_id', user.id)
    if (data && data.length > 0) setPlayerStats(data[0])
  }

  function formatTime(totalSeconds) {
    const hrs = Math.floor(totalSeconds / 3600)
    const mins = Math.floor((totalSeconds % 3600) / 60)
    const secs = totalSeconds % 60
    if (hrs > 0) return `${hrs}h ${mins}m`
    if (mins > 0) return `${mins}m ${secs}s`
    return `${secs}s`
  }

  const totalStudyTime = sessions.reduce((sum, s) => sum + (s.duration || 0), 0)
  const totalSessions = sessions.length
  const today = new Date().toDateString()
  const todayStudyTime = sessions.filter(s => new Date(s.created_at).toDateString() === today).reduce((sum, s) => sum + (s.duration || 0), 0)
  const subjectStats = {}
  sessions.forEach(s => { const name = s.subjects?.name; if (name) subjectStats[name] = (subjectStats[name] || 0) + s.duration })
  let topSubject = 'None', maxDuration = 0
  Object.entries(subjectStats).forEach(([name, dur]) => { if (dur > maxDuration) { maxDuration = dur; topSubject = name } })
  const studyDates = [...new Set(sessions.map(s => new Date(s.created_at).toISOString().split('T')[0]))].sort()
  let currentStreak = 0
  if (studyDates.length > 0) {
    currentStreak = 1
    for (let i = studyDates.length - 1; i > 0; i--) {
      const diff = (new Date(studyDates[i]) - new Date(studyDates[i - 1])) / 86400000
      if (diff === 1) currentStreak++
      else break
    }
  }
  const xpIntoLevel = playerStats ? playerStats.xp % 100 : 0
  const STATS = [
    { label: 'Total Study Time', value: formatTime(totalStudyTime), icon: '⏱️' },
    { label: 'Sessions Done', value: totalSessions, icon: '🎯' },
    { label: "Today's Study", value: formatTime(todayStudyTime), icon: '📅' },
    { label: 'Top Subject', value: topSubject, icon: '🏆' },
    { label: 'Study Streak', value: `${currentStreak} Days`, icon: '🔥' },
  ]

  return (
    <div className="sv-page">
      <div className="sv-container sv-dashboard-page">
        <div className="sv-page-header">
          <div><p className="sv-eyebrow">Welcome back, Scholar</p><h1>Your <span className="sv-gradient-text">Quest</span> Awaits</h1></div>
          {playerStats && <div className="sv-level-card"><div><strong>Lv.{playerStats.level}</strong><span>{xpIntoLevel}/100 XP</span></div><div className="sv-progress-bg"><div className="sv-progress-fill" style={{ width: `${xpIntoLevel}%` }} /></div></div>}
        </div>

        <div className="sv-stats-grid">{STATS.map(({ label, value, icon }) => <div key={label} className="sv-card sv-stat-card"><span>{icon}</span><strong>{value}</strong><small>{label}</small></div>)}</div>

        <div className="sv-section-heading"><span className="sv-section-label">Quick Actions</span></div>
        <div className="sv-action-grid">{[
          { to: '/timer', label: 'Start Session', icon: '⚔️', desc: 'Begin a study quest' },
          { to: '/tasks', label: 'View Tasks', icon: '📋', desc: 'Manage your missions' },
          { to: '/subjects', label: 'Subjects', icon: '📚', desc: 'Track your goals' },
          { to: '/analytics', label: 'Analytics', icon: '📊', desc: 'See your progress' },
        ].map(({ to, label, icon, desc }) => <Link key={to} to={to} className="sv-action-card"><span>{icon}</span><strong>{label}</strong><small>{desc}</small></Link>)}</div>

        <div className="sv-section-heading"><span className="sv-section-label">Recent Sessions</span></div>
        {loading ? <div className="sv-empty">Loading sessions...</div> : sessions.length === 0 ? <div className="sv-empty">No sessions yet. <Link to="/timer">Start your first quest →</Link></div> : <div className="sv-card sv-list">{sessions.slice(0, 8).map((session, i) => <div className="sv-list-row" key={session.id}><div className="sv-list-main"><i /><div><strong>{session.subjects?.name || 'Unknown Subject'}</strong><small>{new Date(session.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</small></div></div><span className="sv-badge">{formatTime(session.duration)}</span></div>)}</div>}
      </div>
    </div>
  )
}
