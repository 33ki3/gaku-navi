/** Vite 環境変数の型定義。.env ファイルで設定する値を定義する。 */
interface ImportMetaEnv {
  /** Google Analytics トラッキングID */
  readonly VITE_GA_ID: string
  /** マシュマロ（匿名フィードバック）の URL */
  readonly VITE_FEEDBACK_URL: string
  /** GitHub リポジトリの URL */
  readonly VITE_GITHUB_URL: string
  /** アプリのベースパス */
  readonly VITE_BASE_PATH: string
  /** サイトの公開URL（末尾スラッシュ付き、OGPメタタグ用） */
  readonly VITE_SITE_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

/** GA4 の dataLayer グローバル変数 */
interface Window {
  dataLayer: unknown[]
}
