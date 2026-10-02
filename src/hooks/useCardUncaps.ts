/**
 * サポート凸数管理フック
 *
 * 各サポートの「凸数（上限解放レベル）」を管理する
 * 0凸〜4凸まであり、凸数に応じてアビリティの効果量が変わる
 * 変更はブラウザの保存領域へ自動保存される
 */
import { useCallback, useEffect, useState } from 'react'
import * as constant from '../constant'
import type { UncapType } from '../types/enums'
import { isUncapRecord } from '../utils/storageCollectionValidation'
import { loadCardUncaps, saveCardUncaps } from '../utils/uncapStorage'
import { useStorageEvent } from './useStorageEvent'

/** useCardUncaps の返却型 */
interface CardUncapsState {
  /** サポート名→凸数のマッピング（例: { "サポート名": 4 }） */
  cardUncaps: Record<string, UncapType>
  /** サポートの凸数を取得する。未設定なら4凸を返す */
  getCardUncap: (cardName: string) => UncapType
  /** 特定のサポートの凸数を変更する */
  setCardUncap: (cardName: string, uncap: UncapType) => void
  /** 複数サポートの凸数をまとめて変更する */
  setCardUncaps: (uncaps: Record<string, UncapType>) => boolean
  /** 保存を行わず、確定済みの凸数だけを画面へ反映する */
  applyCardUncaps: (uncaps: Record<string, UncapType>) => boolean
}

/**
 * サポートの凸数を管理するフック
 *
 * ページを読み込んだときブラウザの保存領域から復元し、
 * 変更があるたびに自動で保存する
 *
 * @returns 凸数データと、取得・更新のための関数
 */
export function useCardUncaps(): CardUncapsState {
  // ブラウザの保存領域から保存済みの凸数データを読み込む
  const [cardUncaps, setCardUncapsState] = useState<Record<string, UncapType>>(() => loadCardUncaps())

  // 凸数が変わるたびにブラウザの保存領域に保存する（連続操作をまとめる待機付き）
  useEffect(() => {
    // 連続クリックでは保存をまとめ、最後に選んだ凸数だけを保存する
    const timer = setTimeout(() => {
      saveCardUncaps(cardUncaps)
    }, constant.FILTER_SAVE_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [cardUncaps])

  // 別タブで変更された凸数を、リロードせずに現在の画面へ反映する
  useStorageEvent(constant.UNCAP_STORAGE_KEY, () => setCardUncapsState(loadCardUncaps()))

  // 特定サポートの凸数を更新する
  const setCardUncap = useCallback((cardName: string, uncap: UncapType) => {
    // カード名が空、または凸数の選択肢外なら画面へ入れない
    if (cardName.trim() === '' || !isUncapRecord({ [cardName]: uncap })) return
    setCardUncapsState((prev) => ({ ...prev, [cardName]: uncap }))
  }, [])

  /** 複数サポートの凸数を置き換える */
  const setCardUncaps = useCallback((uncaps: Record<string, UncapType>): boolean => {
    // 一括置換は全カード名と凸数を検証し、受け取った内容へ一覧全体を置き換える
    if (!isUncapRecord(uncaps)) return false
    const nextUncaps = { ...uncaps }
    // 保存成功を確認してから画面を更新し、保存内容と表示の不一致を作らない
    if (!saveCardUncaps(nextUncaps)) return false
    setCardUncapsState(nextUncaps)
    return true
  }, [])

  // 保存を行わず、インポートやcommandで確定した凸数だけを画面へ反映する
  const applyCardUncaps = useCallback((uncaps: Record<string, UncapType>): boolean => {
    if (!isUncapRecord(uncaps)) return false
    setCardUncapsState({ ...uncaps })
    return true
  }, [])

  // サポートの凸数を取得し、未設定なら既定値を返す
  const getCardUncap = useCallback(
    (cardName: string): UncapType => {
      return cardUncaps[cardName] ?? constant.DEFAULT_UNCAP
    },
    [cardUncaps],
  )

  return { cardUncaps, getCardUncap, setCardUncap, setCardUncaps, applyCardUncaps }
}
