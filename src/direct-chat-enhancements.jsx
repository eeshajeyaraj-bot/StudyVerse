import { createRoot } from 'react-dom/client'
import DirectChatTools from './components/DirectChatTools.jsx'
import { supabase } from './lib/supabase'

const mounted = new WeakSet()
async function mount() {
  const panels = document.querySelectorAll('.sv-chat-panel')
  if (!panels.length) return
  const { data } = await supabase.auth.getUser(); const userId = data?.user?.id
  if (!userId) return
  panels.forEach(panel => {
    if (mounted.has(panel)) return
    const small = panel.querySelector('.sv-chat-header small')
    const username = small?.textContent?.trim()?.replace(/^@/, '')
    if (!username) return
    const slot = document.createElement('div')
    panel.insertBefore(slot, panel.querySelector('.sv-messages'))
    createRoot(slot).render(<DirectChatTools username={username} userId={userId} />)
    mounted.add(panel)
  })
}
if (typeof window !== 'undefined') {
  const run = () => requestAnimationFrame(mount)
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run, { once: true })
  else run()
  new MutationObserver(run).observe(document.body, { childList: true, subtree: true })
}
