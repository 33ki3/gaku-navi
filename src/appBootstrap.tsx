import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { ErrorBoundary } from './components/ui/ErrorBoundary'
import { initializeCards } from './data/card/cards'
import { initializeI18n } from './i18n'
import './index.css'

/** 翻訳JSONとして扱えるオブジェクトか判定する */
function isTranslationResource(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

/** カード・翻訳を初期化して画面を描画する */
export async function startApp(rawCards: unknown, rawLocale: unknown): Promise<void> {
  if (!isTranslationResource(rawLocale)) {
    throw new Error('Locale data must be an object')
  }

  const rootElement = document.getElementById('root')
  if (!rootElement) throw new Error('Root element was not found')

  initializeCards(rawCards)
  await initializeI18n(rawLocale)

  const root = createRoot(rootElement)
  root.render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>,
  )
}
