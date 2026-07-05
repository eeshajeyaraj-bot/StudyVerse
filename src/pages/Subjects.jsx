import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Navbar from '../components/Navbar'

export default function Subjects() {
  const [subject, setSubject]         = useState('')
  const [goalMinutes, setGoalMinutes] = useState(60)
  const [subjects, setSubjects]       = useState([])
  const [sessions, setSessions]       = useState([])
  const [loading, setLoading]         = useState(true)

  useEffect(() => {
    Promise.all([fetchSubjects(), fetchSessions()])
      .finally(() => setLoading(false))
  }, [])

  async function fetchSubjects() {
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('subjects')
      .select('*')
      .eq('user_id', user.id)
    if (!error) setSubjects(data || [])
  }

  async function fetchSessions() {
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('study_sessions')
      .select('*')
      .eq('user_id', user.id)
    if (!error) setSessions(data || [])
  }

  async function addSubject() {
    if (!subject.trim()) return
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase
      .from('subjects')
      .insert([{ user_id: user.id, name: subject.trim(), goal_minutes: goalMinutes }])
    if (!error) {
      setSubject('')
      setGoalMinutes(60)
      fetchSubjects()
    }
  }

  async function deleteSubject(id) {
    await supabase.from('subjects').delete().eq('id', id)
    fetchSubjects()
  }

  const subjectProgress = {}
  sessions.forEach(session => {
    const id = session.subject_id
    if (!id) return
    subjectProgress[id] = (subjectProgress[id] || 0) + Math.floor((session.duration || 0) / 60)
  })

  const COLORS = ['#a855f7', '#ec4899', '#60a5fa', '#10b981', '#f59e0b', '#f87171']
  const getColor = (i) => COLORS[i % COLORS.length]

  return (
    <div className="sv-page">
      <Navbar />
      <div className="sv-container" style={{ paddingTop: '28px' }}>

        <div style={s.header}>
          <div>
            <p style={s.welcomeLabel}>Manage Your</p>
            <h1 style={s.pageTitle}>Study <span style={s.accent}>Subjects</span></h1>
          </div>
          <div style={s.totalBadge}>
            <span style={s.totalNum}>{subjects.length}</span>
            <span style={s.totalLabel}>Active Quests</span>
          </div>
        </div>

        <div className="sv-card" style={s.addCard}>
          <p className="sv-section-label">Add New Subject</p>
          <div style={s.inputRow}>
            <input
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="Subject name (e.g. Mathematics)"
              onKeyDown={e => e.key === 'Enter' && addSubject()}
              style={s.input}
            />
            <div style={s.goalRow}>
              <input
                type="number"
                value={goalMinutes}
                onChange={e => setGoalMinutes(Number(e.target.value))}
                placeholder="Goal (min)"
                style={{ ...s.input, maxWidth: '130px' }}
                min={1}
              />
              <button className="sv-btn-primary" onClick={addSubject} style={s.addBtn}>
                + Add Subject
              </button>
            </div>
          </div>
        </div>

        <p className="sv-section-label" style={{ marginBottom: '12px' }}>
          Your Subjects ({subjects.length})
        </p>

        {loading ? (
          <div style={s.empty}>Loading subjects...</div>
        ) : subjects.length === 0 ? (
          <div style={s.empty}>
            No subjects yet. Add your first study quest above! 🎯
          </div>
        ) : (
          <div style={s.subjectGrid}>
            {subjects.map((sub, i) => {
              const completed  = subjectProgress[sub.id] || 0
              const percentage = Math.min((completed / sub.goal_minutes) * 100, 100)
              const color      = getColor(i)
              const isDone     = percentage >= 100

              return (
                <div key={sub.id} className="sv-card" style={s.subjectCard}>
                  <div style={s.subjectTop}>
                    <div style={{ ...s.subjectDot, background: color }} />
                    <div style={s.subjectInfo}>
                      <h3 style={s.subjectName}>{sub.name}</h3>
                      <span style={s.subjectGoal}>{sub.goal_minutes} min goal</span>
                    </div>
                    {isDone && <span style={s.doneBadge}>✓ Done</span>}
                  </div>

                  <div style={s.progressSection}>
                    <div style={s.progressLabel}>
                      <span style={s.progressTime}>{completed} min</span>
                      <span style={s.progressPct}>{Math.round(percentage)}%</span>
                    </div>
                    <div className="sv-progress-bg">
                      <div
                        className="sv-progress-fill"
                        style={{
                          width: `${percentage}%`,
                          background: isDone
                            ? `linear-gradient(90deg, #10b981, #34d399)`
                            : `linear-gradient(90deg, ${color}99, ${color})`,
                        }}
                      />
                    </div>
                  </div>

                  <div style={s.subjectFooter}>
                    <span style={s.remainingText}>
                      {isDone
                        ? '🏆 Goal reached!'
                        : `${sub.goal_minutes - completed} min remaining`
                      }
                    </span>
                    <button className="sv-btn-danger" onClick={() => deleteSubject(sub.id)}>
                      🗑️ Remove
                    </button>
                  </div>
                </div>
              )
            })}
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
  totalBadge: {
    textAlign: 'center',
    background: 'rgba(168, 85, 247, 0.1)',
    border: '1px solid rgba(168, 85, 247, 0.25)',
    borderRadius: '12px',
    padding: '14px 20px',
    minWidth: '110px',
  },
  totalNum: {
    display: 'block',
    fontSize: '28px',
    fontWeight: 700,
    color: '#f0abfc',
    lineHeight: 1,
  },
  totalLabel: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.4)',
    marginTop: '4px',
    display: 'block',
  },
  addCard: { marginBottom: '24px' },
  inputRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  goalRow: {
    display: 'flex',
    gap: '10px',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  input: { flex: 1 },
  addBtn: { whiteSpace: 'nowrap', padding: '10px 20px' },
  subjectGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '14px',
  },
  subjectCard: { padding: '18px', margin: 0 },
  subjectTop: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    marginBottom: '16px',
  },
  subjectDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    flexShrink: 0,
    marginTop: '5px',
  },
  subjectInfo: { flex: 1 },
  subjectName: {
    fontSize: '16px',
    fontWeight: 700,
    color: '#f1e8ff',
    marginBottom: '3px',
  },
  subjectGoal: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.35)',
  },
  doneBadge: {
    fontSize: '11px',
    fontWeight: 700,
    color: '#10b981',
    background: 'rgba(16, 185, 129, 0.12)',
    border: '1px solid rgba(16, 185, 129, 0.3)',
    borderRadius: '8px',
    padding: '3px 9px',
    whiteSpace: 'nowrap',
  },
  progressSection: { marginBottom: '14px' },
  progressLabel: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '7px',
  },
  progressTime: { fontSize: '13px', color: 'rgba(255,255,255,0.6)', fontWeight: 600 },
  progressPct: { fontSize: '13px', color: 'rgba(255,255,255,0.4)' },
  subjectFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: '12px',
    borderTop: '1px solid rgba(255,255,255,0.05)',
  },
  remainingText: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.35)',
  },
  empty: {
    textAlign: 'center',
    color: 'rgba(255,255,255,0.3)',
    padding: '50px 20px',
    fontSize: '14px',
  },
}
