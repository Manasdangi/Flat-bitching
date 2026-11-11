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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {is3d ? <Suspense fallback={null}><City3D /></Suspense> : <App />}
  </StrictMode>,
)

// Installable app + offline shell (production only).
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  addEventListener('load', () => { navigator.serviceWorker.register('/sw.js').catch(() => {}) })
}
