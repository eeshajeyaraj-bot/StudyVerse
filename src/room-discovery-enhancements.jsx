import { createRoot } from 'react-dom/client'
import RoomDiscovery from './components/RoomDiscovery.jsx'

let mountedNode = null
function mount() {
  if (window.location.pathname !== '/rooms') return
  if (mountedNode && document.body.contains(mountedNode)) return
  mountedNode = null
  if (document.querySelector('.sv-room-view')) return
  if (!document.querySelector('.sv-room-choice')) return
  const container = document.createElement('div')
  container.className = 'sv-room-discovery-mount'
  const anchor = document.querySelector('.sv-room-choice')?.parentElement?.parentElement
  ;(anchor || document.querySelector('.sv-container'))?.appendChild(container)
  createRoot(container).render(<RoomDiscovery />)
  mountedNode = container
}
if (typeof window !== 'undefined') {
  const run = () => requestAnimationFrame(mount)
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run, { once: true })
  else run()
  new MutationObserver(run).observe(document.body, { childList: true, subtree: true })
}
