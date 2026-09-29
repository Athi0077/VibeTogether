import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AudioProvider } from './context/AudioContext.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { SocketProvider } from './context/SocketContext.jsx'
import { CallProvider } from './context/CallContext.jsx'
import { YouTubeProvider } from './context/YouTubeContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <SocketProvider>
        <CallProvider>
          <AudioProvider>
            <YouTubeProvider>
              <App />
            </YouTubeProvider>
          </AudioProvider>
        </CallProvider>
      </SocketProvider>
    </AuthProvider>
  </StrictMode>,
)
