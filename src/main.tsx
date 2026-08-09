/** アプリケーションのエントリーポイント */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App.tsx'
import { ErrorBoundary } from './components/ui/ErrorBoundary.tsx'
import './i18n'
import './index.css'
import * as lazyModules from './utils/lazyModules'
import { preloadAllLazyModules } from './utils/lazyPreload'

registerSW({
  immediate: true,
  onRegisterError(error) {
    console.error('Service Worker registration failed:', error)
  },
})

// メインエントリ実行直後から遅延UIチャンクの取得・評価を開始する。
// dynamic importの別チャンク構成は維持し、メインJSへは結合しない。
void preloadAllLazyModules(lazyModules.INITIAL_PRELOAD_MODULES)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
