import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const navigate                = useNavigate()
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
      if (error.message.toLowerCase().includes('email not confirmed')) {
        setError('Please verify your email first — check your inbox for the confirmation link.')
      } else if (error.message.toLowerCase().includes('invalid login credentials')) {
        setError('Incorrect email or password.')
      } else {
        setError(error.message)
      }
    } else {
      navigate('/')
    }
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        {/* Logo */}
        <div style={s.logoRow}>
          <span style={s.logoIcon}>🌌</span>
          <span style={s.logoText}>StudyVerse</span>
        </div>

        <h1 style={s.title}>Welcome Back</h1>
        <p style={s.subtitle}>Continue your learning quest</p>

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
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              style={s.input}
            />
          </div>

          <div style={s.fieldGroup}>
            <div style={s.passwordLabelRow}>
              <label style={s.label}>Password</label>
              <Link to="/forgot-password" style={s.forgotLink}>Forgot password?</Link>
            </div>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => { setPassword(e.target.value); setError('') }}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              style={s.input}
            />
          </div>

          <button
            style={{ ...s.submitBtn, ...(loading ? s.submitBtnLoading : {}) }}
            onClick={handleLogin}
            disabled={loading}
          >
            {loading ? 'Signing in...' : '⚔️ Enter StudyVerse'}
          </button>
        </div>

        <p style={s.switchText}>
          New to StudyVerse?{' '}
          <Link to="/signup" style={s.switchLink}>Create an account →</Link>
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
  },
  errorBox: {
    background: 'rgba(248, 113, 113, 0.1)',
    border: '1px solid rgba(248, 113, 113, 0.3)',
    borderRadius: '10px',
    padding: '10px 14px',
    color: '#f87171',
    fontSize: '13px',
    marginBottom: '16px',
    lineHeight: 1.5,
  },
  form: { display: 'flex', flexDirection: 'column', gap: '16px' },
  fieldGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
  passwordLabelRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: { fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.6)' },
  forgotLink: {
    fontSize: '12px',
    color: '#c084fc',
    textDecoration: 'none',
    fontWeight: 500,
  },
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
