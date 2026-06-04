/** アプリケーションのエントリーポイント */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './i18n'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/ui/ErrorBoundary.tsx'

registerSW({
  immediate: true,
  onRegisterError(error) {
    console.error('Service Worker registration failed:', error)
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
