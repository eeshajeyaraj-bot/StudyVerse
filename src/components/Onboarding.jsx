import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const choices = [
  { id: 'cozy', emoji: '🌿', title: 'Cozy', text: 'Soft, calm and comforting' },
  { id: 'focused', emoji: '💼', title: 'Focused', text: 'Clean and distraction-free' },
  { id: 'dark', emoji: '🌙', title: 'Dark', text: 'Deep night-study atmosphere' },
  { id: 'light', emoji: '☀️', title: 'Light', text: 'Bright and energetic' },
  { id: 'custom', emoji: '🎨', title: 'Custom', text: 'I want to personalize it' },
]

export default function Onboarding({ onComplete }) {
  const { user } = useAuth()
  const [selected, setSelected] = useState('cozy')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function finish() {
    if (!user || saving) return
    setSaving(true)
    setError('')

    const { data, error: updateError } = await supabase.auth.updateUser({
      data: {
        study_experience: selected,
        mood_preset: selected,
        onboarding_completed: true,
      },
    })

    if (updateError) {
      setError(updateError.message)
      setSaving(false)
      return
    }

    setSaving(false)
    onComplete(data.user)
  }

  return (
    <div className="sv-onboarding-backdrop">
      <div className="sv-onboarding" role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
        <div className="sv-onboarding-glow" />
        <div className="sv-onboarding-icon">🌌</div>
        <p className="sv-section-label">Welcome to StudyVerse</p>
        <h2 id="onboarding-title">What kind of study experience do you prefer?</h2>
        <p className="sv-onboarding-subtitle">Choose a starting mood. You can change it anytime later.</p>

        <div className="sv-onboarding-grid">
          {choices.map(choice => (
            <button
              key={choice.id}
              type="button"
              className={`sv-onboarding-choice ${selected === choice.id ? 'selected' : ''}`}
              onClick={() => setSelected(choice.id)}
            >
              <span className="sv-onboarding-choice-emoji">{choice.emoji}</span>
              <strong>{choice.title}</strong>
              <small>{choice.text}</small>
            </button>
          ))}
        </div>

        {error && <div className="sv-onboarding-error">⚠️ {error}</div>}

        <button type="button" className="sv-onboarding-continue" onClick={finish} disabled={saving}>
          {saving ? 'Setting up your space...' : 'Enter My StudyVerse →'}
        </button>
      </div>
    </div>
  )
}
