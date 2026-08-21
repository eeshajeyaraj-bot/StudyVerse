export default function Placeholder({ icon, title, description }) {
  return (
    <div className="sv-page">
      <div className="sv-container sv-placeholder-page">
        <div className="sv-placeholder-icon">{icon}</div>
        <p className="sv-section-label">StudyVerse</p>
        <h1>{title}</h1>
        <p>{description}</p>
        <span className="sv-placeholder-badge">This workspace is being prepared ✨</span>
      </div>
    </div>
  )
}
