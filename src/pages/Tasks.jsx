import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Tasks() {
  const [tasks, setTasks] = useState([])
  const [subjects, setSubjects] = useState([])
  const [taskTitle, setTaskTitle] = useState('')
  const [selectedSubject, setSelectedSubject] = useState('')
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([fetchTasks(), fetchSubjects()]).finally(() => setLoading(false))
  }, [])

  async function getUser() {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) throw new Error('You must be signed in to manage tasks.')
    return user
  }

  async function fetchTasks() {
    try {
      const user = await getUser()
      const { data, error } = await supabase.from('tasks').select('*, subjects(*)').eq('user_id', user.id).order('created_at', { ascending: false })
      if (error) throw error
      setTasks(data || [])
    } catch (error) {
      console.error('Failed to load tasks:', error)
      setTasks([])
    }
  }

  async function fetchSubjects() {
    try {
      const user = await getUser()
      const { data, error } = await supabase.from('subjects').select('*').eq('user_id', user.id)
      if (error) throw error
      setSubjects(data || [])
    } catch (error) {
      console.error('Failed to load subjects:', error)
      setSubjects([])
    }
  }

  async function addTask() {
    if (!taskTitle.trim()) { alert('Enter a task title'); return }
    if (!selectedSubject) { alert('Select a subject'); return }
    try {
      const user = await getUser()
      const { error } = await supabase.from('tasks').insert([{ user_id: user.id, title: taskTitle.trim(), subject_id: selectedSubject, completed: false }])
      if (error) throw error
      setTaskTitle('')
      setSelectedSubject('')
      await fetchTasks()
    } catch (error) {
      console.error('Failed to create task:', error)
      alert(`Unable to create task: ${error.message}`)
    }
  }

  async function toggleTask(task) {
    const { error } = await supabase.from('tasks').update({ completed: !task.completed }).eq('id', task.id).eq('user_id', (await getUser()).id)
    if (error) alert(`Unable to update task: ${error.message}`)
    await fetchTasks()
  }

  async function deleteTask(id) {
    const user = await getUser()
    const { error } = await supabase.from('tasks').delete().eq('id', id).eq('user_id', user.id)
    if (error) alert(`Unable to delete task: ${error.message}`)
    await fetchTasks()
  }

  const filtered = tasks.filter(t => filter === 'pending' ? !t.completed : filter === 'done' ? t.completed : true)
  const doneCount = tasks.filter(t => t.completed).length
  const pendingCount = tasks.filter(t => !t.completed).length
  const totalCount = tasks.length
  const completionPct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0

  return (
    <div className="sv-page">
      <div className="sv-container" style={{ paddingTop: '32px' }}>
        <div className="sv-page-header">
          <div>
            <p className="sv-eyebrow">Tasks</p>
            <h1>Stay on top of your work.</h1>
            <p className="sv-eyebrow" style={{ marginTop: 8 }}>Plan, prioritize, and complete the tasks that move your study goals forward.</p>
          </div>
          <div className="sv-stats-grid" style={{ gridTemplateColumns: 'repeat(2, 92px)', width: 'auto' }}>
            <div className="sv-card sv-stat-card"><strong>{pendingCount}</strong><small>Pending</small></div>
            <div className="sv-card sv-stat-card"><strong>{doneCount}</strong><small>Completed</small></div>
          </div>
        </div>

        {totalCount > 0 && <div className="sv-card" style={{ padding: '14px 18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--app-muted)', fontSize: 13 }}><span>Overall progress</span><strong style={{ color: 'var(--app-accent)' }}>{completionPct}%</strong></div>
          <div className="sv-progress-bg" style={{ marginTop: 8 }}><div className="sv-progress-fill" style={{ width: `${completionPct}%` }} /></div>
        </div>}

        <div className="sv-card">
          <p className="sv-section-label">Add a task</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
            <input type="text" placeholder="What needs to be done?" value={taskTitle} onChange={e => setTaskTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTask()} />
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <select value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)} style={{ flex: 1, minWidth: 180 }}>
                <option value="">Select subject</option>
                {subjects.map(sub => <option key={sub.id} value={sub.id}>{sub.name}</option>)}
              </select>
              <button className="sv-primary-button" onClick={addTask}>+ Add task</button>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, margin: '20px 0 14px', flexWrap: 'wrap' }}>
          {['all', 'pending', 'done'].map(f => <button key={f} className={filter === f ? 'sv-primary-button' : ''} onClick={() => setFilter(f)}>{f === 'all' ? `All (${totalCount})` : f === 'pending' ? `Pending (${pendingCount})` : `Completed (${doneCount})`}</button>)}
        </div>

        {loading ? <div className="sv-empty">Loading tasks...</div> : filtered.length === 0 ? <div className="sv-empty">{filter === 'done' ? 'No completed tasks yet.' : 'No tasks here. Add one above.'}</div> : (
          <div className="sv-list">
            {filtered.map(task => <div key={task.id} className="sv-list-row" style={{ padding: '14px 10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                <button aria-label={task.completed ? 'Mark task incomplete' : 'Mark task complete'} onClick={() => toggleTask(task)} style={{ width: 24, height: 24, minHeight: 24, padding: 0, borderRadius: 7, border: `2px solid ${task.completed ? 'var(--app-accent)' : 'var(--app-border)'}`, background: task.completed ? 'var(--app-accent)' : 'transparent', color: '#fff', flexShrink: 0 }}>{task.completed ? '✓' : ''}</button>
                <div style={{ minWidth: 0 }}><strong style={{ textDecoration: task.completed ? 'line-through' : 'none', opacity: task.completed ? .6 : 1 }}>{task.title}</strong>{task.subjects?.name && <span className="sv-badge" style={{ marginTop: 5, fontSize: 11 }}>📚 {task.subjects.name}</span>}</div>
              </div>
              <button onClick={() => deleteTask(task.id)} aria-label="Delete task" title="Delete task">Delete</button>
            </div>)}
          </div>
        )}
      </div>
    </div>
  )
}
