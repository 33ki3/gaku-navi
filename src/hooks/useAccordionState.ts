/**
 * アコーディオン開閉状態フック
 *
 * 「開く・閉じる」を切り替えられるセクション（アコーディオン）が
 * 複数あるとき、それぞれの開閉状態をまとめて管理するためのフック。
 */
import { useCallback, useState } from 'react'

/**
 * 複数セクションの開閉状態を管理するカスタムフック
 *
 * @typeParam K - セクションを識別するキーの文字列型（例: 'scenario' | 'schedule'）
 * @param initialState - 各セクションの初期状態（true = 開いている）
 * @returns state（現在の開閉状態）、toggle（切り替え関数）、reset（初期状態へ戻す関数）
 *
 * @example
 * ```ts
 * const { state, toggle } = useAccordionState({ scenario: true, schedule: false })
 * // state.scenario → true
 * // toggle('schedule') で schedule を開く
 * ```
 */
export function useAccordionState<K extends string>(initialState: Record<K, boolean>) {
  // 各セクションの開閉状態を保持する
  const [state, setState] = useState(() => ({ ...initialState }))

  /**
   * 指定したセクションの開閉を反転させる
   * @param key - 切り替えるセクションのキー
   */
  const toggle = useCallback((key: K) => {
    setState((prev) => ({ ...prev, [key]: !prev[key] }))
  }, [])

  /** 初期状態を再適用し、モーダルを開き直したときの表示を揃える */
  const reset = useCallback(() => {
    setState({ ...initialState })
  }, [initialState])

  return { state, toggle, reset } as const
}
