import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

const TYPES = [
  ['task', 'Tasks', '✓'],
  ['assignment', 'Assignments', '📝'],
  ['exam', 'Exams', '🎓'],
  ['study', 'Study Sessions', '⏱️'],
  ['room', 'Room Events', '👥'],
  ['deadline', 'Deadlines', '⏳'],
  ['journal', 'Journal', '📓'],
]

const pad = n => String(n).padStart(2, '0')
const keyOf = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const startOfDay = d => new Date(d.getFullYear(), d.getMonth(), d.getDate())

export default function Calendar() {
  const [cursor, setCursor] = useState(() => new Date())
  const [selectedDate, setSelectedDate] = useState(() => new Date())
  const [view, setView] = useState('month')
  const [filter, setFilter] = useState('all')
  const [events, setEvents] = useState([])
  const [tasks, setTasks] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [type, setType] = useState('study')
  const [time, setTime] = useState('18:00')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function loadCalendar() {
    setLoading(true)
    setError('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }
    const [eventResult, taskResult] = await Promise.all([
      supabase.from('calendar_events').select('*').eq('user_id', user.id).order('starts_at'),
      supabase.from('tasks').select('id,title,completed,created_at,subjects(name)').eq('user_id', user.id).order('created_at', { ascending: false }),
    ])
    if (eventResult.error && !eventResult.error.message.includes('calendar_events')) setError(eventResult.error.message)
    setEvents(eventResult.data || [])
    setTasks(taskResult.data || [])
    setLoading(false)
  }

  useEffect(() => { loadCalendar() }, [])

  const allEvents = useMemo(() => {
    const taskEvents = tasks.map(task => ({
      id: `task-${task.id}`,
      title: task.title,
      event_type: 'task',
      starts_at: task.created_at,
      notes: task.subjects?.name ? `Subject: ${task.subjects.name}` : '',
      completed: task.completed,
      source: 'task',
    }))
    return [...events.map(e => ({ ...e, source: 'calendar' })), ...taskEvents]
  }, [events, tasks])

  const visibleEvents = allEvents.filter(e => filter === 'all' || e.event_type === filter)
  const eventMap = useMemo(() => visibleEvents.reduce((map, event) => {
    const k = keyOf(new Date(event.starts_at))
    ;(map[k] ||= []).push(event)
    return map
  }, {}), [visibleEvents])

  const monthDays = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
    const start = new Date(first)
    start.setDate(first.getDate() - first.getDay())
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      return d
    })
  }, [cursor])

  const weekDays = useMemo(() => {
    const d = startOfDay(selectedDate)
    d.setDate(d.getDate() - d.getDay())
    return Array.from({ length: 7 }, (_, i) => {
      const day = new Date(d)
      day.setDate(d.getDate() + i)
      return day
    })
  }, [selectedDate])

  const selectedKey = keyOf(selectedDate)
  const selectedEvents = eventMap[selectedKey] || []

  function move(step) {
    const next = new Date(cursor)
    if (view === 'week') next.setDate(next.getDate() + step * 7)
    else next.setMonth(next.getMonth() + step)
    setCursor(next)
  }

  function chooseDay(day) {
    setSelectedDate(day)
    if (view === 'day') setCursor(day)
  }

  async function addEvent(e) {
    e.preventDefault()
    if (!title.trim()) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const [hours, minutes] = time.split(':').map(Number)
    const starts = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), hours, minutes)
    const { error: insertError } = await supabase.from('calendar_events').insert({
      user_id: user.id,
      title: title.trim(),
      event_type: type,
      starts_at: starts.toISOString(),
      notes: notes.trim(),
    })
    if (insertError) { setError(insertError.message); return }
    setTitle(''); setNotes(''); setShowForm(false)
    await loadCalendar()
  }

  async function deleteEvent(event) {
    if (event.source !== 'calendar') return
    const { error: deleteError } = await supabase.from('calendar_events').delete().eq('id', event.id)
    if (deleteError) setError(deleteError.message)
    else await loadCalendar()
  }

  const monthTitle = cursor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const selectedTitle = selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  return <div className="sv-page sv-calendar-page">
    <div className="sv-container" style={{ paddingTop: 32, paddingBottom: 48 }}>
      <div className="sv-page-header">
        <div><span className="sv-eyebrow">PLAN YOUR STUDY LIFE</span><h1>Calendar</h1><p className="sv-page-subtitle">Tasks, assignments, exams, study sessions, room events, deadlines and journal entries in one place.</p></div>
        <button className="sv-primary-button" onClick={() => setShowForm(v => !v)}>+ Add event</button>
      </div>

      {error && <div className="sv-social-notice" onClick={() => setError('')}>⚠ {error}</div>}

      {showForm && <form className="sv-card sv-calendar-form" onSubmit={addEvent}>
        <div><span className="sv-section-label">NEW CALENDAR EVENT</span><h2>Add something to your schedule</h2></div>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Event title" required />
        <div className="sv-calendar-form-grid"><select value={type} onChange={e => setType(e.target.value)}>{TYPES.filter(t => t[0] !== 'task').map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><input type="time" value={time} onChange={e => setTime(e.target.value)} /></div>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes (optional)" rows="3" />
        <button className="sv-primary-button" type="submit">Save event for {selectedDate.toLocaleDateString()}</button>
      </form>}

      <div className="sv-calendar-toolbar sv-card">
        <div className="sv-calendar-nav"><button onClick={() => move(-1)}>←</button><button onClick={() => { const now = new Date(); setCursor(now); setSelectedDate(now) }}>Today</button><button onClick={() => move(1)}>→</button><strong>{view === 'month' ? monthTitle : selectedTitle}</strong></div>
        <div className="sv-calendar-views">{['day', 'week', 'month'].map(v => <button key={v} className={view === v ? 'sv-primary-button' : ''} onClick={() => setView(v)}>{v[0].toUpperCase() + v.slice(1)}</button>)}</div>
      </div>

      <div className="sv-calendar-filters">{[['all','All'], ...TYPES].map(([value, label, icon]) => <button key={value} className={filter === value ? 'active' : ''} onClick={() => setFilter(value)}>{icon ? `${icon} ${label}` : label}</button>)}</div>

      {view === 'month' && <div className="sv-calendar-grid sv-card"><div className="sv-calendar-weekdays">{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => <span key={d}>{d}</span>)}</div>{monthDays.map(day => { const k = keyOf(day); const dayEvents = eventMap[k] || []; const outside = day.getMonth() !== cursor.getMonth(); const selected = k === selectedKey; return <button key={k} className={`sv-calendar-day ${outside ? 'outside' : ''} ${selected ? 'selected' : ''}`} onClick={() => chooseDay(day)}><span className="sv-calendar-day-number">{day.getDate()}</span><div>{dayEvents.slice(0, 3).map(ev => <span key={ev.id} className={`sv-calendar-chip ${ev.event_type}`}>{ev.title}</span>)}{dayEvents.length > 3 && <span className="sv-calendar-more">+{dayEvents.length - 3} more</span>}</div></button> })}</div>}

      {view === 'week' && <div className="sv-card sv-week-grid">{weekDays.map(day => { const dayEvents = eventMap[keyOf(day)] || []; return <button key={keyOf(day)} className={keyOf(day) === selectedKey ? 'selected' : ''} onClick={() => chooseDay(day)}><strong>{day.toLocaleDateString('en-US', { weekday: 'short' })}</strong><span>{day.getDate()}</span>{dayEvents.map(ev => <small key={ev.id} className={`sv-calendar-chip ${ev.event_type}`}>{ev.title}</small>)}</button> })}</div>}

      {view === 'day' && <div className="sv-card sv-day-view"><span className="sv-section-label">SCHEDULE</span><h2>{selectedTitle}</h2>{selectedEvents.length === 0 ? <p className="sv-empty">Nothing scheduled yet.</p> : selectedEvents.map(ev => <EventRow key={ev.id} event={ev} onDelete={() => deleteEvent(ev)} />)}</div>}

      {view !== 'day' && <div className="sv-card sv-day-agenda"><div><span className="sv-section-label">SELECTED DAY</span><h2>{selectedTitle}</h2></div>{selectedEvents.length === 0 ? <p className="sv-empty">Nothing scheduled for this day. Select another day or add an event.</p> : selectedEvents.map(ev => <EventRow key={ev.id} event={ev} onDelete={() => deleteEvent(ev)} />)}</div>}
    </div>
  </div>
}

function EventRow({ event, onDelete }) {
  const type = TYPES.find(t => t[0] === event.event_type)
  return <div className="sv-calendar-event-row"><div className={`sv-calendar-event-icon ${event.event_type}`}>{type?.[2] || '•'}</div><div className="sv-calendar-event-copy"><strong>{event.title}</strong><small>{type?.[1] || event.event_type} · {new Date(event.starts_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}{event.notes ? ` · ${event.notes}` : ''}</small></div>{event.source === 'calendar' && <button onClick={onDelete}>Delete</button>}</div>
}
