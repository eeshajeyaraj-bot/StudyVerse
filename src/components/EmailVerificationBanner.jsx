import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function EmailVerificationBanner() {
  const [user, setUser] = useState(null)
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  useEffect(() => { supabase.auth.getUser().then(({ data }) => setUser(data?.user || null)) }, [])
  if (!user || user.email_confirmed_at) return null
  async function resend() {
    setBusy(true)
    const { error } = await supabase.auth.resend({ type: 'signup', email: user.email })
    setSent(!error); if (error) alert(error.message); setBusy(false)
  }
  return <div className="sv-email-verification-banner"><span>📧 Please verify your email to keep your StudyVerse account secure.</span><button onClick={resend} disabled={busy || sent}>{busy ? 'Sending…' : sent ? 'Email sent ✓' : 'Resend email'}</button></div>
}
