// import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './i18n/config'
import App from './App'
import { ChatProvider } from './context/ChatContext'

// Registrar Service Worker para cache offline de assets estáticos e imágenes
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

createRoot(document.getElementById('root')!).render(
  // <StrictMode>
    <ChatProvider>
      <App />
    </ChatProvider>
  // </StrictMode>,
)
