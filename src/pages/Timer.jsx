import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Navbar from '../components/Navbar'

export default function Timer() {
  const [subjects, setSubjects]                   = useState([])
  const [isRunning, setIsRunning]                 = useState(false)
  const [seconds, setSeconds]                     = useState(0)
  const [selectedSubject, setSelectedSubject]     = useState('')
  const [selectedSubjectId, setSelectedSubjectId] = useState(null)
  const [startTime, setStartTime]                 = useState(null)
  const [playerStats, setPlayerStats]             = useState(null)
  const [xpGained, setXpGained]                   = useState(null)
  const [showXPPopup, setShowXPPopup]             = useState(false)

  useEffect(() => {
    fetchSubjects()
    fetchPlayerStats()
  }, [])

  useEffect(() => {
    let interval
    if (isRunning) {
      interval = setInterval(() => setSeconds(prev => prev + 1), 1000)
    }
    return () => clearInterval(interval)
  }, [isRunning])

  async function fetchSubjects() {
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('subjects')
      .select('*')
      .eq('user_id', user.id)
    if (!error) setSubjects(data || [])
  }

  async function fetchPlayerStats() {
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('player_stats')
      .select('*')
      .eq('user_id', user.id)
    console.log('🔍 player_stats:', data, error)
    if (error) { console.error('❌ RLS may be blocking:', error.message); return }

    if (!data || data.length === 0) {
      const { data: newPlayer, error: insertError } = await supabase
        .from('player_stats')
        .insert([{ user_id: user.id, xp: 0, level: 1 }])
        .select()
        .single()
      if (!insertError) setPlayerStats(newPlayer)
      return
    }
    setPlayerStats(data[0])
  }

  function handleStartSubject(sub) {
    if (isRunning) {
      alert('⚠️ Stop the current session before switching subjects!')
      return
    }
    setSelectedSubject(sub.name)
    setSelectedSubjectId(sub.id)
    setStartTime(new Date().toISOString())
    setSeconds(0)
    setIsRunning(true)
  }

  async function stopTimer() {
    setIsRunning(false)
    if (seconds === 0 || !selectedSubjectId) return

    const { data: { user } } = await supabase.auth.getUser()
    const endTime = new Date().toISOString()

    const { error: sessionError } = await supabase
      .from('study_sessions')
      .insert([{
        user_id: user.id,
        subject_id: selectedSubjectId,
        start_time: startTime,
        end_time: endTime,
        duration: seconds
      }])

    if (sessionError) { alert('❌ Failed to save session: ' + sessionError.message); return }

    if (!playerStats) { alert('⚠️ Player stats not loaded'); return }

    const gainedXP = Math.floor(seconds / 60) * 2
    const newXP    = playerStats.xp + gainedXP
    const newLevel = Math.floor(newXP / 100) + 1

    const { error: updateError } = await supabase
      .from('player_stats')
      .update({ xp: newXP, level: newLevel })
      .eq('id', playerStats.id)

    if (updateError) { alert('❌ Failed to update XP: ' + updateError.message); return }

    setPlayerStats({ ...playerStats, xp: newXP, level: newLevel })
    setXpGained(gainedXP)
    setShowXPPopup(true)
    setSeconds(0)
    setSelectedSubject('')
    setSelectedSubjectId(null)
    setStartTime(null)
    setTimeout(() => setShowXPPopup(false), 3500)
  }

  function formatTime(totalSeconds) {
    const hrs  = String(Math.floor(totalSeconds / 3600)).padStart(2, '0')
    const mins = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0')
    const secs = String(totalSeconds % 60).padStart(2, '0')
    return `${hrs}:${mins}:${secs}`
  }

  const xpIntoLevel    = playerStats ? playerStats.xp % 100 : 0
  const xpPercent      = xpIntoLevel
  const minutesStudied = Math.floor(seconds / 60)
  const previewXP      = minutesStudied * 2

  return (
    <div className="sv-page">
      <Navbar />

      {showXPPopup && (
        <div style={s.xpPopup}>
          ✨ Quest Complete! +{xpGained} XP · Level {playerStats?.level}
        </div>
      )}

      <div className="sv-container" style={{ paddingTop: '28px' }}>

        <div style={s.header}>
          <div>
            <p style={s.welcomeLabel}>Focus Mode</p>
            <h1 style={s.pageTitle}>Study <span style={s.accent}>Quest</span></h1>
          </div>
          {playerStats && (
            <div style={s.playerCard}>
              <div style={s.playerTop}>
                <span style={s.playerLevel}>⚔️ Level {playerStats.level}</span>
                <span style={s.playerXP}>{xpIntoLevel}/100 XP</span>
              </div>
              <div className="sv-progress-bg" style={{ marginTop: '8px' }}>
                <div className="sv-progress-fill" style={{ width: `${xpPercent}%` }} />
              </div>
            </div>
          )}
        </div>

        <div className="sv-card">
          <p className="sv-section-label">Choose Your Quest</p>
          {subjects.length === 0 ? (
            <p style={s.emptyText}>No subjects yet. Add some in the Subjects page.</p>
          ) : (
            <div style={s.subjectGrid}>
              {subjects.map(sub => {
                const active = selectedSubject === sub.name && isRunning
                return (
                  <button
                    key={sub.id}
                    style={{ ...s.subjectBtn, ...(active ? s.subjectBtnActive : {}) }}
                    onClick={() => handleStartSubject(sub)}
                  >
                    {active ? '⚡' : '▶'} {sub.name}
                    {active && <span style={s.activePill}>Active</span>}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <div className="sv-card" style={s.timerCard}>
          <p className="sv-section-label" style={{ textAlign: 'center' }}>Current Session</p>

          <p style={s.subjectLabel}>
            {selectedSubject
              ? <><span style={s.questIcon}>🗡️</span> {selectedSubject}</>
              : <span style={{ color: 'rgba(255,255,255,0.2)' }}>— No quest selected —</span>
            }
          </p>

          <div style={{
            ...s.timerDisplay,
            color: isRunning ? '#f0abfc' : 'rgba(255,255,255,0.2)'
          }}>
            {formatTime(seconds)}
          </div>

          {isRunning && (
            <div style={s.xpPreview}>
              <span>⚡ XP on completion:</span>
              <strong style={{ color: '#fbbf24' }}>+{previewXP} XP</strong>
            </div>
          )}

          {isRunning && <div style={s.pulseRing} />}

          {isRunning ? (
            <button className="sv-btn-primary" style={s.stopBtn} onClick={stopTimer}>
              ⏹ Complete Quest
            </button>
          ) : (
            <p style={s.hintText}>
              {seconds > 0 ? 'Session paused.' : 'Select a subject above to begin your quest.'}
            </p>
          )}
        </div>

        <div className="sv-card" style={s.tipsCard}>
          <p className="sv-section-label">Quest Tips</p>
          <div style={s.tipsList}>
            {[
              '🎯 Every 30 min of study = 60 XP earned',
              '🔥 Study daily to maintain your streak',
              '📚 Complete subjects to unlock achievements',
            ].map(tip => (
              <div key={tip} style={s.tipItem}>{tip}</div>
            ))}
          </div>
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
  playerCard: {
    background: 'rgba(168, 85, 247, 0.1)',
    border: '1px solid rgba(168, 85, 247, 0.25)',
    borderRadius: '12px',
    padding: '14px 18px',
    minWidth: '200px',
  },
  playerTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  playerLevel: { fontWeight: 700, fontSize: '15px', color: '#f0abfc' },
  playerXP: { fontSize: '12px', color: 'rgba(255,255,255,0.4)' },
  subjectGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '10px',
  },
  subjectBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '7px',
    padding: '9px 16px',
    background: 'rgba(168, 85, 247, 0.1)',
    border: '1px solid rgba(168, 85, 247, 0.3)',
    borderRadius: '10px',
    color: '#e8d5ff',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  subjectBtnActive: {
    background: 'rgba(168, 85, 247, 0.25)',
    border: '1px solid #a855f7',
    boxShadow: '0 0 14px rgba(168, 85, 247, 0.3)',
    color: '#f0abfc',
  },
  activePill: {
    fontSize: '10px',
    fontWeight: 700,
    letterSpacing: '0.5px',
    background: 'rgba(168, 85, 247, 0.4)',
    padding: '2px 7px',
    borderRadius: '10px',
    color: '#f0abfc',
    textTransform: 'uppercase',
  },
  timerCard: {
    textAlign: 'center',
    position: 'relative',
    overflow: 'hidden',
    padding: '32px 24px',
  },
  subjectLabel: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#c084fc',
    marginBottom: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
  },
  questIcon: { fontSize: '18px' },
  timerDisplay: {
    fontSize: '64px',
    fontWeight: 700,
    letterSpacing: '6px',
    textShadow: '0 0 40px rgba(240, 171, 252, 0.4)',
    padding: '20px 0',
    fontVariantNumeric: 'tabular-nums',
    transition: 'color 0.3s',
  },
  xpPreview: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px',
    color: 'rgba(255,255,255,0.5)',
    background: 'rgba(245, 158, 11, 0.1)',
    border: '1px solid rgba(245, 158, 11, 0.2)',
    borderRadius: '8px',
    padding: '6px 14px',
    marginBottom: '20px',
  },
  pulseRing: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '200px',
    height: '200px',
    borderRadius: '50%',
    border: '1px solid rgba(168, 85, 247, 0.12)',
    pointerEvents: 'none',
    zIndex: 0,
  },
  stopBtn: {
    width: '100%',
    padding: '14px',
    fontSize: '15px',
    borderRadius: '12px',
    marginTop: '4px',
  },
  hintText: {
    color: 'rgba(255,255,255,0.25)',
    fontSize: '13px',
    marginTop: '8px',
  },
  emptyText: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: '13px',
  },
  tipsCard: { padding: '18px 20px' },
  tipsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  tipItem: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.5)',
    padding: '8px 12px',
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.06)',
  },
  xpPopup: {
    position: 'fixed',
    top: '80px',
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'linear-gradient(90deg, #f59e0b, #fbbf24)',
    color: '#1a0533',
    fontWeight: 700,
    padding: '13px 28px',
    borderRadius: '30px',
    fontSize: '15px',
    zIndex: 999,
    boxShadow: '0 6px 24px rgba(245,158,11,0.45)',
    whiteSpace: 'nowrap',
  },
}
