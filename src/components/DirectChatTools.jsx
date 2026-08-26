import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function DirectChatTools({ username, userId }) {
  const [query, setQuery] = useState('')
  const [online, setOnline] = useState(false)
  const [typing, setTyping] = useState(false)

  useEffect(() => {
    let active = true
    async function setup() {
      const { data: person } = await supabase.from('profiles').select('id,display_name,name').eq('name', username).maybeSingle()
      if (!active || !person?.id) return
      const { data: messages } = await supabase.from('direct_messages').select('id,sender_id,recipient_id').or(`and(sender_id.eq.${person.id},recipient_id.eq.${userId}),and(sender_id.eq.${userId},recipient_id.eq.${person.id})`).limit(200)
      const unread = (messages || []).filter(m => m.sender_id === person.id).map(m => ({ message_id: m.id, user_id: userId }))
      if (unread.length) await supabase.from('direct_message_reads').upsert(unread, { onConflict: 'message_id,user_id' })
      const channel = supabase.channel(`dm-presence:${userId}:${person.id}`, { config: { presence: { key: userId } } })
      channel.on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        setOnline(Boolean(state[person.id]))
        const someoneTyping = Object.values(state).flat().some(x => x.userId === person.id && x.typing)
        setTyping(someoneTyping)
      }).subscribe(async status => { if (status === 'SUBSCRIBED') await channel.track({ userId, typing: false }) })
      return () => supabase.removeChannel(channel)
    }
    let cleanup
    setup().then(fn => { cleanup = fn })
    return () => { active = false; cleanup?.() }
  }, [username, userId])

  useEffect(() => {
    const input = document.querySelector('.sv-chat-panel .sv-message-compose input:not([type="file"])')
    if (!input) return undefined
    const sendTyping = async value => {
      const { data: person } = await supabase.from('profiles').select('id').eq('name', username).maybeSingle()
      if (!person?.id) return
      const channel = supabase.channel(`dm-presence:${userId}:${person.id}`, { config: { presence: { key: userId } } })
      channel.subscribe(async status => { if (status === 'SUBSCRIBED') { await channel.track({ userId, typing: value }); setTimeout(() => supabase.removeChannel(channel), 1200) } })
    }
    const onInput = () => sendTyping(input.value.trim().length > 0)
    input.addEventListener('input', onInput)
    return () => input.removeEventListener('input', onInput)
  }, [username, userId])

  useEffect(() => {
    const messages = document.querySelectorAll('.sv-chat-panel .sv-message')
    const q = query.trim().toLowerCase()
    messages.forEach(node => { node.style.display = !q || node.textContent.toLowerCase().includes(q) ? '' : 'none' })
    return () => messages.forEach(node => { node.style.display = '' })
  }, [query])

  return <div className="sv-direct-chat-tools"><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search messages…"/><span>{typing ? 'typing…' : online ? '● online' : '○ offline'}</span></div>
}
