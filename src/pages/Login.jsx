import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const { user } = useAuth()

  useEffect(() => {
    if (user) navigate('/')
  }, [user, navigate])

  async function handleLogin() {
    if (!email || !password) { setError('Please fill in all fields'); return }
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) {
      if (error.message.toLowerCase().includes('email not confirmed')) setError('Please verify your email first — check your inbox for the confirmation link.')
      else if (error.message.toLowerCase().includes('invalid login credentials')) setError('Incorrect email or password.')
      else setError(error.message)
    } else navigate('/')
  }

  return (
    <div className="auth-page">
      <div className="auth-shell">
        <section className="auth-intro">
          <div className="auth-brand"><span className="auth-brand-icon">◉</span><span>StudyVerse</span></div>
          <div className="auth-intro-content">
            <span className="auth-kicker">YOUR PERSONAL STUDY SPACE</span>
            <h1>Study with more<br /><span>clarity and consistency.</span></h1>
            <p>A calm workspace for focused sessions, subjects, tasks and studying together with friends.</p>
            <div className="auth-points"><span>✓ Focus sessions</span><span>✓ Progress tracking</span><span>✓ Study rooms</span></div>
          </div>
          <small className="auth-footer">© StudyVerse</small>
        </section>

        <section className="auth-form-panel">
          <div className="auth-form-wrap">
            <div className="auth-mobile-brand"><span className="auth-brand-icon">◉</span><span>StudyVerse</span></div>
            <div className="auth-heading"><span>Welcome back</span><h2>Sign in to StudyVerse</h2><p>Continue where you left off.</p></div>
            {error && <div className="auth-error">{error}</div>}
            <div className="auth-form">
              <label>Email<input type="email" placeholder="you@example.com" value={email} onChange={e => { setEmail(e.target.value); setError('') }} onKeyDown={e => e.key === 'Enter' && handleLogin()} autoComplete="email" /></label>
              <label>Password<div className="auth-password-row"><span>Password</span><Link to="/forgot-password">Forgot password?</Link></div><input type="password" placeholder="Enter your password" value={password} onChange={e => { setPassword(e.target.value); setError('') }} onKeyDown={e => e.key === 'Enter' && handleLogin()} autoComplete="current-password" /></label>
              <button className="auth-submit" onClick={handleLogin} disabled={loading}>{loading ? 'Signing in…' : 'Sign in'}</button>
            </div>
            <p className="auth-switch">New to StudyVerse? <Link to="/signup">Create an account</Link></p>
          </div>
        </section>
      </div>
      <style>{AUTH_CSS}</style>
    </div>
  )
}

const AUTH_CSS = `
.auth-page{min-height:100vh;background:#f5f7fa;color:#17212d;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;display:flex;align-items:center;justify-content:center;padding:28px;box-sizing:border-box}
.auth-shell{width:min(1120px,100%);min-height:680px;background:#fff;border:1px solid #dfe4ea;border-radius:28px;overflow:hidden;display:grid;grid-template-columns:1.02fr .98fr;box-shadow:0 24px 70px rgba(25,35,50,.10)}
.auth-intro{padding:46px;display:flex;flex-direction:column;justify-content:space-between;background:linear-gradient(145deg,#eef2f7,#f8fafc);border-right:1px solid #e2e7ed}.auth-brand,.auth-mobile-brand{display:flex;align-items:center;gap:10px;font-size:21px;font-weight:750;letter-spacing:-.4px}.auth-brand-icon{width:34px;height:34px;border-radius:11px;display:grid;place-items:center;background:#315f9e;color:#fff;font-size:19px;box-shadow:0 8px 18px rgba(49,95,158,.18)}
.auth-intro-content{max-width:480px}.auth-kicker{font-size:11px;font-weight:750;letter-spacing:1.5px;color:#6b7b8e}.auth-intro h1{font-size:48px;line-height:1.08;letter-spacing:-1.8px;margin:16px 0;color:#182331}.auth-intro h1 span{color:#315f9e}.auth-intro p{font-size:16px;line-height:1.7;color:#667487;max-width:450px}.auth-points{display:flex;flex-wrap:wrap;gap:10px;margin-top:28px}.auth-points span{padding:9px 12px;border:1px solid #d8e0e9;border-radius:999px;background:#fff;color:#526173;font-size:12px;font-weight:650}.auth-footer{color:#8a96a5}
.auth-form-panel{display:flex;align-items:center;justify-content:center;padding:52px;background:#fff}.auth-form-wrap{width:min(390px,100%)}.auth-mobile-brand{display:none;margin-bottom:38px}.auth-heading>span{font-size:12px;font-weight:700;color:#6d7b8c}.auth-heading h2{font-size:31px;letter-spacing:-1px;margin:8px 0;color:#17212d}.auth-heading p{margin:0 0 30px;color:#748193;font-size:14px}.auth-error{padding:12px 14px;border-radius:12px;background:#fff2f2;border:1px solid #f2caca;color:#b42318;font-size:13px;line-height:1.5;margin-bottom:18px}.auth-form{display:flex;flex-direction:column;gap:18px}.auth-form label{font-size:13px;font-weight:650;color:#455366}.auth-form input{display:block;width:100%;box-sizing:border-box;margin-top:8px;padding:13px 14px;border:1px solid #d7dee7;border-radius:11px;background:#fbfcfd;color:#17212d;font-size:14px;outline:none;transition:.2s}.auth-form input::placeholder{color:#9aa6b4}.auth-form input:focus{border-color:#315f9e;box-shadow:0 0 0 3px rgba(49,95,158,.10);background:#fff}.auth-password-row{display:flex;justify-content:flex-end;align-items:center;font-size:13px}.auth-password-row span{display:none}.auth-password-row a,.auth-switch a{color:#315f9e;text-decoration:none;font-weight:700}.auth-submit{border:0;border-radius:11px;padding:14px;background:#315f9e;color:#fff;font-size:15px;font-weight:750;cursor:pointer;box-shadow:0 8px 18px rgba(49,95,158,.18);transition:.2s}.auth-submit:hover{transform:translateY(-1px);background:#294f85}.auth-submit:disabled{opacity:.65;cursor:not-allowed;transform:none}.auth-switch{text-align:center;margin:26px 0 0;color:#7a8797;font-size:13px}
@media(max-width:820px){.auth-page{padding:16px}.auth-shell{grid-template-columns:1fr;min-height:auto}.auth-intro{display:none}.auth-form-panel{padding:38px 26px}.auth-mobile-brand{display:flex}.auth-heading h2{font-size:28px}}
@media(max-width:430px){.auth-page{padding:0;background:#fff}.auth-shell{border:0;border-radius:0;box-shadow:none;min-height:100vh}.auth-form-panel{padding:28px 20px}.auth-heading h2{font-size:26px}}
`