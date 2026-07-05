import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'

export default function Dashboard() {
  const [sessions, setSessions]       = useState([])
  const [playerStats, setPlayerStats] = useState(null)
  const [loading, setLoading]         = useState(true)

  useEffect(() => {
    Promise.all([fetchSessions(), fetchPlayerStats()])
      .finally(() => setLoading(false))
  }, [])

  async function fetchSessions() {
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('study_sessions')
      .select('*, subjects(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    if (!error) setSessions(data || [])
  }

  async function fetchPlayerStats() {
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase
      .from('player_stats')
      .select('*')
      .eq('user_id', user.id)
    if (data && data.length > 0) setPlayerStats(data[0])
  }

  function formatTime(totalSeconds) {
    const hrs  = Math.floor(totalSeconds / 3600)
    const mins = Math.floor((totalSeconds % 3600) / 60)
    const secs = totalSeconds % 60
    if (hrs > 0) return `${hrs}h ${mins}m`
    if (mins > 0) return `${mins}m ${secs}s`
    return `${secs}s`
  }

  const totalStudyTime = sessions.reduce((sum, s) => sum + (s.duration || 0), 0)
  const totalSessions  = sessions.length
  const today          = new Date().toDateString()
  const todayStudyTime = sessions
    .filter(s => new Date(s.created_at).toDateString() === today)
    .reduce((sum, s) => sum + (s.duration || 0), 0)

  const subjectStats = {}
  sessions.forEach(s => {
    const name = s.subjects?.name
    if (!name) return
    subjectStats[name] = (subjectStats[name] || 0) + s.duration
  })

  let topSubject  = 'None'
  let maxDuration = 0
  Object.entries(subjectStats).forEach(([name, dur]) => {
    if (dur > maxDuration) { maxDuration = dur; topSubject = name }
  })

  const studyDates = [...new Set(
    sessions.map(s => new Date(s.created_at).toISOString().split('T')[0])
  )].sort()

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
  const xpPercent   = xpIntoLevel

  const STATS = [
    { label: 'Total Study Time', value: formatTime(totalStudyTime), icon: '⏱️' },
    { label: 'Sessions Done',    value: totalSessions,              icon: '🎯' },
    { label: "Today's Study",    value: formatTime(todayStudyTime), icon: '📅' },
    { label: 'Top Subject',      value: topSubject,                 icon: '🏆' },
    { label: 'Study Streak',     value: `${currentStreak} Days`,   icon: '🔥' },
  ]

  return (
    <div className="sv-page">
      <Navbar />
      <div className="sv-container" style={{ paddingTop: '28px' }}>

        <div style={s.header}>
          <div>
            <p style={s.welcomeLabel}>Welcome back, Scholar</p>
            <h1 style={s.pageTitle}>
              Your <span style={s.accent}>Quest</span> Awaits
            </h1>
          </div>
          {playerStats && (
            <div style={s.playerCard}>
              <div style={s.playerTop}>
                <span style={s.playerLevel}>Lv.{playerStats.level}</span>
                <span style={s.playerXP}>{xpIntoLevel}/100 XP</span>
              </div>
              <div className="sv-progress-bg" style={{ marginTop: '8px' }}>
                <div className="sv-progress-fill" style={{ width: `${xpPercent}%` }} />
              </div>
            </div>
          )}
        </div>

        <div style={s.statsGrid}>
          {STATS.map(({ label, value, icon }) => (
            <div key={label} className="sv-card" style={s.statCard}>
              <span style={s.statIcon}>{icon}</span>
              <div className="sv-stat-value">{value}</div>
              <div className="sv-stat-label">{label}</div>
            </div>
          ))}
        </div>

        <div style={s.sectionHeader}>
          <span className="sv-section-label">Quick Actions</span>
        </div>
        <div style={s.quickActions}>
          {[
            { to: '/timer',     label: 'Start Session', icon: '⚔️',  desc: 'Begin a study quest' },
            { to: '/tasks',     label: 'View Tasks',    icon: '📋',  desc: 'Manage your missions' },
            { to: '/subjects',  label: 'Subjects',      icon: '📚',  desc: 'Track your goals' },
            { to: '/analytics', label: 'Analytics',     icon: '📊',  desc: 'See your progress' },
          ].map(({ to, label, icon, desc }) => (
            <Link key={to} to={to} style={s.actionCard}>
              <span style={s.actionIcon}>{icon}</span>
              <div style={s.actionLabel}>{label}</div>
              <div style={s.actionDesc}>{desc}</div>
            </Link>
          ))}
        </div>

        <div style={{ ...s.sectionHeader, marginTop: '24px' }}>
          <span className="sv-section-label">Recent Sessions</span>
        </div>

        {loading ? (
          <div style={s.empty}>Loading sessions...</div>
        ) : sessions.length === 0 ? (
          <div style={s.empty}>
            No sessions yet. <Link to="/timer" style={{ color: '#a855f7' }}>Start your first quest →</Link>
          </div>
        ) : (
          <div className="sv-card" style={{ padding: '8px' }}>
            {sessions.slice(0, 8).map((session, i) => (
              <div key={session.id} style={{
                ...s.sessionRow,
                borderBottom: i < Math.min(sessions.length, 8) - 1
                  ? '1px solid rgba(255,255,255,0.05)' : 'none'
              }}>
                <div style={s.sessionLeft}>
                  <span style={s.sessionDot} />
                  <div>
                    <div style={s.sessionSubject}>
                      {session.subjects?.name || 'Unknown Subject'}
                    </div>
                    <div style={s.sessionDate}>
                      {new Date(session.created_at).toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                    </div>
                  </div>
                </div>
                <span className="sv-badge">{formatTime(session.duration)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const s = {
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: '16px',
    marginBottom: '28px',
  },
  welcomeLabel: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.4)',
    marginBottom: '4px',
    fontWeight: 500,
  },
  pageTitle: {
    fontSize: '28px',
    fontWeight: 700,
    color: '#f1e8ff',
    lineHeight: 1.2,
  },
  accent: {
    background: 'linear-gradient(90deg, #f0abfc, #a855f7)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  playerCard: {
    background: 'rgba(168, 85, 247, 0.1)',
    border: '1px solid rgba(168, 85, 247, 0.25)',
    borderRadius: '12px',
    padding: '14px 18px',
    minWidth: '180px',
  },
  playerTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  playerLevel: { fontWeight: 700, fontSize: '16px', color: '#f0abfc' },
  playerXP: { fontSize: '12px', color: 'rgba(255,255,255,0.4)' },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
    gap: '12px',
    marginBottom: '28px',
  },
  statCard: { textAlign: 'center', padding: '18px 12px', margin: 0 },
  statIcon: { fontSize: '22px', display: 'block', marginBottom: '10px' },
  sectionHeader: { marginBottom: '12px' },
  quickActions: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
    gap: '12px',
    marginBottom: '8px',
  },
  actionCard: {
    display: 'block',
    padding: '18px',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(168, 85, 247, 0.2)',
    borderRadius: '14px',
    textDecoration: 'none',
    transition: 'all 0.2s ease',
    cursor: 'pointer',
  },
  actionIcon: { fontSize: '24px', display: 'block', marginBottom: '10px' },
  actionLabel: { fontWeight: 600, fontSize: '14px', color: '#f1e8ff', marginBottom: '4px' },
  actionDesc: { fontSize: '12px', color: 'rgba(255,255,255,0.35)' },
  sessionRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 14px',
  },
  sessionLeft: { display: 'flex', alignItems: 'center', gap: '12px' },
  sessionDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: '#a855f7',
    flexShrink: 0,
  },
  sessionSubject: { fontWeight: 600, fontSize: '14px', color: '#f1e8ff' },
  sessionDate: { fontSize: '12px', color: 'rgba(255,255,255,0.35)', marginTop: '2px' },
  empty: {
    textAlign: 'center',
    color: 'rgba(255,255,255,0.3)',
    padding: '40px 20px',
    fontSize: '14px',
  },
}
