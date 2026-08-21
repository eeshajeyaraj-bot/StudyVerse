import { useEffect } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'

import Dashboard from './pages/Dashboard'
import Subjects from './pages/Subjects'
import Timer from './pages/Timer'
import Tasks from './pages/Tasks'
import Analytics from './pages/Analytics'
import Rooms from './pages/Rooms'
import Placeholder from './pages/Placeholder'
import Login from './pages/Login'
import Signup from './pages/Signup'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'

import ProtectedRoute from './components/ProtectedRoute'
import Sidebar from './components/Sidebar'
import ProfileMenu from './components/ProfileMenu'
import Onboarding from './components/Onboarding'
import { useAuth } from './context/AuthContext'

const THEME_CSS = `
:root{--app-background:#0b0d12;--app-sidebar:#10131a;--app-surface:#171b24;--app-accent:#8b7cf6;--app-accent-soft:rgba(139,124,246,.14);--app-border:rgba(255,255,255,.09);--app-text:#f4f5f7;--app-muted:#8f96a3}
html[data-theme="cozy"]{--app-background:#f7f3ee;--app-sidebar:#eee7df;--app-surface:#fffaf5;--app-accent:#a66a5b;--app-accent-soft:rgba(166,106,91,.12);--app-border:rgba(74,58,48,.12);--app-text:#302923;--app-muted:#756b63;color-scheme:light}
html[data-theme="focused"]{--app-background:#eef2f7;--app-sidebar:#e5eaf1;--app-surface:#ffffff;--app-accent:#315f9e;--app-accent-soft:rgba(49,95,158,.11);--app-border:rgba(28,48,72,.12);--app-text:#182331;--app-muted:#657384;color-scheme:light}
html[data-theme="dark"]{--app-background:#0b0d12;--app-sidebar:#10131a;--app-surface:#151922;--app-accent:#9a8cff;--app-accent-soft:rgba(154,140,255,.14);--app-border:rgba(255,255,255,.09);--app-text:#f4f5f7;--app-muted:#8f96a3;color-scheme:dark}
html[data-theme="light"]{--app-background:#f5f7fa;--app-sidebar:#ffffff;--app-surface:#ffffff;--app-accent:#4f6f95;--app-accent-soft:rgba(79,111,149,.10);--app-border:rgba(24,39,58,.11);--app-text:#17212d;--app-muted:#687586;color-scheme:light}
html[data-theme="custom"]{--app-background:#f4f1f8;--app-sidebar:#eee9f4;--app-surface:#ffffff;--app-accent:#7657a6;--app-accent-soft:rgba(118,87,166,.11);--app-border:rgba(67,45,91,.12);--app-text:#241d2d;--app-muted:#71687b;color-scheme:light}
body{background:var(--app-background)!important;color:var(--app-text)!important;transition:background .25s ease,color .25s ease}
.sv-app-shell{background:var(--app-background)!important;color:var(--app-text)!important}
.sv-sidebar{background:var(--app-sidebar)!important;border-color:var(--app-border)!important}
.sv-topbar{background:color-mix(in srgb,var(--app-background) 88%,transparent)!important;border-color:var(--app-border)!important}
.sv-card,.sv-profile-trigger,.sv-profile-menu{background:var(--app-surface)!important;border-color:var(--app-border)!important;box-shadow:0 8px 28px rgba(20,25,35,.06)!important}
.sv-action-card,.sv-room-choice,.sv-onboarding-choice{background:var(--app-surface)!important;border-color:var(--app-border)!important}
.sv-action-card:hover,.sv-room-choice:hover,.sv-onboarding-choice:hover{background:var(--app-accent-soft)!important;border-color:var(--app-accent)!important}
.sv-sidebar-link{color:var(--app-muted)!important}.sv-sidebar-link:hover,.sv-sidebar-link.active{color:var(--app-text)!important;background:var(--app-accent-soft)!important;border-color:var(--app-border)!important;box-shadow:inset 3px 0 var(--app-accent)!important}
.sv-section-label,.sv-eyebrow,.sv-list-main small,.sv-action-card small,.sv-room-choice-text,.sv-onboarding-subtitle,.sv-profile-text small{color:var(--app-muted)!important}
.sv-page-header h1,.sv-card strong,.sv-action-card strong,.sv-room-choice-title,.sv-profile-text strong{color:var(--app-text)!important}
.sv-gradient-text{background:linear-gradient(90deg,var(--app-accent),var(--app-accent))!important;-webkit-background-clip:text!important}
.sv-progress-fill{background:var(--app-accent)!important}
.sv-badge{background:var(--app-accent-soft)!important;border-color:var(--app-border)!important;color:var(--app-accent)!important}
input:not([type="checkbox"]):not([type="radio"]),select,textarea{background:var(--app-surface)!important;color:var(--app-text)!important;border-color:var(--app-border)!important}
input:not([type="checkbox"]):not([type="radio"]):focus,select:focus,textarea:focus{border-color:var(--app-accent)!important;box-shadow:0 0 0 3px var(--app-accent-soft)!important}
button:not(.sv-sidebar-link):not(.sv-sidebar-collapse):not(.sv-profile-trigger):not(.sv-profile-menu button):not(.sv-mobile-menu):not(.sv-onboarding-choice){background:var(--app-accent-soft)!important;color:var(--app-text)!important;border-color:var(--app-border)!important;box-shadow:none!important}
.sv-onboarding-backdrop{background:rgba(15,18,24,.58)!important}.sv-onboarding{background:var(--app-surface)!important;border-color:var(--app-border)!important}.sv-onboarding-continue{background:var(--app-accent)!important;color:#fff!important}
`

function ThemeManager({ user }) {
  useEffect(() => {
    const theme = user?.user_metadata?.study_experience || localStorage.getItem('studyverse-theme') || 'dark'
    document.documentElement.dataset.theme = theme
    localStorage.setItem('studyverse-theme', theme)
  }, [user?.user_metadata?.study_experience])
  return <style>{THEME_CSS}</style>
}

function AppShell({ children }) {
  const { pathname } = useLocation()
  const { user } = useAuth()
  const authPage = ['/login', '/signup', '/forgot-password', '/reset-password'].includes(pathname)
  const needsOnboarding = Boolean(user && user.user_metadata?.onboarding_completed !== true)

  return (
    <>
      <ThemeManager user={user} />
      {authPage ? children : (
        <div className="sv-app-shell">
          <Sidebar />
          <main className="sv-main">
            <header className="sv-topbar"><div className="sv-topbar-spacer" /><ProfileMenu /></header>
            {children}
          </main>
          {needsOnboarding && <Onboarding onComplete={() => window.location.reload()} />}
        </div>
      )}
    </>
  )
}

function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/subjects" element={<ProtectedRoute><Subjects /></ProtectedRoute>} />
        <Route path="/timer" element={<ProtectedRoute><Timer /></ProtectedRoute>} />
        <Route path="/tasks" element={<ProtectedRoute><Tasks /></ProtectedRoute>} />
        <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
        <Route path="/rooms" element={<ProtectedRoute><Rooms /></ProtectedRoute>} />
        <Route path="/friends" element={<ProtectedRoute><Placeholder icon="👥" title="Friends" description="Connect with study friends, manage requests, and chat with your study circle." /></ProtectedRoute>} />
        <Route path="/calendar" element={<ProtectedRoute><Placeholder icon="📅" title="Calendar" description="Your tasks, study sessions, exams, deadlines, and room events will live here." /></ProtectedRoute>} />
        <Route path="/resources" element={<ProtectedRoute><Placeholder icon="📖" title="Resources" description="Keep your study resources, notes, and useful links organized here." /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Placeholder icon="⚙️" title="Settings" description="Profile, appearance, notifications, privacy, and StudyVerse preferences will be managed here." /></ProtectedRoute>} />
        <Route path="/support" element={<ProtectedRoute><Placeholder icon="💬" title="Support" description="Get help with StudyVerse and find answers when you need them." /></ProtectedRoute>} />
        <Route path="/login" element={<Login />} /><Route path="/signup" element={<Signup />} /><Route path="/forgot-password" element={<ForgotPassword />} /><Route path="/reset-password" element={<ResetPassword />} />
      </Routes>
    </AppShell>
  )
}

export default App
