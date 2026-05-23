// import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './i18n/config'
import App from './App'
import { ChatProvider } from './context/ChatContext'


createRoot(document.getElementById('root')!).render(
  // <StrictMode>
    <ChatProvider>
      <App />
    </ChatProvider>
  // </StrictMode>,
)
