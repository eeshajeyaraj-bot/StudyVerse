import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function DirectChatTools({ friendId, userId, messages = [], typing = false, onQueryChange }) {
  const [query, setQuery] = useState('')
  const [online, setOnline] = useState(false)
  useEffect(() => {
    if (!friendId || !userId) return undefined
    const channel = supabase.channel(`dm-presence:${userId}:${friendId}`, { config: { presence: { key: userId } } })
    const sync = () => setOnline(Boolean(channel.presenceState()[friendId]))
    channel.on('presence', { event: 'sync' }, sync).subscribe(async status => { if (status === 'SUBSCRIBED') await channel.track({ userId, typing }) })
    return () => supabase.removeChannel(channel)
  }, [friendId, userId, typing])
  useEffect(() => {
    const unread = messages.filter(m => m.sender_id === friendId).map(m => ({ message_id: m.id, user_id: userId }))
    if (friendId && userId && unread.length) supabase.from('direct_message_reads').upsert(unread, { onConflict: 'message_id,user_id' })
  }, [friendId, userId, messages])
  useEffect(() => { onQueryChange?.(query) }, [query, onQueryChange])
  return <div className="sv-direct-chat-tools"><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search messages…"/><span>{typing ? 'typing…' : online ? '● online' : '○ offline'}</span></div>
}
