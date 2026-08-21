import { Routes, Route, useLocation } from 'react-router-dom'

import Dashboard from './pages/Dashboard'
import Subjects from './pages/Subjects'
import Timer from './pages/Timer'
import Tasks from './pages/Tasks'
import Analytics from './pages/Analytics'
import Rooms from './pages/Rooms'
import Login from './pages/Login'
import Signup from './pages/Signup'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'

import ProtectedRoute from './components/ProtectedRoute'
import Sidebar from './components/Sidebar'
import ProfileMenu from './components/ProfileMenu'

function AppShell({ children }) {
  const { pathname } = useLocation()
  const authPage = ['/login', '/signup', '/forgot-password', '/reset-password'].includes(pathname)

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
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
      </Routes>
    </AppShell>
  )
}

export default App
