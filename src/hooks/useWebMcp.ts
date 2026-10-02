/**
 * ページ上のカード操作を登録し、実行時には最新のカード・計算状態を使う
 *
 * WebMCP対応ブラウザだけでページ上の操作を登録する
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react'

import i18n from '../i18n'
import type { WebMcpRuntime } from '../webmcp/types'

/**
 * 対応ブラウザへカード操作用のページツールを登録する
 *
 * 登録後に画面の設定が変わっても登録し直さない
 * ツール実行時だけ最新の状態を参照する
 *
 * @param runtime - 現在のカード・計算状態を取得する処理
 * @returns なし
 */
export function useWebMcp(runtime: WebMcpRuntime): void {
  // ツールは再登録せず、実行時に最新のカード・設定を読む
  const runtimeRef = useRef(runtime)

  // 開発中にコードが更新されたときだけ世代を進め、通常の設定変更では再登録しない
  const [registrationVersion, setRegistrationVersion] = useState(0)

  useLayoutEffect(() => {
    // ツール定義へ画面の値を閉じ込めず、実行時に最新の状態を参照する
    runtimeRef.current = runtime
  }, [runtime])

  useEffect(() => {
    // 開発中のコード更新だけを監視し、ツール定義が変わったときに再登録する
    const hot = import.meta.hot
    if (!hot) return

    // コード更新後に世代を進め、下の処理で古い登録を解除してから再登録する
    const handleAfterUpdate = () => setRegistrationVersion((version) => version + 1)
    hot.on('vite:afterUpdate', handleAfterUpdate)

    // 監視を終了するときは、古い監視処理が世代を進めないよう解除する
    return () => {
      // 解除APIがない開発用環境でも、コンポーネント破棄をエラーにしない
      if (typeof hot.off === 'function') hot.off('vite:afterUpdate', handleAfterUpdate)
    }
  }, [])

  useEffect(() => {
    // 登録ごとに中断情報を作る
    // コード更新や画面破棄時にブラウザ側の登録も解除できるようにする
    const controller = new AbortController()

    // WebMCP非対応ブラウザでは追加実装を読み込まず、通常利用者の初期表示を軽くする
    if (typeof document !== 'undefined' && document.modelContext) {
      void import('../webmcp')
        .then(({ registerWebMcpTools }) => {
          // 古い読み込みが画面破棄やコード更新の後に完了しても、ツールを登録しない
          if (!controller.signal.aborted) void registerWebMcpTools(() => runtimeRef.current, controller.signal)
        })
        .catch((error: unknown) => {
          if (!controller.signal.aborted) console.warn(i18n.t('webmcp.messages.load_failed'), error)
        })
    }

    // 新しい定義を登録する前に、前のツールが残らないよう登録を無効化する
    return () => controller.abort()
  }, [registrationVersion])
}
