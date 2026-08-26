import { createRoot } from 'react-dom/client'
import RoomStudyTools from './components/RoomStudyTools.jsx'
import { supabase } from './lib/supabase'

const mounted = new WeakSet()
async function mountRoomTools() {
  const rooms = document.querySelectorAll('.sv-room-view')
  if (!rooms.length) return
  const { data } = await supabase.auth.getUser()
  const userId = data?.user?.id
  if (!userId) return
  const roomId = localStorage.getItem(`studyverse_active_room_${userId}`)
  if (!roomId) return
  rooms.forEach(node => {
    if (mounted.has(node)) return
    const host = document.createElement('div')
    host.className = 'sv-room-study-tools-mount'
    node.appendChild(host)
    createRoot(host).render(<RoomStudyTools roomId={roomId} userId={userId} />)
    mounted.add(node)
  })
}
if (typeof window !== 'undefined') {
  const run = () => requestAnimationFrame(mountRoomTools)
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run, { once: true })
  else run()
  new MutationObserver(run).observe(document.body, { childList: true, subtree: true })
}
