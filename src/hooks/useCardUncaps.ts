/**
 * サポート凸数管理フック
 *
 * 各サポートの「凸数（上限解放レベル）」を管理する。
 * 0凸〜4凸まであり、凸数に応じてアビリティの効果量が変わる。
 * 変更は localStorage に自動保存される。
 */
import { useState, useCallback, useEffect } from 'react'
import type { UncapType } from '../types/enums'
import { loadCardUncaps, saveCardUncaps } from '../utils/uncapStorage'
import * as constant from '../constant'

/** useCardUncaps の返却型 */
interface CardUncapsState {
  /** サポート名→凸数のマッピング（例: { "サポート名": 4 }） */
  cardUncaps: Record<string, UncapType>
  /** サポートの凸数を取得する。未設定なら4凸を返す */
  getCardUncap: (cardName: string) => UncapType
  /** 特定のサポートの凸数を変更する */
  setCardUncap: (cardName: string, uncap: UncapType) => void
}

/**
 * サポートの凸数を管理するフック
 *
 * ページを読み込んだとき localStorage から復元し、
 * 変更があるたびに自動で保存する。
 *
 * @returns 凸数データと、取得・更新のための関数
 */
export function useCardUncaps(): CardUncapsState {
  // localStorage から保存済みの凸数データを読み込む
  const [cardUncaps, setCardUncaps] = useState<Record<string, UncapType>>(() => loadCardUncaps())

  // 凸数が変わるたびに localStorage に保存する（デバウンス付き）
  useEffect(() => {
    const timer = setTimeout(() => {
      saveCardUncaps(cardUncaps)
    }, constant.FILTER_SAVE_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [cardUncaps])

  /**
   * 特定サポートの凸数を更新する
   * @param cardName - サポートの名前
   * @param uncap - 新しい凸数（0〜4）
   */
  const setCardUncap = useCallback((cardName: string, uncap: UncapType) => {
    setCardUncaps((prev) => ({ ...prev, [cardName]: uncap }))
  }, [])

  /**
   * サポートの凸数を取得する。設定されていなければデフォルト（4凸）を返す
   * @param cardName - サポートの名前
   * @returns 現在の凸数
   */
  const getCardUncap = useCallback(
    (cardName: string): UncapType => {
      return cardUncaps[cardName] ?? constant.DEFAULT_UNCAP
    },
    [cardUncaps],
  )

  return { cardUncaps, getCardUncap, setCardUncap }
}
