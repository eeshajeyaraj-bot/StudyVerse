import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Link } from 'react-router-dom'

export default function Signup() {
  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [ageRange, setAgeRange] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function handleSignup() {
    if (!displayName || !username || !ageRange || !email || !password || !confirm) return setError('Please fill in all fields')
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) return setError('Username must be 3–20 characters using letters, numbers or _')
    if (password !== confirm) return setError('Passwords do not match')
    if (password.length < 6) return setError('Password must be at least 6 characters')
    setLoading(true); setError('')
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { display_name: displayName.trim(), username: username.toLowerCase(), age_range: ageRange, emoji_avatar: '👤', status: 'Available' } },
    })
    setLoading(false)
    if (error) setError(error.message); else setSuccess(true)
  }

  return <div className="auth-page"><div className="auth-shell">
    <section className="auth-intro"><div className="auth-brand"><span className="auth-brand-icon">◉</span><span>StudyVerse</span></div><div className="auth-intro-content"><span className="auth-kicker">START YOUR STUDY SPACE</span><h1>Make study time<br/><span>work for you.</span></h1><p>Create a personal workspace for focused sessions, subjects, tasks and studying together.</p><div className="auth-points"><span>✓ Personal profile</span><span>✓ Focus sessions</span><span>✓ Study together</span></div></div><small className="auth-footer">© StudyVerse</small></section>
    <section className="auth-form-panel"><div className="auth-form-wrap"><div className="auth-mobile-brand"><span className="auth-brand-icon">◉</span><span>StudyVerse</span></div>
      {success ? <div className="auth-success"><div className="auth-success-icon">✓</div><span className="auth-kicker">ONE LAST STEP</span><h2>Check your inbox</h2><p>We sent a verification link to <strong>{email}</strong>. Verify your email, then sign in to continue.</p><Link to="/login" className="auth-submit">Go to sign in</Link></div> : <>
        <div className="auth-heading"><span>Get started</span><h2>Create your account</h2><p>Tell us a little about your study profile.</p></div>
        {error && <div className="auth-error">{error}</div>}
        <div className="auth-form auth-form-grid">
          <label>Display name<input placeholder="How should we call you?" value={displayName} onChange={e=>{setDisplayName(e.target.value);setError('')}} autoComplete="name"/></label>
          <label>Username<input placeholder="e.g. eesha_studies" value={username} onChange={e=>{setUsername(e.target.value.replace(/\s/g,''));setError('')}} autoComplete="username"/></label>
          <label>Age range<select value={ageRange} onChange={e=>{setAgeRange(e.target.value);setError('')}}><option value="">Select age range</option><option>Under 13</option><option>13–15</option><option>16–17</option><option>18–24</option><option>25–34</option><option>35+</option><option>Prefer not to say</option></select></label>
          <label>Email<input type="email" placeholder="you@example.com" value={email} onChange={e=>{setEmail(e.target.value);setError('')}} autoComplete="email"/></label>
          <label>Password<input type="password" placeholder="At least 6 characters" value={password} onChange={e=>{setPassword(e.target.value);setError('')}} autoComplete="new-password"/></label>
          <label>Confirm password<input type="password" placeholder="Re-enter your password" value={confirm} onChange={e=>{setConfirm(e.target.value);setError('')}} onKeyDown={e=>e.key==='Enter'&&handleSignup()} autoComplete="new-password"/></label>
          <button className="auth-submit auth-full" onClick={handleSignup} disabled={loading}>{loading?'Creating account…':'Create account'}</button>
        </div><p className="auth-switch">Already have an account? <Link to="/login">Sign in</Link></p>
      </>}
    </div></section>
  </div><style>{CSS}</style></div>
}

const CSS=`.auth-page{min-height:100vh;background:#f5f7fa;color:#17212d;font-family:Inter,system-ui,sans-serif;display:flex;align-items:center;justify-content:center;padding:28px;box-sizing:border-box}.auth-shell{width:min(1120px,100%);min-height:680px;background:#fff;border:1px solid #dfe4ea;border-radius:28px;overflow:hidden;display:grid;grid-template-columns:1.02fr .98fr;box-shadow:0 24px 70px rgba(25,35,50,.1)}.auth-intro{padding:46px;display:flex;flex-direction:column;justify-content:space-between;background:linear-gradient(145deg,#eef2f7,#f8fafc);border-right:1px solid #e2e7ed}.auth-brand,.auth-mobile-brand{display:flex;align-items:center;gap:10px;font-size:21px;font-weight:750}.auth-brand-icon{width:34px;height:34px;border-radius:11px;display:grid;place-items:center;background:#315f9e;color:#fff}.auth-intro-content{max-width:480px}.auth-kicker{font-size:11px;font-weight:750;letter-spacing:1.5px;color:#6b7b8e}.auth-intro h1{font-size:48px;line-height:1.08;letter-spacing:-1.8px;margin:16px 0;color:#182331}.auth-intro h1 span{color:#315f9e}.auth-intro p{font-size:16px;line-height:1.7;color:#667487}.auth-points{display:flex;flex-wrap:wrap;gap:10px;margin-top:28px}.auth-points span{padding:9px 12px;border:1px solid #d8e0e9;border-radius:999px;background:#fff;color:#526173;font-size:12px;font-weight:650}.auth-footer{color:#8a96a5}.auth-form-panel{display:flex;align-items:center;justify-content:center;padding:42px;background:#fff}.auth-form-wrap{width:min(430px,100%)}.auth-mobile-brand{display:none;margin-bottom:30px}.auth-heading>span{font-size:12px;font-weight:700;color:#6d7b8c}.auth-heading h2,.auth-success h2{font-size:30px;letter-spacing:-1px;margin:8px 0;color:#17212d}.auth-heading p{margin:0 0 24px;color:#748193;font-size:14px}.auth-error{padding:12px 14px;border-radius:12px;background:#fff2f2;border:1px solid #f2caca;color:#b42318;font-size:13px;line-height:1.5;margin-bottom:16px}.auth-form{display:flex;flex-direction:column;gap:15px}.auth-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:15px}.auth-form label{font-size:12px;font-weight:700;color:#455366}.auth-form input,.auth-form select{display:block;width:100%;box-sizing:border-box;margin-top:7px;padding:12px 13px;border:1px solid #d7dee7;border-radius:11px;background:#fbfcfd;color:#17212d;font-size:13px;outline:none}.auth-form input::placeholder{color:#9aa6b4}.auth-form input:focus,.auth-form select:focus{border-color:#315f9e;box-shadow:0 0 0 3px rgba(49,95,158,.1);background:#fff}.auth-submit{border:0;border-radius:11px;padding:13px;background:#315f9e;color:#fff;font-size:14px;font-weight:750;cursor:pointer;text-align:center;text-decoration:none;box-sizing:border-box}.auth-full{grid-column:1/-1;width:100%;box-shadow:0 8px 18px rgba(49,95,158,.18)}.auth-submit:disabled{opacity:.65;cursor:not-allowed}.auth-switch{text-align:center;margin:22px 0 0;color:#7a8797;font-size:13px}.auth-switch a{color:#315f9e;text-decoration:none;font-weight:700}.auth-success{text-align:center}.auth-success-icon{width:64px;height:64px;border-radius:20px;background:#e9f5ed;color:#21814b;display:grid;place-items:center;font-size:30px;font-weight:800;margin:0 auto 24px}.auth-success p{font-size:14px;line-height:1.7;color:#748193;margin:0 0 26px}.auth-success p strong{color:#315f9e}@media(max-width:820px){.auth-page{padding:16px}.auth-shell{grid-template-columns:1fr;min-height:auto}.auth-intro{display:none}.auth-form-panel{padding:38px 26px}.auth-mobile-brand{display:flex}.auth-heading h2{font-size:28px}}@media(max-width:520px){.auth-form-grid{grid-template-columns:1fr}.auth-full{grid-column:auto}}@media(max-width:430px){.auth-page{padding:0;background:#fff}.auth-shell{border:0;border-radius:0;box-shadow:none;min-height:100vh}.auth-form-panel{padding:28px 20px}}`