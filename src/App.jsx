import { useEffect } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'

import Dashboard from './pages/Dashboard'
import Subjects from './pages/Subjects'
import Timer from './pages/Timer'
import Tasks from './pages/Tasks'
import Analytics from './pages/Analytics'
import Rooms from './pages/Rooms'
import Settings from './pages/Settings'
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
:root{--app-background:#f5f7fa;--app-sidebar:#ffffff;--app-surface:#ffffff;--app-surface-soft:#f8fafc;--app-accent:#4f6f95;--app-accent-soft:rgba(79,111,149,.10);--app-border:rgba(24,39,58,.11);--app-text:#17212d;--app-muted:#687586;--app-placeholder:#718092;--app-shadow:0 8px 28px rgba(20,25,35,.06)}
html[data-theme="cozy"]{--app-background:#f7f3ee;--app-sidebar:#eee7df;--app-surface:#fffaf5;--app-surface-soft:#f5ede5;--app-accent:#9b6255;--app-accent-soft:rgba(155,98,85,.10);--app-border:rgba(74,58,48,.14);--app-text:#302923;--app-muted:#756b63;--app-placeholder:#81756d;--app-shadow:0 8px 28px rgba(74,58,48,.08);color-scheme:light}
html[data-theme="focused"]{--app-background:#eef2f7;--app-sidebar:#e5eaf1;--app-surface:#ffffff;--app-surface-soft:#f5f8fb;--app-accent:#315f9e;--app-accent-soft:rgba(49,95,158,.10);--app-border:rgba(28,48,72,.12);--app-text:#182331;--app-muted:#657384;--app-placeholder:#788697;--app-shadow:0 8px 28px rgba(28,48,72,.07);color-scheme:light}
html[data-theme="dark"]{--app-background:#11151c;--app-sidebar:#171c24;--app-surface:#1d232d;--app-surface-soft:#222a35;--app-accent:#8fa8ff;--app-accent-soft:rgba(143,168,255,.12);--app-border:rgba(255,255,255,.10);--app-text:#eef2f7;--app-muted:#a1acba;--app-placeholder:#8c98a7;--app-shadow:0 10px 30px rgba(0,0,0,.22);color-scheme:dark}
html[data-theme="light"]{--app-background:#f5f7fa;--app-sidebar:#ffffff;--app-surface:#ffffff;--app-surface-soft:#f7f9fb;--app-accent:#4f6f95;--app-accent-soft:rgba(79,111,149,.10);--app-border:rgba(24,39,58,.11);--app-text:#17212d;--app-muted:#687586;--app-placeholder:#718092;--app-shadow:0 8px 28px rgba(20,25,35,.06);color-scheme:light}
html[data-theme="custom"]{--app-background:#f4f1f8;--app-sidebar:#eee9f4;--app-surface:#ffffff;--app-surface-soft:#f8f5fb;--app-accent:#7657a6;--app-accent-soft:rgba(118,87,166,.10);--app-border:rgba(67,45,91,.12);--app-text:#241d2d;--app-muted:#71687b;--app-placeholder:#7d7387;--app-shadow:0 8px 28px rgba(67,45,91,.07);color-scheme:light}
body{background:var(--app-background)!important;color:var(--app-text)!important;transition:background .25s ease,color .25s ease}
.sv-app-shell{background:var(--app-background)!important;color:var(--app-text)!important}
.sv-main{background:var(--app-background)!important}
.sv-sidebar{background:var(--app-sidebar)!important;border-color:var(--app-border)!important;box-shadow:none!important}
.sv-sidebar-brand{color:var(--app-text)!important}
.sv-topbar{background:color-mix(in srgb,var(--app-background) 94%,transparent)!important;border-color:var(--app-border)!important;box-shadow:none!important}
.sv-card,.sv-profile-trigger,.sv-profile-menu{background:var(--app-surface)!important;border-color:var(--app-border)!important;box-shadow:var(--app-shadow)!important}
.sv-action-card,.sv-room-choice,.sv-onboarding-choice{background:var(--app-surface)!important;border-color:var(--app-border)!important}
.sv-action-card:hover,.sv-room-choice:hover,.sv-onboarding-choice:hover{background:var(--app-accent-soft)!important;border-color:var(--app-accent)!important}
.sv-sidebar-link{color:var(--app-muted)!important}.sv-sidebar-link:hover,.sv-sidebar-link.active{color:var(--app-text)!important;background:var(--app-accent-soft)!important;border-color:var(--app-border)!important;box-shadow:inset 3px 0 var(--app-accent)!important}
.sv-section-label,.sv-eyebrow,.sv-list-main small,.sv-action-card small,.sv-room-choice-text,.sv-onboarding-subtitle,.sv-profile-text small,.sv-profile-menu-header small{color:var(--app-muted)!important}
.sv-page-header h1,.sv-card strong,.sv-action-card strong,.sv-room-choice-title,.sv-profile-text strong,.sv-profile-menu-header strong{color:var(--app-text)!important}
.sv-page p,.sv-page h1,.sv-page h2,.sv-page h3,.sv-page label,.sv-page span,.sv-page small,.sv-page strong{transition:color .2s ease}
.sv-page input::placeholder,.sv-page textarea::placeholder{color:var(--app-placeholder)!important;opacity:1!important}
.sv-page input,.sv-page textarea,.sv-page select{color:var(--app-text)!important;background:var(--app-surface)!important;border-color:var(--app-border)!important}
.sv-page input:focus,.sv-page textarea:focus,.sv-page select:focus{border-color:var(--app-accent)!important;box-shadow:0 0 0 3px var(--app-accent-soft)!important}
.sv-page button{color:var(--app-text)}
.sv-gradient-text{background:linear-gradient(90deg,var(--app-accent),var(--app-accent))!important;-webkit-background-clip:text!important}
.sv-progress-fill{background:var(--app-accent)!important}
.sv-badge{background:var(--app-accent-soft)!important;border-color:var(--app-border)!important;color:var(--app-accent)!important}
input:not([type="checkbox"]):not([type="radio"]),select,textarea{background:var(--app-surface)!important;color:var(--app-text)!important;border-color:var(--app-border)!important}
input:not([type="checkbox"]):not([type="radio"]):focus,select:focus,textarea:focus{border-color:var(--app-accent)!important;box-shadow:0 0 0 3px var(--app-accent-soft)!important}
select option{background:var(--app-surface)!important;color:var(--app-text)!important}
button:not(.sv-sidebar-link):not(.sv-sidebar-collapse):not(.sv-profile-trigger):not(.sv-profile-menu button):not(.sv-mobile-menu):not(.sv-onboarding-choice){background:var(--app-accent-soft)!important;color:var(--app-text)!important;border-color:var(--app-border)!important;box-shadow:none!important}
.sv-primary-button{background:var(--app-accent)!important;color:#fff!important;border-color:var(--app-accent)!important}
.sv-profile-menu{border-radius:14px!important}
.sv-profile-menu button{color:var(--app-text)!important}.sv-profile-menu button:hover{background:var(--app-accent-soft)!important}.sv-profile-status{display:block!important;margin-top:3px!important;font-size:10px!important;color:#16a34a!important}
.sv-onboarding-backdrop{background:rgba(20,25,32,.55)!important}.sv-onboarding{background:var(--app-surface)!important;border-color:var(--app-border)!important;box-shadow:0 24px 80px rgba(20,25,35,.18)!important}.sv-onboarding-glow{display:none!important}.sv-onboarding-choice{color:var(--app-text)!important}.sv-onboarding-choice small{color:var(--app-muted)!important}.sv-onboarding-choice.selected{border-color:var(--app-accent)!important;background:var(--app-accent-soft)!important;box-shadow:none!important}.sv-onboarding-continue{background:var(--app-accent)!important;color:#fff!important}
.sv-settings-nav button{color:var(--app-muted)!important}.sv-settings-nav button.active{color:var(--app-text)!important;background:var(--app-accent-soft)!important}.sv-settings-card h2{color:var(--app-text)!important}.sv-settings-card p,.sv-settings-card label{color:var(--app-muted)!important}.sv-theme-option strong{color:var(--app-text)!important}.sv-theme-option small{color:var(--app-muted)!important}.sv-toggle-list label span{color:var(--app-text)!important}
@media(max-width:760px){.sv-profile-text{display:none}.sv-profile-trigger{padding:6px}.sv-profile-menu{right:0;width:min(290px,calc(100vw - 24px))}}
`

function ThemeManager({ user }) {
  useEffect(() => {
    const theme = user?.user_metadata?.appearance || user?.user_metadata?.study_experience || localStorage.getItem('studyverse-theme') || 'light'
    document.documentElement.dataset.theme = theme
    localStorage.setItem('studyverse-theme', theme)
  }, [user?.user_metadata?.appearance, user?.user_metadata?.study_experience])
  return <style>{THEME_CSS}</style>
}

function AppShell({ children }) {
  const { pathname } = useLocation()
  const { user } = useAuth()
  const authPage = ['/login', '/signup', '/forgot-password', '/reset-password'].includes(pathname)
  const needsOnboarding = Boolean(user && user.user_metadata?.onboarding_completed !== true)

  return <><ThemeManager user={user} />{authPage ? children : <div className="sv-app-shell"><Sidebar /><main className="sv-main"><header className="sv-topbar"><div className="sv-topbar-spacer" /><ProfileMenu /></header>{children}</main>{needsOnboarding && <Onboarding onComplete={() => window.location.reload()} />}</div>}</n}

function App() {
  return <AppShell><Routes>
    <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
    <Route path="/subjects" element={<ProtectedRoute><Subjects /></ProtectedRoute>} />
    <Route path="/timer" element={<ProtectedRoute><Timer /></ProtectedRoute>} />
    <Route path="/tasks" element={<ProtectedRoute><Tasks /></ProtectedRoute>} />
    <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
    <Route path="/rooms" element={<ProtectedRoute><Rooms /></ProtectedRoute>} />
    <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
    <Route path="/friends" element={<ProtectedRoute><Placeholder icon="👥" title="Friends" description="Connect with study friends, manage requests, and chat with your study circle." /></ProtectedRoute>} />
    <Route path="/calendar" element={<ProtectedRoute><Placeholder icon="📅" title="Calendar" description="Your tasks, study sessions, exams, deadlines, and room events will live here." /></ProtectedRoute>} />
    <Route path="/resources" element={<ProtectedRoute><Placeholder icon="📖" title="Resources" description="Keep your study resources, notes, and useful links organized here." /></ProtectedRoute>} />
    <Route path="/support" element={<ProtectedRoute><Placeholder icon="💬" title="Support" description="Get help with StudyVerse and find answers when you need them." /></ProtectedRoute>} />
    <Route path="/login" element={<Login />} /><Route path="/signup" element={<Signup />} /><Route path="/forgot-password" element={<ForgotPassword />} /><Route path="/reset-password" element={<ResetPassword />} />
  </Routes></AppShell>
}
export default App
