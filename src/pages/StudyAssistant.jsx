import { useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

const QUICK_PROMPTS = [
  'Make me a focused 45-minute study plan for today.',
  'How can I improve my study consistency?',
  'Explain how to use my StudyVerse analytics effectively.',
  'Give me a quick revision strategy for an upcoming exam.',
]

export default function StudyAssistant() {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'Hey! I’m your StudyVerse study assistant. Ask me for a study plan, revision strategy, or help understanding your progress.' },
  ])
  const [busy, setBusy] = useState(false)

  const suggestions = useMemo(() => QUICK_PROMPTS.filter(prompt => !messages.some(m => m.text === prompt)).slice(0, 3), [messages])

  async function ask(prompt = input) {
    const question = prompt.trim()
    if (!question || busy) return
    setInput('')
    setMessages(current => [...current, { role: 'user', text: question }])
    setBusy(true)

    try {
      const { data, error } = await supabase.functions.invoke('study-assistant', {
        body: { message: question },
      })
      if (error) throw error
      setMessages(current => [...current, { role: 'assistant', text: data?.reply || 'I could not generate a response right now.' }])
    } catch (error) {
      setMessages(current => [...current, {
        role: 'assistant',
        text: error?.message?.includes('OPENAI_API_KEY')
          ? 'The assistant is connected, but its AI provider key still needs to be configured in Supabase Edge Function secrets.'
          : 'I could not reach the AI assistant. Check that the Edge Function is deployed and your Supabase connection is healthy.',
      }])
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="sv-page">
      <div className="sv-container" style={{ paddingTop: 34 }}>
        <div className="sv-page-header">
          <div>
            <p className="sv-eyebrow">Study smarter</p>
            <h1>AI Study Assistant</h1>
            <p className="sv-page-subtitle">Turn your questions into practical study plans, revision strategies and better habits.</p>
          </div>
        </div>

        <section className="sv-card" style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minHeight: 430 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1, overflowY: 'auto', padding: 4 }}>
              {messages.map((message, index) => (
                <div key={`${message.role}-${index}`} style={{ alignSelf: message.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '82%' }}>
                  <div style={{ fontSize: 11, color: 'var(--app-muted)', marginBottom: 4 }}>{message.role === 'user' ? 'You' : 'StudyVerse AI'}</div>
                  <div style={{ padding: '11px 14px', borderRadius: 12, background: message.role === 'user' ? 'var(--app-accent-soft)' : 'var(--app-surface-2)', color: 'var(--app-text)', lineHeight: 1.55, fontSize: 14, whiteSpace: 'pre-wrap' }}>{message.text}</div>
                </div>
              ))}
              {busy && <div style={{ color: 'var(--app-muted)', fontSize: 13 }}>Thinking…</div>}
            </div>

            {suggestions.length > 0 && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {suggestions.map(prompt => <button key={prompt} className="sv-badge" onClick={() => ask(prompt)} disabled={busy} style={{ cursor: busy ? 'default' : 'pointer', border: 0 }}>{prompt}</button>)}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask() } }} placeholder="Ask anything about your study routine…" rows={3} style={{ flex: 1, resize: 'vertical' }} />
              <button className="sv-btn-primary" onClick={() => ask()} disabled={busy || !input.trim()}>{busy ? 'Thinking…' : 'Ask AI'}</button>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
