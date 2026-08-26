import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/room-cards.css'
import './styles/studyverse-ui.css'
import './styles/chat-ui.css'
import './styles/chat.css'
import './styles/chat-overrides.css'
import './styles/study-tools.css'
import './pages/Calendar.css'
import './chat-enhancements.js'
import './chat-fixes.js'
import './room-study-enhancements.jsx'
import './room-discovery-enhancements.jsx'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext'
import { TimerProvider } from './context/TimerContext'
import { BrowserRouter } from 'react-router-dom'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <TimerProvider>
          <App />
        </TimerProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
)
