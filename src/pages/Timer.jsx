import { useEffect, useState } from 'react'
import { useTimer } from '../context/TimerContext'
import { supabase } from '../lib/supabase'

const musicCss = `
.sv-music-card{display:grid;gap:14px}.sv-music-header{display:flex;justify-content:space-between;align-items:flex-start;gap:14px}.sv-music-header h2{margin-top:5px;font-size:19px}.sv-music-actions{display:flex;gap:8px;flex-wrap:wrap}.sv-music-actions button{min-height:38px;padding:8px 12px}.sv-music-presets{display:flex;gap:8px;flex-wrap:wrap}.sv-music-presets button{min-height:36px;padding:7px 10px;font-size:12px}.sv-music-embed{width:100%;height:152px;border:0;border-radius:12px;background:var(--app-surface-soft)}.sv-music-help{font-size:11px;color:var(--app-muted);line-height:1.55}.sv-music-link{display:flex;gap:8px}.sv-music-link input{flex:1}.sv-music-link button{min-width:90px}
@media(max-width:560px){.sv-music-link{flex-direction:column}.sv-music-link button{width:100%}.sv-music-header{flex-direction:column}}
`

const SPOTIFY_PRESETS = {
  Focus: 'https://open.spotify.com/search/focus%20music',
  LoFi: 'https://open.spotify.com/search/lofi%20study',
  Classical: 'https://open.spotify.com/search/classical%20study',
}

function spotifyEmbed(url) {
  if (!url) return ''
  const match = url.match(/open\.spotify\.com\/(track|album|playlist|episode)\/([A-Za-z0-9]+)/)
  return match ? `https://open.spotify.com/embed/${match[1]}/${match[2]}?utm_source=generator` : ''
}

export default function Timer() {
  const [subjects, setSubjects] = useState([])
  const [saving, setSaving] = useState(false)
  const [showCompletion, setShowCompletion] = useState(false)
  const [spotifyUrl, setSpotifyUrl] = useState(() => localStorage.getItem('studyverse-spotify-url') || '')
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

  function saveSpotifyUrl(value) {
    setSpotifyUrl(value)
    localStorage.setItem('studyverse-spotify-url', value)
  }

  const embedUrl = spotifyEmbed(spotifyUrl)

  return <div className="sv-page">
    <style>{musicCss}</style>
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

      <section className="sv-card sv-music-card">
        <div className="sv-music-header"><div><span className="sv-section-label">Study Music</span><h2>Listen while you study</h2></div><div className="sv-music-actions"><a href="https://open.spotify.com" target="_blank" rel="noreferrer"><button type="button">Open Spotify</button></a></div></div>
        <div className="sv-music-presets">{Object.entries(SPOTIFY_PRESETS).map(([label, url]) => <button key={label} type="button" onClick={() => saveSpotifyUrl(url)}>🎵 {label}</button>)}</div>
        <div className="sv-music-link"><input value={spotifyUrl} onChange={e => saveSpotifyUrl(e.target.value)} placeholder="Paste a Spotify playlist, album, track or episode link" /><button type="button" onClick={() => saveSpotifyUrl('')}>Clear</button></div>
        {embedUrl ? <iframe className="sv-music-embed" title="Spotify study music" src={embedUrl} allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy" /> : <p className="sv-music-help">Choose a preset or paste a Spotify link. Your last choice is remembered on this device, so you can return to the timer without setting it up again.</p>}
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
