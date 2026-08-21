import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Link } from 'react-router-dom'

export default function Dashboard() {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  useEffect(() => { Promise.all([fetchSessions()]).finally(() => setLoading(false)) }, [])
  async function fetchSessions() { const { data:{user} }=await supabase.auth.getUser(); if(!user)return; const {data,error}=await supabase.from('study_sessions').select('*, subjects(*)').eq('user_id',user.id).order('created_at',{ascending:false}); if(!error)setSessions(data||[]) }
  function formatTime(s){const h=Math.floor(s/3600),m=Math.floor((s%3600)/60),sec=s%60;if(h>0)return `${h}h ${m}m`;if(m>0)return `${m}m ${sec}s`;return `${sec}s`}
  const totalStudyTime=sessions.reduce((sum,s)=>sum+(s.duration||0),0), today=new Date().toDateString(), todayStudyTime=sessions.filter(s=>new Date(s.created_at).toDateString()===today).reduce((sum,s)=>sum+(s.duration||0),0)
  const subjectStats={}; sessions.forEach(s=>{const n=s.subjects?.name;if(n)subjectStats[n]=(subjectStats[n]||0)+s.duration}); let topSubject='—',maxDuration=0;Object.entries(subjectStats).forEach(([n,d])=>{if(d>maxDuration){maxDuration=d;topSubject=n}})
  const dates=[...new Set(sessions.map(s=>new Date(s.created_at).toISOString().split('T')[0]))].sort();let streak=0;if(dates.length){streak=1;for(let i=dates.length-1;i>0;i--){if((new Date(dates[i])-new Date(dates[i-1]))/86400000===1)streak++;else break}}
  const stats=[['Total Study Time',formatTime(totalStudyTime),'⏱️'],['Sessions',sessions.length,'📚'],['Today',formatTime(todayStudyTime),'📅'],['Top Subject',topSubject,'▣'],['Study Streak',`${streak} days`,'✓']]
  return <div className="sv-page"><div className="sv-container sv-dashboard-page">
    <div className="sv-page-header"><div><p className="sv-eyebrow">Overview</p><h1>Good to see you back.</h1><p className="sv-eyebrow" style={{marginTop:8}}>Your study activity, goals and recent sessions in one place.</p></div></div>
    <div className="sv-stats-grid">{stats.map(([label,value,icon])=><div key={label} className="sv-card sv-stat-card"><span>{icon}</span><strong>{value}</strong><small>{label}</small></div>)}</div>
    <div className="sv-section-heading"><span className="sv-section-label">Quick Actions</span></div><div className="sv-action-grid">{[['/timer','Start a Session','⏱️','Focus for a set amount of time'],['/tasks','Tasks','✓','Review and manage your tasks'],['/subjects','Subjects','📚','Track your subjects'],['/analytics','Analytics','▥','View your study insights']].map(([to,label,icon,desc])=><Link key={to} to={to} className="sv-action-card"><span>{icon}</span><strong>{label}</strong><small>{desc}</small></Link>)}</div>
    <div className="sv-section-heading"><span className="sv-section-label">Recent Sessions</span></div>{loading?<div className="sv-empty">Loading sessions...</div>:sessions.length===0?<div className="sv-empty">No study sessions yet. <Link to="/timer">Start a session →</Link></div>:<div className="sv-card sv-list">{sessions.slice(0,8).map(session=><div className="sv-list-row" key={session.id}><div className="sv-list-main"><i/><div><strong>{session.subjects?.name||'General Study'}</strong><small>{new Date(session.created_at).toLocaleDateString('en-US',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}</small></div></div><span className="sv-badge">{formatTime(session.duration)}</span></div>)}</div>}
  </div></div>
}
