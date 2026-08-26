import { createRoot } from 'react-dom/client'
import EmailVerificationBanner from './components/EmailVerificationBanner.jsx'

let mounted = false
function mount() {
  if (mounted) return
  const topbar = document.querySelector('.sv-topbar')
  if (!topbar) return
  const slot = document.createElement('div')
  slot.className = 'sv-email-verification-mount'
  topbar.parentElement?.insertBefore(slot, topbar)
  createRoot(slot).render(<EmailVerificationBanner />)
  mounted = true
}
if (typeof window !== 'undefined') {
  const run = () => requestAnimationFrame(mount)
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run, { once: true })
  else run()
  new MutationObserver(run).observe(document.body, { childList: true, subtree: true })
}
