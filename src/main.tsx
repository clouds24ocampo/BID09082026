import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { GlobalErrorBoundary } from './components/common/GlobalErrorBoundary'
import { debugLog } from './utils/debugLog'

// #region agent log
window.addEventListener('error', (event) => {
  debugLog('main.tsx:error', 'Uncaught window error', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno
  }, 'A');
});

window.addEventListener('unhandledrejection', (event) => {
  debugLog('main.tsx:unhandledrejection', 'Unhandled promise rejection', {
    reason: String(event.reason)
  }, 'A');
});

debugLog('main.tsx:boot', 'Application bootstrap started', {
  href: window.location.href,
  userAgent: navigator.userAgent.slice(0, 80)
}, 'A');
// #endregion

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <GlobalErrorBoundary>
      <App />
    </GlobalErrorBoundary>
  </React.StrictMode>,
)

