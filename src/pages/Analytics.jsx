import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Navbar from '../components/Navbar'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  CartesianGrid, ResponsiveContainer, Cell
} from 'recharts'

const COLORS = ['#a855f7', '#ec4899', '#60a5fa', '#10b981', '#f59e0b', '#f87171']

// Custom tooltip for the chart
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const mins = Math.floor(payload[0].value / 60)
  const secs = payload[0].value % 60
  return (
    <div style={{
      background: '#1a1035',
      border: '1px solid rgba(168, 85, 247, 0.4)',
      borderRadius: '10px',
      padding: '10px 14px',
      fontSize: '13px',
      color: '#f1e8ff',
    }}>
      <strong style={{ color: '#f0abfc' }}>{label}</strong>
      <div style={{ marginTop: '4px', color: 'rgba(255,255,255,0.6)' }}>
        {mins > 0 ? `${mins}m ${secs}s` : `${secs}s`}
      </div>
    </div>
  )
}

export default function Analytics() {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading]   = useState(true)
  const [range, setRange]       = useState('all') // all | week | month

  useEffect(() => {
    fetchSessions().finally(() => setLoading(false))
  }, [])

  async function fetchSessions() {
    const { data, error } = await supabase
      .from('study_sessions')
      .select('*, subjects(*)')
      .order('created_at', { ascending: false })
    if (!error) setSessions(data || [])
  }

  // Filter by date range
  const filteredSessions = sessions.filter(s => {
    if (range === 'all') return true
    const date = new Date(s.created_at)
    const now  = new Date()
    if (range === 'week') {
      const weekAgo = new Date(now - 7 * 86400000)
      return date >= weekAgo
    }
    if (range === 'month') {
      const monthAgo = new Date(now - 30 * 86400000)
      return date >= monthAgo
    }
    return true
  })

  function formatTime(totalSeconds) {
    const hrs  = Math.floor(totalSeconds / 3600)
    const mins = Math.floor((totalSeconds % 3600) / 60)
    const secs = totalSeconds % 60
    if (hrs > 0) return `${hrs}h ${mins}m`
    if (mins > 0) return `${mins}m ${secs}s`
    return `${secs}s`
  }

  const totalStudyTime = filteredSessions.reduce((sum, s) => sum + (s.duration || 0), 0)
  const totalSessions  = filteredSessions.length
  const avgSession     = totalSessions > 0 ? Math.floor(totalStudyTime / totalSessions) : 0

  const subjectStats = {}
  filteredSessions.forEach(s => {
    const name = s.subjects?.name
    if (!name) return
    subjectStats[name] = (subjectStats[name] || 0) + s.duration
  })

  let topSubject = 'None'
  let maxDuration = 0
  Object.entries(subjectStats).forEach(([name, dur]) => {
    if (dur > maxDuration) { maxDuration = dur; topSubject = name }
  })

  const chartData = Object.entries(subjectStats)
    .map(([name, duration]) => ({ subject: name, seconds: duration }))
    .sort((a, b) => b.seconds - a.seconds)

  const STATS = [
    { label: 'Total Study Time', value: formatTime(totalStudyTime), icon: '⏱️' },
    { label: 'Sessions',         value: totalSessions,              icon: '🎯' },
    { label: 'Avg Session',      value: formatTime(avgSession),     icon: '📈' },
    { label: 'Top Subject',      value: topSubject,                 icon: '🏆' },
  ]

  return (
    <div className="sv-page">
      <Navbar />
      <div className="sv-container" style={{ paddingTop: '28px' }}>

        {/* Header */}
        <div style={s.header}>
          <div>
            <p style={s.welcomeLabel}>Your Performance</p>
            <h1 style={s.pageTitle}>Study <span style={s.accent}>Analytics</span></h1>
          </div>

          {/* Range Filter */}
          <div style={s.rangeRow}>
            {['week', 'month', 'all'].map(r => (
              <button
                key={r}
                style={{ ...s.rangeBtn, ...(range === r ? s.rangeBtnActive : {}) }}
                onClick={() => setRange(r)}
              >
                {r === 'week' ? '7 Days' : r === 'month' ? '30 Days' : 'All Time'}
              </button>
            ))}
          </div>
        </div>

        {/* Stat Cards */}
        <div style={s.statsGrid}>
          {STATS.map(({ label, value, icon }) => (
            <div key={label} className="sv-card" style={s.statCard}>
              <span style={s.statIcon}>{icon}</span>
              <div className="sv-stat-value">{value}</div>
              <div className="sv-stat-label">{label}</div>
            </div>
          ))}
        </div>

        {/* Bar Chart */}
        <div className="sv-card">
          <p className="sv-section-label">Study Time by Subject</p>
          {loading ? (
            <div style={s.empty}>Loading chart...</div>
          ) : chartData.length === 0 ? (
            <div style={s.empty}>No data yet. Start studying to see your stats! 📊</div>
          ) : (
            <div style={{ width: '100%', height: 280 }}>
              <ResponsiveContainer>
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis
                    dataKey="subject"
                    tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={v => `${Math.floor(v/60)}m`}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(168,85,247,0.08)' }} />
                  <Bar dataKey="seconds" radius={[8, 8, 0, 0]} maxBarSize={60}>
                    {chartData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} fillOpacity={0.85} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Subject Breakdown */}
        {chartData.length > 0 && (
          <div className="sv-card">
            <p className="sv-section-label">Subject Breakdown</p>
            <div style={s.breakdownList}>
              {chartData.map((item, i) => {
                const pct = Math.round((item.seconds / totalStudyTime) * 100)
                const color = COLORS[i % COLORS.length]
                return (
                  <div key={item.subject} style={s.breakdownRow}>
                    <div style={s.breakdownLeft}>
                      <span style={{ ...s.breakdownDot, background: color }} />
                      <span style={s.breakdownName}>{item.subject}</span>
                    </div>
                    <div style={s.breakdownRight}>
                      <span style={s.breakdownTime}>{formatTime(item.seconds)}</span>
                      <span style={s.breakdownPct}>{pct}%</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Session History */}
        <div className="sv-card">
          <p className="sv-section-label">Session History ({totalSessions})</p>
          {filteredSessions.length === 0 ? (
            <div style={s.empty}>No sessions in this period.</div>
          ) : (
            <div style={s.historyList}>
              {filteredSessions.map((session, i) => (
                <div key={session.id} style={{
                  ...s.historyRow,
                  borderBottom: i < filteredSessions.length - 1
                    ? '1px solid rgba(255,255,255,0.04)' : 'none'
                }}>
                  <div style={s.historyLeft}>
                    <span style={s.historyDot} />
                    <div>
                      <div style={s.historySubject}>
                        {session.subjects?.name || 'Unknown Subject'}
                      </div>
                      <div style={s.historyDate}>
                        {new Date(session.created_at).toLocaleDateString('en-US', {
                          weekday: 'short', month: 'short', day: 'numeric',
                          hour: '2-digit', minute: '2-digit'
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
    marginBottom: '24px',
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
  rangeRow: { display: 'flex', gap: '8px' },
  rangeBtn: {
    padding: '7px 14px',
    borderRadius: '8px',
    background: 'transparent',
    border: '1px solid rgba(255,255,255,0.1)',
    color: 'rgba(255,255,255,0.4)',
    fontSize: '12px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.18s',
  },
  rangeBtnActive: {
    background: 'rgba(168, 85, 247, 0.15)',
    border: '1px solid rgba(168, 85, 247, 0.4)',
    color: '#f0abfc',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
    gap: '12px',
    marginBottom: '16px',
  },
  statCard: { textAlign: 'center', padding: '18px 12px', margin: 0 },
  statIcon: { fontSize: '22px', display: 'block', marginBottom: '10px' },
  breakdownList: { display: 'flex', flexDirection: 'column', gap: '10px' },
  breakdownRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  breakdownLeft: { display: 'flex', alignItems: 'center', gap: '10px' },
  breakdownDot: {
    width: '10px', height: '10px',
    borderRadius: '50%', flexShrink: 0,
  },
  breakdownName: { fontSize: '14px', fontWeight: 600, color: '#f1e8ff' },
  breakdownRight: { display: 'flex', gap: '12px', alignItems: 'center' },
  breakdownTime: { fontSize: '13px', color: 'rgba(255,255,255,0.6)', fontWeight: 600 },
  breakdownPct: { fontSize: '12px', color: 'rgba(255,255,255,0.35)', minWidth: '35px', textAlign: 'right' },
  historyList: { display: 'flex', flexDirection: 'column' },
  historyRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '11px 0',
  },
  historyLeft: { display: 'flex', alignItems: 'center', gap: '12px' },
  historyDot: {
    width: '8px', height: '8px',
    borderRadius: '50%', background: '#a855f7', flexShrink: 0,
  },
  historySubject: { fontSize: '14px', fontWeight: 600, color: '#f1e8ff' },
  historyDate: { fontSize: '12px', color: 'rgba(255,255,255,0.35)', marginTop: '2px' },
  empty: {
    textAlign: 'center',
    color: 'rgba(255,255,255,0.3)',
    padding: '40px 20px',
    fontSize: '14px',
  },
}