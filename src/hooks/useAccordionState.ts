/**
 * アコーディオン開閉状態フック
 *
 * 「開く・閉じる」を切り替えられるセクション（アコーディオン）が
 * 複数あるとき、それぞれの開閉状態をまとめて管理するためのフック。
 */
import { useState, useCallback } from 'react'

/**
 * 複数セクションの開閉状態を管理するカスタムフック
 *
 * @typeParam K - セクションを識別するキーの文字列型（例: 'scenario' | 'schedule'）
 * @param initialState - 各セクションの初期状態（true = 開いている）
 * @returns state（現在の開閉状態）と toggle（切り替え関数）
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
  const [state, setState] = useState(initialState)

  /**
   * 指定したセクションの開閉を反転させる
   * @param key - 切り替えるセクションのキー
   */
  const toggle = useCallback((key: K) => {
    setState((prev) => ({ ...prev, [key]: !prev[key] }))
  }, [])

  return { state, toggle } as const
}
