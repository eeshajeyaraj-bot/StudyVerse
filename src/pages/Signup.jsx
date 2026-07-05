import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Link } from 'react-router-dom'

export default function Signup() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [success, setSuccess]   = useState(false)

  async function handleSignup() {
    if (!email || !password || !confirm) { setError('Please fill in all fields'); return }
    if (password !== confirm)            { setError('Passwords do not match');    return }
    if (password.length < 6)            { setError('Password must be at least 6 characters'); return }

    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signUp({ email, password })

    setLoading(false)
    if (error) {
      setError(error.message)
    } else {
      setSuccess(true)
    }
  }

  if (success) {
    return (
      <div style={s.page}>
        <div style={s.card}>
          <div style={s.successIcon}>📩</div>
          <h2 style={s.title}>Almost there!</h2>
          <p style={s.subtitle}>
            We sent a verification link to <strong style={{ color: '#f0abfc' }}>{email}</strong>.
            Click it to activate your account, then come back and log in.
          </p>
          <Link to="/login" style={s.loginBtn}>Go to Login →</Link>
        </div>
      </div>
    )
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        {/* Logo */}
        <div style={s.logoRow}>
          <span style={s.logoIcon}>🌌</span>
          <span style={s.logoText}>StudyVerse</span>
        </div>

        <h1 style={s.title}>Create Account</h1>
        <p style={s.subtitle}>Join thousands of students leveling up their studies</p>

        {error && (
          <div style={s.errorBox}>⚠️ {error}</div>
        )}

        <div style={s.form}>
          <div style={s.fieldGroup}>
            <label style={s.label}>Email</label>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => { setEmail(e.target.value); setError('') }}
              style={s.input}
            />
          </div>

          <div style={s.fieldGroup}>
            <label style={s.label}>Password</label>
            <input
              type="password"
              placeholder="Min. 6 characters"
              value={password}
              onChange={e => { setPassword(e.target.value); setError('') }}
              style={s.input}
            />
          </div>

          <div style={s.fieldGroup}>
            <label style={s.label}>Confirm Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={confirm}
              onChange={e => { setConfirm(e.target.value); setError('') }}
              onKeyDown={e => e.key === 'Enter' && handleSignup()}
              style={s.input}
            />
          </div>

          <button
            style={{ ...s.submitBtn, ...(loading ? s.submitBtnLoading : {}) }}
            onClick={handleSignup}
            disabled={loading}
          >
            {loading ? 'Creating account...' : '🚀 Start Your Quest'}
          </button>
        </div>

        <p style={s.switchText}>
          Already have an account?{' '}
          <Link to="/login" style={s.switchLink}>Sign in →</Link>
        </p>
      </div>
    </div>
  )
}

const s = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(160deg, #0f0a1e 0%, #1a1035 50%, #0f0a1e 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
  },
  card: {
    width: '100%',
    maxWidth: '400px',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(168, 85, 247, 0.25)',
    borderRadius: '20px',
    padding: '36px 32px',
    backdropFilter: 'blur(16px)',
    textAlign: 'center',
  },
  logoRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    marginBottom: '24px',
  },
  logoIcon: { fontSize: '24px' },
  logoText: {
    fontWeight: 700,
    fontSize: '20px',
    background: 'linear-gradient(90deg, #f0abfc, #a855f7)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  title: {
    fontSize: '22px',
    fontWeight: 700,
    color: '#f1e8ff',
    textAlign: 'center',
    marginBottom: '6px',
  },
  subtitle: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.35)',
    textAlign: 'center',
    marginBottom: '24px',
    lineHeight: 1.6,
  },
  errorBox: {
    background: 'rgba(248, 113, 113, 0.1)',
    border: '1px solid rgba(248, 113, 113, 0.3)',
    borderRadius: '10px',
    padding: '10px 14px',
    color: '#f87171',
    fontSize: '13px',
    marginBottom: '16px',
    textAlign: 'left',
  },
  successIcon: { fontSize: '48px', textAlign: 'center', marginBottom: '16px' },
  form: { display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'left' },
  fieldGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.6)' },
  input: {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(168, 85, 247, 0.2)',
    borderRadius: '10px',
    color: '#f1e8ff',
    padding: '11px 14px',
    fontSize: '14px',
    outline: 'none',
    width: '100%',
    fontFamily: 'Inter, sans-serif',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s',
  },
  submitBtn: {
    width: '100%',
    padding: '13px',
    background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
    border: 'none',
    borderRadius: '11px',
    color: '#fff',
    fontSize: '15px',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 4px 16px rgba(124, 58, 237, 0.35)',
    transition: 'all 0.2s',
    marginTop: '4px',
    fontFamily: 'Inter, sans-serif',
  },
  submitBtnLoading: {
    opacity: 0.7,
    cursor: 'not-allowed',
  },
  loginBtn: {
    display: 'block',
    textAlign: 'center',
    marginTop: '20px',
    padding: '12px',
    background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
    borderRadius: '11px',
    color: '#fff',
    fontWeight: 700,
    fontSize: '14px',
    textDecoration: 'none',
  },
  switchText: {
    textAlign: 'center',
    fontSize: '13px',
    color: 'rgba(255,255,255,0.35)',
    marginTop: '20px',
  },
  switchLink: {
    color: '#c084fc',
    textDecoration: 'none',
    fontWeight: 600,
  },
}