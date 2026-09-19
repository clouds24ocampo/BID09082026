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

// Automatic Instant Browser Refresh on any Code Revision / Save
const hot = (import.meta as any).hot;
if (hot) {
  hot.on('bidocs:force-reload', () => {
    console.log('[Auto-Refresh] Code revision saved -> automatically reloading browser...');
    window.location.reload();
  });
  hot.on('vite:beforeFullReload', () => {
    console.log('[Auto-Refresh] Vite full reload triggered -> reloading browser...');
    window.location.reload();
  });
  hot.on('vite:beforeUpdate', () => {
    console.log('[Auto-Refresh] Code revision detected -> reloading browser automatically...');
    window.location.reload();
  });
  hot.accept(() => {
    window.location.reload();
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <GlobalErrorBoundary>
      <App />
    </GlobalErrorBoundary>
  </React.StrictMode>,
)

