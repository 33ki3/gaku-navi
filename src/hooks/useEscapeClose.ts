/**
 * Escapeキーで開いているUIを閉じる共通フック
 */
import { useEffect } from 'react'

/**
 * 有効時のみEscapeキーを監視し、閉じる処理を呼び出す
 *
 * @param enabled - Escapeキーによる閉じる操作を有効にするか
 * @param onClose - Escapeキーが押されたときの処理
 * @returns 戻り値なし
 */
export function useEscapeClose(enabled: boolean, onClose: () => void): void {
  useEffect(() => {
    if (!enabled) return
    // 有効な画面がある間だけdocumentへ監視を登録し、閉じたら必ず解除する
    const closeOnEscape = (event: KeyboardEvent) => {
      // Escape以外のキー入力は各画面の通常操作へ渡す
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [enabled, onClose])
}
