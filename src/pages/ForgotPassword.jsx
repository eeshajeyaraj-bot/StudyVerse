import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Link } from 'react-router-dom'

export default function ForgotPassword() {
  const [email, setEmail]   = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent]     = useState(false)
  const [error, setError]   = useState('')

  async function handleReset() {
    if (!email) { setError('Please enter your email address.'); return }
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/reset-password',
    })

    setLoading(false)
    if (error) {
      setError(error.message)
    } else {
      setSent(true)
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

        {sent ? (
          /* Success state */
          <div style={s.successBox}>
            <div style={s.successIcon}>📬</div>
            <h2 style={s.title}>Check your inbox!</h2>
            <p style={s.subtitle}>
              We sent a password reset link to{' '}
              <span style={{ color: '#c084fc' }}>{email}</span>.
              Click the link in the email to set a new password.
            </p>
            <p style={s.subtitleSmall}>Didn't get it? Check your spam folder.</p>
            <Link to="/login" style={s.backBtn}>← Back to login</Link>
          </div>
        ) : (
          /* Form state */
          <>
            <h1 style={s.title}>Forgot Password?</h1>
            <p style={s.subtitle}>
              No worries! Enter your email and we'll send you a reset link.
            </p>

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
                  onKeyDown={e => e.key === 'Enter' && handleReset()}
                  style={s.input}
                />
              </div>

              <button
                style={{ ...s.submitBtn, ...(loading ? s.submitBtnLoading : {}) }}
                onClick={handleReset}
                disabled={loading}
              >
                {loading ? 'Sending...' : '✉️ Send Reset Link'}
              </button>
            </div>

            <p style={s.switchText}>
              Remembered it?{' '}
              <Link to="/login" style={s.switchLink}>Back to login →</Link>
            </p>
          </>
        )}
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
    marginBottom: '8px',
  },
  subtitle: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
    marginBottom: '24px',
    lineHeight: 1.6,
  },
  subtitleSmall: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.25)',
    textAlign: 'center',
    marginTop: '-12px',
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
  successBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  successIcon: {
    fontSize: '48px',
    marginBottom: '16px',
  },
  backBtn: {
    marginTop: '8px',
    color: '#c084fc',
    textDecoration: 'none',
    fontSize: '13px',
    fontWeight: 600,
  },
}
