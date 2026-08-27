import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function RoomStudyTools({ roomId, userId, typing = false }) {
  const [messages, setMessages] = useState([])
  const [pins, setPins] = useState([])
  const [resources, setResources] = useState([])
  const [query, setQuery] = useState('')
  const [pinTitle, setPinTitle] = useState('')
  const [pinUrl, setPinUrl] = useState('')
  const [resourceTitle, setResourceTitle] = useState('')
  const [resourceUrl, setResourceUrl] = useState('')
  const [deckTitle, setDeckTitle] = useState('')
  const [cardQuestion, setCardQuestion] = useState('')
  const [cardAnswer, setCardAnswer] = useState('')
  const [deckId, setDeckId] = useState(null)
  const [streak, setStreak] = useState(0)
  const [typingNames, setTypingNames] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    async function load() {
      const [m, p, r, s] = await Promise.all([
        supabase.from('room_messages').select('*').eq('room_id', roomId).order('created_at').limit(500),
        supabase.from('room_pins').select('*').eq('room_id', roomId).order('created_at', { ascending: false }),
        supabase.from('room_resources').select('*').eq('room_id', roomId).order('created_at', { ascending: false }),
        supabase.from('study_sessions').select('started_at').eq('user_id', userId).gte('started_at', new Date(Date.now() - 7 * 86400000).toISOString()),
      ])
      if (!active) return
      if (m.error) console.warn('Room study message search unavailable', m.error)
      if (p.error) console.warn('Pinned resources unavailable. Run the StudyVerse room migration if needed.', p.error)
      if (r.error) console.warn('Shared resources unavailable. Run the StudyVerse room migration if needed.', r.error)
      if (s.error) console.warn('Study session history unavailable. Run the StudyVerse room migration if needed.', s.error)
      setMessages(m.data || [])
      setPins(p.data || [])
      setResources(r.data || [])
      if (!s.error) {
        setStreak(new Set((s.data || []).map(x => new Date(x.started_at).toISOString().slice(0, 10))).size)
      } else {
        setStreak(0)
      }
      const missing = [p.error && 'pinned resources', r.error && 'shared resources', s.error && 'study history'].filter(Boolean)
      setError(missing.length ? `Some study tools need the latest Supabase migration: ${missing.join(', ')}.` : '')
    }
    load()
    const channel = supabase
      .channel(`room-study-tools:${roomId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'room_messages', filter: `room_id=eq.${roomId}` }, p => {
        if (p.eventType === 'DELETE') setMessages(x => x.filter(m => m.id !== p.old.id))
        else setMessages(x => [...x.filter(m => m.id !== p.new.id), p.new].sort((a, b) => new Date(a.created_at) - new Date(b.created_at)))
      })
      .subscribe()
    return () => { active = false; supabase.removeChannel(channel) }
  }, [roomId, userId])

  useEffect(() => {
    const channel = supabase.channel(`room-presence-tools:${roomId}`, { config: { presence: { key: userId } } })
    const sync = () => {
      const names = Object.values(channel.presenceState()).flat().filter(x => x.userId !== userId && x.typing).map(x => x.name || 'Someone')
      setTypingNames([...new Set(names)])
    }
    channel.on('presence', { event: 'sync' }, sync).subscribe(async status => {
      if (status === 'SUBSCRIBED') await channel.track({ userId, typing })
    })
    return () => supabase.removeChannel(channel)
  }, [roomId, userId, typing])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return messages.filter(m => !q || (m.body || m.message || '').toLowerCase().includes(q)).slice().reverse().slice(0, 30)
  }, [messages, query])

  async function addPin(e) {
    e.preventDefault()
    if (!pinTitle.trim()) return
    const { data, error: insertError } = await supabase.from('room_pins').insert({ room_id: roomId, created_by: userId, title: pinTitle.trim(), url: pinUrl.trim() || null }).select().single()
    if (insertError) { console.error('Pin creation failed', insertError); setError(insertError.message); return }
    setPins(p => [data, ...p]); setPinTitle(''); setPinUrl('')
  }

  async function addResource(e) {
    e.preventDefault()
    if (!resourceTitle.trim()) return
    const { data, error: insertError } = await supabase.from('room_resources').insert({ room_id: roomId, added_by: userId, title: resourceTitle.trim(), url: resourceUrl.trim() || null }).select().single()
    if (insertError) { console.error('Resource creation failed', insertError); setError(insertError.message); return }
    setResources(r => [data, ...r]); setResourceTitle(''); setResourceUrl('')
  }

  async function createDeck(e) {
    e.preventDefault()
    if (!deckTitle.trim()) return
    const { data, error: insertError } = await supabase.from('flashcard_decks').insert({ owner_id: userId, room_id: roomId, title: deckTitle.trim() }).select().single()
    if (insertError) { console.error('Deck creation failed', insertError); setError(insertError.message); return }
    setDeckId(data.id); setDeckTitle('')
  }

  async function addCard(e) {
    e.preventDefault()
    if (!deckId || !cardQuestion.trim() || !cardAnswer.trim()) return
    const { error: insertError } = await supabase.from('flashcards').insert({ deck_id: deckId, question: cardQuestion.trim(), answer: cardAnswer.trim() })
    if (insertError) { console.error('Flashcard creation failed', insertError); setError(insertError.message); return }
    setCardQuestion(''); setCardAnswer('')
  }

  useEffect(() => {
    const unread = messages.filter(m => (m.user_id || m.sender_id) !== userId).map(m => ({ message_id: m.id, user_id: userId }))
    if (!unread.length) return
    async function markRead() {
      const { error: readError } = await supabase.from('room_message_reads').upsert(unread, { onConflict: 'message_id,user_id' })
      if (readError) console.warn('Room read receipt update failed', readError)
    }
    markRead()
  }, [messages, userId])

  return <div className="sv-card sv-room-study-tools">
    <div className="sv-room-tools-heading"><div><p className="sv-section-label">Study Tools</p><h2>Study together, keep the useful stuff organised</h2></div><span className="sv-streak-badge">🔥 {streak} study days / 7</span></div>
    {typingNames.length > 0 && <div className="sv-typing-indicator">{typingNames.join(', ')} {typingNames.length === 1 ? 'is' : 'are'} typing…</div>}
    {error && <button className="sv-social-notice" onClick={() => setError('')}>{error} ×</button>}
    <section className="sv-study-tool-section"><div className="sv-tool-title"><strong>📌 Pinned resources</strong><span>{pins.length}</span></div><form className="sv-tool-form" onSubmit={addPin}><input value={pinTitle} onChange={e => setPinTitle(e.target.value)} placeholder="Pin title"/><input value={pinUrl} onChange={e => setPinUrl(e.target.value)} placeholder="Link (optional)"/><button>Pin</button></form>{pins.map(p => <div className="sv-resource-row" key={p.id}><strong>{p.title}</strong>{p.url && <a href={p.url} target="_blank" rel="noreferrer">Open ↗</a>}</div>)}</section>
    <section className="sv-study-tool-section"><div className="sv-tool-title"><strong>🔎 Search room messages</strong><span>{query ? filtered.length : messages.length}</span></div><input className="sv-tool-search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search this room…"/>{query && filtered.map(m => <div className="sv-search-message" key={m.id}><small>{m.display_name || 'Member'} · {new Date(m.created_at).toLocaleString()}</small><div>{m.body || m.message}</div></div>)}</section>
    <section className="sv-study-tool-section"><div className="sv-tool-title"><strong>📚 Shared resources</strong><span>{resources.length}</span></div><form className="sv-tool-form" onSubmit={addResource}><input value={resourceTitle} onChange={e => setResourceTitle(e.target.value)} placeholder="Resource title"/><input value={resourceUrl} onChange={e => setResourceUrl(e.target.value)} placeholder="URL"/><button>Add</button></form>{resources.map(r => <div className="sv-resource-row" key={r.id}><strong>{r.title}</strong>{r.url && <a href={r.url} target="_blank" rel="noreferrer">Open ↗</a>}</div>)}</section>
    <section className="sv-study-tool-section"><div className="sv-tool-title"><strong>🧠 Flashcards</strong><span>{deckId ? 'Adding cards' : 'Create a deck'}</span></div>{!deckId ? <form className="sv-tool-form" onSubmit={createDeck}><input value={deckTitle} onChange={e => setDeckTitle(e.target.value)} placeholder="Deck title"/><button>Create deck</button></form> : <form className="sv-tool-form" onSubmit={addCard}><input value={cardQuestion} onChange={e => setCardQuestion(e.target.value)} placeholder="Question"/><input value={cardAnswer} onChange={e => setCardAnswer(e.target.value)} placeholder="Answer"/><button>Add card</button></form>}</section>
  </div>
}
