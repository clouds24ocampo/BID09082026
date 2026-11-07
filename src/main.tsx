import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { GlobalErrorBoundary } from './components/common/GlobalErrorBoundary'


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

// Offline app shell (web/PWA only). Skipped in dev, and inside the Electron/Capacitor shells
// where assets are already bundled locally (file:// and capacitor:// are not http(s)).
if (import.meta.env.PROD && 'serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((err) => console.warn('[SW] registration failed', err));
  });
}
