/** アプリケーションのエントリーポイント */
import { registerSW } from 'virtual:pwa-register'

/** ブラウザで注入されたJSON asset URLを取得する */
function getAssetUrl(metaName: string, fallbackName: string): string {
  const configuredUrl = document.querySelector<HTMLMetaElement>('meta[name="' + metaName + '"]')?.content
  return configuredUrl && !configuredUrl.startsWith('__') ? configuredUrl : import.meta.env.BASE_URL + fallbackName
}

/** 初期JSON assetを取得する */
async function fetchJsonAsset(metaName: string, fallbackName: string): Promise<unknown> {
  // HTMLにはassetのURLだけを埋め込み、JSON本体はここで取得する。defaultはブラウザ標準のHTTPキャッシュを使う指定
  const response = await fetch(getAssetUrl(metaName, fallbackName), { cache: 'default' })
  if (!response.ok) {
    throw new Error(fallbackName + ' request failed: ' + response.status)
  }
  return response.json()
}

registerSW({
  immediate: true,
  onRegisterError(error) {
    console.error('Service Worker registration failed:', error)
  },
})

// Service Workerの準備を待たずに、初期JSON取得とアプリ描画を開始する
void Promise.all([
  import('./appBootstrap'),
  fetchJsonAsset('card-asset-url', 'assets/cards.json'),
  fetchJsonAsset('locale-asset-url', 'assets/ja.json'),
])
  .then(async ([{ startApp }, rawCards, rawLocale]) => {
    await startApp(rawCards, rawLocale)
  })
  .catch((error: unknown) => {
    console.error('Application entry failed:', error)
    const rootElement = document.getElementById('root')
    if (rootElement) {
      rootElement.textContent = '初期データを読み込めませんでした。ページを再読み込みしてください。'
    }
  })
