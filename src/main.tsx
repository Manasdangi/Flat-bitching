import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { inject } from '@vercel/analytics'
import { injectSpeedInsights } from '@vercel/speed-insights'
import './index.css'
import { lazy, Suspense } from 'react'
import App from './App.tsx'
const City3D = lazy(() => import('./pages/City3D'))
const is3d = location.pathname.replace(/\/+$/, '') === '/3d'

inject()
injectSpeedInsights()

// iOS Safari ignores user-scalable=no, so stop its page-pinch gesture too (map pinch uses touch events and is unaffected).
for (const t of ['gesturestart', 'gesturechange', 'gestureend']) document.addEventListener(t, (e) => e.preventDefault())
// Newer iOS also zooms the page on a two-finger touchmove; cancel it (Leaflet and MapLibre read the touches themselves).
document.addEventListener('touchmove', (e) => { if (e.touches.length > 1) e.preventDefault() }, { passive: false })
document.addEventListener('dblclick', (e) => e.preventDefault())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {is3d ? <Suspense fallback={null}><City3D /></Suspense> : <App />}
  </StrictMode>,
)

// Installable app + offline shell (production only).
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  addEventListener('load', () => { navigator.serviceWorker.register('/sw.js').catch(() => {}) })
}
