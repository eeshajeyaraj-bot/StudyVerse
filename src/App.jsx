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

function AppShell({ children }) {
  const { pathname } = useLocation()
  const { user } = useAuth()
  const authPage = ['/login', '/signup', '/forgot-password', '/reset-password'].includes(pathname)
  const needsOnboarding = Boolean(user && user.user_metadata?.onboarding_completed !== true)

  if (authPage) return children

  return (
    <div className="sv-app-shell">
      <Sidebar />
      <main className="sv-main">
        <header className="sv-topbar">
          <div className="sv-topbar-spacer" />
          <ProfileMenu />
        </header>
        {children}
      </main>
      {needsOnboarding && <Onboarding onComplete={() => window.location.reload()} />}
    </div>
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
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
      </Routes>
    </AppShell>
  )
}

export default App
