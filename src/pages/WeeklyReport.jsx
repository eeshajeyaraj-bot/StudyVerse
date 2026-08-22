import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

const startWeek = (value) => { const d = new Date(value); d.setHours(0,0,0,0); d.setDate(d.getDate()-d.getDay()); return d }
const dayKey = (d) => d.toISOString().slice(0,10)

export default function WeeklyReport() {
  const [sessions,setSessions]=useState([]), [tasks,setTasks]=useState([]), [subjects,setSubjects]=useState([]), [loading,setLoading]=useState(true), [error,setError]=useState('')
  const weekStart=useMemo(()=>startWeek(new Date()),[])
  const weekEnd=useMemo(()=>{const d=new Date(weekStart);d.setDate(d.getDate()+7);return d},[weekStart])
  useEffect(()=>{load()},[])
  async function load(){
    const {data:{user}}=await supabase.auth.getUser(); if(!user){setLoading(false);return}
    const [a,b,c]=await Promise.all([
      supabase.from('study_sessions').select('*').eq('user_id',user.id).gte('start_time',weekStart.toISOString()).lt('start_time',weekEnd.toISOString()).order('start_time'),
      supabase.from('tasks').select('id,title,completed,created_at').eq('user_id',user.id),
      supabase.from('subjects').select('id,name').eq('user_id',user.id).order('name')
    ])
    const err=a.error||b.error||c.error; if(err)setError(err.message)
    setSessions(a.data||[]);setTasks(b.data||[]);setSubjects(c.data||[]);setLoading(false)
  }
  const stats=useMemo(()=>{
    const bySubject={},byDay={}; let seconds=0
    sessions.forEach(s=>{const duration=Number(s.duration)||0;seconds+=duration;const mins=Math.round(duration/60);bySubject[s.subject_id]=(bySubject[s.subject_id]||0)+mins;const k=dayKey(new Date(s.start_time));byDay[k]=(byDay[k]||0)+mins})
    const completed=tasks.filter(t=>t.completed).length
    const days=new Set(sessions.map(s=>dayKey(new Date(s.start_time)))).size
    const focus=Math.min(100,Math.round(Math.min(seconds/3600,10)*7 + Math.min(days/5,1)*15 + Math.min(completed/5,1)*15))
    return {seconds,bySubject,byDay,completed,days,focus}
  },[sessions,tasks])
  const topSubject=subjects.map(s=>({name:s.name,minutes:stats.bySubject[s.id]||0})).sort((a,b)=>b.minutes-a.minutes)[0]
  const maxDay=Math.max(1,...Array.from({length:7},(_,i)=>{const d=new Date(weekStart);d.setDate(d.getDate()+i);return stats.byDay[dayKey(d)]||0}))
  const hours=Math.floor(stats.seconds/3600), minutes=Math.floor((stats.seconds%3600)/60)
  return <div className="sv-page"><style>{css}</style><div className="sv-container sv-report">
    <div className="sv-page-header"><div><span className="sv-eyebrow">WEEKLY PRODUCTIVITY REPORT</span><h1>Your study week.</h1><p className="sv-page-subtitle">{weekStart.toLocaleDateString()} – {new Date(weekEnd-1).toLocaleDateString()} · Generated from your StudyVerse activity.</p></div><button className="sv-primary-button" onClick={()=>window.print()}>Export / Save as PDF</button></div>
    {error&&<div className="sv-social-notice" onClick={()=>setError('')}>⚠ {error}</div>}
    {loading?<div className="sv-card sv-empty">Generating your report…</div>:<>
      <div className="sv-report-stats"><Stat label="Study Hours" value={`${hours}h ${minutes}m`}/><Stat label="Sessions" value={sessions.length}/><Stat label="Focus Score" value={`${stats.focus}/100`}/><Stat label="Completed Tasks" value={stats.completed}/></div>
      <div className="sv-report-grid"><section className="sv-card"><span className="sv-section-label">STUDY CONSISTENCY</span><h2>Weekly activity</h2><div className="sv-report-bars">{Array.from({length:7},(_,i)=>{const d=new Date(weekStart);d.setDate(d.getDate()+i);const mins=stats.byDay[dayKey(d)]||0;return <div className="sv-report-day" key={dayKey(d)}><div className="sv-report-bar-wrap"><div className="sv-report-bar" style={{height:`${Math.max(7,mins/maxDay*100)}%`}}/></div><b>{mins}m</b><small>{d.toLocaleDateString('en-US',{weekday:'short'})}</small></div>})}</div></section>
      <section className="sv-card"><span className="sv-section-label">SUBJECTS</span><h2>Where your time went</h2>{subjects.length===0?<p className="sv-empty">No subjects yet.</p>:subjects.map(s=>{const mins=stats.bySubject[s.id]||0;return <div className="sv-report-subject" key={s.id}><div><strong>{s.name}</strong><span>{mins} min</span></div><div className="sv-progress-bg"><div className="sv-progress-fill" style={{width:`${topSubject?.minutes?Math.min(100,mins/topSubject.minutes*100):0}%`}}/></div></div>})}</section></div>
      <div className="sv-report-grid"><section className="sv-card"><span className="sv-section-label">ACHIEVEMENTS</span><h2>This week's wins</h2><div className="sv-achievements"><Win ok={sessions.length>0} icon="🎯" text="Completed a study session"/><Win ok={stats.seconds>=3600} icon="🔥" text="Reached 1 hour of study"/><Win ok={stats.completed>=3} icon="✓" text="Completed 3 tasks"/><Win ok={stats.days>=5} icon="📅" text="Studied on 5 different days"/></div></section><section className="sv-card"><span className="sv-section-label">SUMMARY</span><h2>Keep the momentum</h2><p className="sv-report-summary">{stats.seconds===0?'Start one focused session and your weekly report will begin tracking your consistency.':stats.focus>=80?'Excellent consistency. Protect the routine that is working for you.':stats.focus>=50?'Good progress. Add a little more consistency to raise your focus score.':'You are building momentum. Short daily sessions can make a big difference.'}</p><div className="sv-report-highlight"><small>Top subject</small><strong>{topSubject?.name||'No study subject yet'}</strong><span>{topSubject?`${topSubject.minutes} minutes this week`:'Start a session to see it here.'}</span></div></section></div>
    </>}
  </div></div>
}
function Stat({label,value}){return <div className="sv-card"><small>{label}</small><strong>{value}</strong></div>}
function Win({ok,icon,text}){return <div className={ok?'earned':''}><span>{icon}</span><span>{text}</span><b>{ok?'Earned':'Not yet'}</b></div>}
const css=`.sv-report{padding-top:32px;padding-bottom:48px}.sv-report-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:18px}.sv-report-stats .sv-card{margin:0}.sv-report-stats small{color:var(--app-muted)!important}.sv-report-stats strong{display:block;font-size:25px;margin-top:8px;color:var(--app-accent)!important}.sv-report-grid{display:grid;grid-template-columns:1.2fr .8fr;gap:18px;margin-top:18px}.sv-report-grid>.sv-card{margin:0}.sv-report-bars{height:250px;display:grid;grid-template-columns:repeat(7,1fr);gap:10px;align-items:end;margin-top:22px}.sv-report-day{height:100%;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:5px}.sv-report-bar-wrap{height:185px;width:min(38px,70%);display:flex;align-items:flex-end;background:var(--app-surface-soft);border-radius:10px;overflow:hidden}.sv-report-bar{width:100%;background:var(--app-accent);border-radius:10px 10px 0 0;min-height:7px}.sv-report-day b,.sv-report-day small{font-size:10px}.sv-report-day small{color:var(--app-muted)!important}.sv-report-subject{display:grid;gap:7px;margin-top:16px}.sv-report-subject>div:first-child{display:flex;justify-content:space-between;font-size:12px}.sv-report-subject span{color:var(--app-muted)!important}.sv-achievements{display:grid;gap:9px;margin-top:16px}.sv-achievements>div{display:grid;grid-template-columns:28px 1fr auto;align-items:center;gap:8px;padding:11px;border:1px solid var(--app-border);border-radius:10px;background:var(--app-surface-soft);opacity:.55}.sv-achievements>div.earned{opacity:1;border-color:var(--app-accent)}.sv-achievements b{font-size:10px;color:var(--app-muted)!important}.sv-achievements .earned b{color:var(--app-accent)!important}.sv-report-summary{color:var(--app-muted)!important;line-height:1.7;font-size:13px}.sv-report-highlight{display:grid;gap:5px;margin-top:20px;padding:15px;border-radius:12px;background:var(--app-accent-soft);border:1px solid var(--app-border)}.sv-report-highlight small,.sv-report-highlight span{color:var(--app-muted)!important;font-size:11px}@media(max-width:850px){.sv-report-stats{grid-template-columns:repeat(2,1fr)}.sv-report-grid{grid-template-columns:1fr}}@media(max-width:520px){.sv-report-stats{grid-template-columns:1fr}.sv-report-bars{gap:4px}.sv-report-bar-wrap{width:26px}}@media print{.sv-sidebar,.sv-topbar{display:none!important}.sv-main{margin:0!important}.sv-report{max-width:none!important}.sv-report-stats,.sv-report-grid{break-inside:avoid}}`
