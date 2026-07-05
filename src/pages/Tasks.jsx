import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Navbar from '../components/Navbar'

export default function Tasks() {
  const [tasks, setTasks]               = useState([])
  const [subjects, setSubjects]         = useState([])
  const [taskTitle, setTaskTitle]       = useState('')
  const [selectedSubject, setSelectedSubject] = useState('')
  const [filter, setFilter]             = useState('all') // all | pending | done
  const [loading, setLoading]           = useState(true)

  useEffect(() => {
    Promise.all([fetchTasks(), fetchSubjects()])
      .finally(() => setLoading(false))
  }, [])

  async function fetchTasks() {
    const { data } = await supabase
      .from('tasks')
      .select('*, subjects(*)')
      .order('created_at', { ascending: false })
    setTasks(data || [])
  }

  async function fetchSubjects() {
    const { data } = await supabase.from('subjects').select('*')
    setSubjects(data || [])
  }

  async function addTask() {
    if (!taskTitle.trim()) { alert('Enter a task title'); return }
    if (!selectedSubject)  { alert('Select a subject');   return }

    const { error } = await supabase
      .from('tasks')
      .insert([{ title: taskTitle.trim(), subject_id: selectedSubject, completed: false }])

    if (error) { alert(error.message); return }

    setTaskTitle('')
    setSelectedSubject('')
    fetchTasks()
  }

  async function toggleTask(task) {
    await supabase.from('tasks').update({ completed: !task.completed }).eq('id', task.id)
    fetchTasks()
  }

  async function deleteTask(id) {
    await supabase.from('tasks').delete().eq('id', id)
    fetchTasks()
  }

  const filtered = tasks.filter(t => {
    if (filter === 'pending') return !t.completed
    if (filter === 'done')    return  t.completed
    return true
  })

  const doneCount    = tasks.filter(t => t.completed).length
  const pendingCount = tasks.filter(t => !t.completed).length
  const totalCount   = tasks.length
  const completionPct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0

  return (
    <div className="sv-page">
      <Navbar />
      <div className="sv-container" style={{ paddingTop: '28px' }}>

        {/* Header */}
        <div style={s.header}>
          <div>
            <p style={s.welcomeLabel}>Manage Your</p>
            <h1 style={s.pageTitle}>Daily <span style={s.accent}>Missions</span></h1>
          </div>
          <div style={s.statsRow}>
            <div style={s.miniStat}>
              <span style={s.miniNum}>{pendingCount}</span>
              <span style={s.miniLabel}>Pending</span>
            </div>
            <div style={s.miniStat}>
              <span style={{ ...s.miniNum, color: '#10b981' }}>{doneCount}</span>
              <span style={s.miniLabel}>Done</span>
            </div>
          </div>
        </div>

        {/* Overall Progress */}
        {totalCount > 0 && (
          <div className="sv-card" style={s.progressCard}>
            <div style={s.progressTop}>
              <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>
                Overall Progress
              </span>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#f0abfc' }}>
                {completionPct}%
              </span>
            </div>
            <div className="sv-progress-bg" style={{ marginTop: '8px' }}>
              <div className="sv-progress-fill" style={{ width: `${completionPct}%` }} />
            </div>
          </div>
        )}

        {/* Add Task */}
        <div className="sv-card">
          <p className="sv-section-label">New Mission</p>
          <div style={s.inputCol}>
            <input
              type="text"
              placeholder="What needs to be done?"
              value={taskTitle}
              onChange={e => setTaskTitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addTask()}
            />
            <div style={s.inputRow}>
              <select
                value={selectedSubject}
                onChange={e => setSelectedSubject(e.target.value)}
                style={s.selectInput}
              >
                <option value="">Select subject</option>
                {subjects.map(sub => (
                  <option key={sub.id} value={sub.id}>{sub.name}</option>
                ))}
              </select>
              <button className="sv-btn-primary" onClick={addTask} style={s.addBtn}>
                + Add Mission
              </button>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div style={s.filterRow}>
          {['all', 'pending', 'done'].map(f => (
            <button
              key={f}
              style={{ ...s.filterBtn, ...(filter === f ? s.filterBtnActive : {}) }}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? `All (${totalCount})`
               : f === 'pending' ? `Pending (${pendingCount})`
               : `Done (${doneCount})`}
            </button>
          ))}
        </div>

        {/* Task List */}
        {loading ? (
          <div style={s.empty}>Loading missions...</div>
        ) : filtered.length === 0 ? (
          <div style={s.empty}>
            {filter === 'done'
              ? 'No completed missions yet. Keep going! 💪'
              : 'No missions here. Add one above! 🎯'}
          </div>
        ) : (
          <div style={s.taskList}>
            {filtered.map(task => (
              <div
                key={task.id}
                style={{
                  ...s.taskCard,
                  ...(task.completed ? s.taskCardDone : {}),
                }}
              >
                {/* Checkbox */}
                <button
                  style={{ ...s.checkbox, ...(task.completed ? s.checkboxDone : {}) }}
                  onClick={() => toggleTask(task)}
                  title={task.completed ? 'Mark pending' : 'Mark complete'}
                >
                  {task.completed && <span style={s.checkmark}>✓</span>}
                </button>

                {/* Content */}
                <div style={s.taskContent}>
                  <div style={{
                    ...s.taskTitle,
                    ...(task.completed ? s.taskTitleDone : {}),
                  }}>
                    {task.title}
                  </div>
                  {task.subjects?.name && (
                    <span className="sv-badge" style={{ marginTop: '5px', fontSize: '11px' }}>
                      📚 {task.subjects.name}
                    </span>
                  )}
                </div>

                {/* Delete */}
                <button className="sv-btn-danger" onClick={() => deleteTask(task.id)}>
                  🗑️
                </button>
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
  statsRow: {
    display: 'flex',
    gap: '12px',
  },
  miniStat: {
    textAlign: 'center',
    background: 'rgba(168, 85, 247, 0.08)',
    border: '1px solid rgba(168, 85, 247, 0.2)',
    borderRadius: '10px',
    padding: '10px 16px',
    minWidth: '70px',
  },
  miniNum: {
    display: 'block',
    fontSize: '22px',
    fontWeight: 700,
    color: '#f0abfc',
    lineHeight: 1,
  },
  miniLabel: {
    fontSize: '11px',
    color: 'rgba(255,255,255,0.35)',
    marginTop: '3px',
    display: 'block',
  },
  progressCard: { padding: '14px 18px', marginBottom: '16px' },
  progressTop: { display: 'flex', justifyContent: 'space-between' },
  inputCol: { display: 'flex', flexDirection: 'column', gap: '10px' },
  inputRow: { display: 'flex', gap: '10px', flexWrap: 'wrap' },
  selectInput: { flex: 1, minWidth: '160px' },
  addBtn: { whiteSpace: 'nowrap', padding: '10px 20px' },
  filterRow: {
    display: 'flex',
    gap: '8px',
    margin: '20px 0 14px',
    flexWrap: 'wrap',
  },
  filterBtn: {
    padding: '7px 16px',
    borderRadius: '8px',
    background: 'transparent',
    border: '1px solid rgba(255,255,255,0.1)',
    color: 'rgba(255,255,255,0.4)',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.18s',
  },
  filterBtnActive: {
    background: 'rgba(168, 85, 247, 0.15)',
    border: '1px solid rgba(168, 85, 247, 0.4)',
    color: '#f0abfc',
  },
  taskList: { display: 'flex', flexDirection: 'column', gap: '10px' },
  taskCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    padding: '14px 16px',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(168, 85, 247, 0.15)',
    borderRadius: '12px',
    transition: 'all 0.2s',
  },
  taskCardDone: {
    opacity: 0.55,
    background: 'rgba(16, 185, 129, 0.04)',
    border: '1px solid rgba(16, 185, 129, 0.15)',
  },
  checkbox: {
    width: '22px',
    height: '22px',
    borderRadius: '6px',
    border: '2px solid rgba(168, 85, 247, 0.4)',
    background: 'transparent',
    flexShrink: 0,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.18s',
  },
  checkboxDone: {
    background: '#10b981',
    border: '2px solid #10b981',
  },
  checkmark: {
    color: '#fff',
    fontSize: '12px',
    fontWeight: 700,
  },
  taskContent: { flex: 1 },
  taskTitle: {
    fontWeight: 600,
    fontSize: '14px',
    color: '#f1e8ff',
  },
  taskTitleDone: {
    textDecoration: 'line-through',
    color: 'rgba(255,255,255,0.4)',
  },
  empty: {
    textAlign: 'center',
    color: 'rgba(255,255,255,0.3)',
    padding: '50px 20px',
    fontSize: '14px',
  },
}