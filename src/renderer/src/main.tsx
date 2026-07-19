import './mock-electron'
import './assets/main.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { ErrorBoundary } from './components/UI/ErrorBoundary'

// Global unhandled error/rejection handlers for logging & robustness
window.onerror = (message, source, lineno, colno, error) => {
  console.error('[NOVA-X Global Crash Window.onerror]:', {
    message,
    source,
    lineno,
    colno,
    error: error?.stack || error
  })
}

window.addEventListener('unhandledrejection', (event) => {
  console.error('[NOVA-X Global Crash UnhandledRejection]:', event.reason)
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary name="Root">
      <App />
    </ErrorBoundary>
  </StrictMode>
)
