/**
 * サポート別回数設定フック
 *
 * 各サポートの自動回数（自身イベント効果の自動加算）と
 * Pアイテム発動回数の回数調整を管理する
 * 未設定のアクションは自動計算値を使い、設定済みのアクションは
 * サポート別の値を優先する
 * 変更はブラウザの保存領域へ自動保存される
 */
import { useCallback, useEffect, useState } from 'react'
import * as constant from '../constant'
import type { CardCountCustom, CardCustomData } from '../types/card'
import type { ActionIdType } from '../types/enums'
import { isActionId } from '../utils/domainValueValidation'
import { sanitizeCardCountCustom } from '../utils/storageCollectionValidation'
import { useStorageEvent } from './useStorageEvent'

/**
 * ブラウザの保存領域からサポート別回数設定を読み込む
 *
 * @returns 検証済みのサポート別回数調整
 */
function loadCardCountCustom(): CardCountCustom {
  try {
    // 保存値がない場合は「自動計算を使う」空の設定として開始する
    const raw = localStorage.getItem(constant.CARD_COUNT_CUSTOM_KEY)
    if (!raw) return {}
    return sanitizeCardCountCustom(JSON.parse(raw))
  } catch {
    return {}
  }
}

/**
 * サポート別回数設定を、カードごとの自動発動とPアイテムの回数まで含めて複製する
 *
 * @param custom - 複製するサポート別回数調整
 * @returns 入れ子の値まで複製した回数調整
 */
function cloneCardCountCustom(custom: CardCountCustom): CardCountCustom {
  const cloned: CardCountCustom = {}
  for (const [cardName, cardCustom] of Object.entries(custom)) {
    // 後続の更新で元の入力を変更しないよう、カード単位の回数も複製する
    const entry: CardCustomData = {}
    if (cardCustom.selfTrigger) entry.selfTrigger = { ...cardCustom.selfTrigger }
    if (cardCustom.pItemCount) entry.pItemCount = { ...cardCustom.pItemCount }
    cloned[cardName] = entry
  }
  return cloned
}

/**
 * カード内の回数調整が空か判定する
 *
 * @param obj - 判定する回数調整
 * @returns 未設定または空のオブジェクトならtrue
 */
function isEmptyPartial(obj: Partial<Record<string, number>> | undefined): boolean {
  // 空の設定を保存しないことで、未設定と0回指定を区別したまま保存量を抑える
  if (!obj) return true
  return Object.keys(obj).length === 0
}

/**
 * ブラウザの保存領域にサポート別カウント設定を保存する
 *
 * @param custom - 保存するサポート別回数調整
 * @returns 保存できた場合はtrue
 */
function saveCardCountCustom(custom: CardCountCustom): boolean {
  try {
    // 保存直前にも共通の絞り込みを通す
    // 直接呼び出された場合も不正なアクションを残さない
    const safeCustom = sanitizeCardCountCustom(custom)
    const cleaned: CardCountCustom = {}
    for (const [cardName, data] of Object.entries(safeCustom)) {
      // 自動発動とPアイテムの両方が空なら、カード自体も保存対象から外す
      const entry: CardCustomData = {}
      if (!isEmptyPartial(data.selfTrigger)) entry.selfTrigger = data.selfTrigger
      if (!isEmptyPartial(data.pItemCount)) entry.pItemCount = data.pItemCount
      if (Object.keys(entry).length > 0) {
        cleaned[cardName] = entry
      }
    }
    if (Object.keys(cleaned).length > 0) {
      // 有効な設定だけをJSON化して保存する
      localStorage.setItem(constant.CARD_COUNT_CUSTOM_KEY, JSON.stringify(cleaned))
    } else {
      // 全項目が未設定になった場合はキーごと削除し、既定の自動計算へ戻す
      localStorage.removeItem(constant.CARD_COUNT_CUSTOM_KEY)
    }
    return true
  } catch {
    return false
  }
}

/** useCardCountCustom の返却型 */
export interface CardCountCustomState {
  /** 全サポートの回数調整 */
  cardCountCustom: CardCountCustom
  /** 自動発動アビリティの回数調整を設定する */
  setSelfTrigger: (cardName: string, actionId: ActionIdType, count: number) => void
  /** 自動カウントの回数調整を個別に削除する */
  removeSelfTrigger: (cardName: string, actionId: ActionIdType) => void
  /** Pアイテム発動回数の回数調整を設定する */
  setPItemCount: (cardName: string, actionId: ActionIdType, count: number) => void
  /** Pアイテム発動回数の回数調整を個別に削除する */
  removePItemCount: (cardName: string, actionId: ActionIdType) => void
  /** 特定サポートの全回数調整をリセットする */
  clearCardCustom: (cardName: string) => void
  /** 全サポートの回数調整を置き換える */
  setCardCountCustom: (custom: CardCountCustom) => boolean
  /** 保存を行わず、確定済みの回数調整だけを画面へ反映する */
  applyCardCountCustom: (custom: CardCountCustom) => void
}

/**
 * サポート別回数設定を管理するフック
 *
 * ページを読み込んだときブラウザの保存領域から復元し、
 * 変更があるたびに自動で保存する
 *
 * @returns サポート別回数調整と更新操作
 */
export function useCardCountCustom(): CardCountCustomState {
  const [cardCountCustom, setCardCountCustomState] = useState<CardCountCustom>(loadCardCountCustom)

  // 変更があったらブラウザの保存領域に保存する（連続操作をまとめる待機付き）
  useEffect(() => {
    // 人間の連続入力では毎回保存せず、最後の状態だけを待ってから保存する
    const timer = setTimeout(() => saveCardCountCustom(cardCountCustom), constant.FILTER_SAVE_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [cardCountCustom])

  // 別タブで変更された回数調整を、リロードせずに現在の画面へ反映する
  useStorageEvent(constant.CARD_COUNT_CUSTOM_KEY, () => setCardCountCustomState(loadCardCountCustom()))

  /**
   * 自動発動アビリティの回数調整を設定する
   *
   * @param cardName - 対象サポート名
   * @param actionId - 対象アクションID
   * @param count - 設定する回数
   * @returns なし
   */
  const setSelfTrigger = useCallback((cardName: string, actionId: ActionIdType, count: number) => {
    // 個別入力も外部から直接呼ばれる可能性がある
    // 画面で扱える値だけを保存対象にする
    if (!isActionId(actionId) || !Number.isSafeInteger(count) || count < 0 || count > constant.ACTION_COUNT_MAX) return
    setCardCountCustomState((prev) => ({
      // 指定カード・指定アクションだけを更新し、他カードと他アクションは維持する
      ...prev,
      [cardName]: {
        ...prev[cardName],
        selfTrigger: { ...prev[cardName]?.selfTrigger, [actionId]: count },
      },
    }))
  }, [])

  /**
   * 自動カウントの回数調整を個別に削除する
   *
   * @param cardName - 対象サポート名
   * @param actionId - 対象アクションID
   * @returns なし
   */
  const removeSelfTrigger = useCallback((cardName: string, actionId: ActionIdType) => {
    setCardCountCustomState((prev) => {
      // 対象カードまたはアクションがなければ、不要な画面更新を起こさず元の値を返す
      const card = prev[cardName]
      if (!card?.selfTrigger || !(actionId in card.selfTrigger)) return prev
      const restTrigger = { ...card.selfTrigger }
      // 対象ActionIdだけを削除し、残りの個別調整は保持する
      delete restTrigger[actionId]
      const restCard = { ...card }
      delete restCard.selfTrigger
      const updated: CardCustomData = isEmptyPartial(restTrigger) ? restCard : { ...restCard, selfTrigger: restTrigger }
      if (Object.keys(updated).length === 0) {
        // 自動発動とPアイテムの調整がなくなったカードは、カード名の項目も削除する
        const remaining = { ...prev }
        delete remaining[cardName]
        return remaining
      }
      return { ...prev, [cardName]: updated }
    })
  }, [])

  /**
   * Pアイテム発動回数の回数調整を設定する
   *
   * @param cardName - 対象サポート名
   * @param actionId - 対象アクションID
   * @param count - 設定する回数
   * @returns なし
   */
  const setPItemCount = useCallback((cardName: string, actionId: ActionIdType, count: number) => {
    // Pアイテム回数も自動計算へ渡る整数範囲を先に確認する
    if (!isActionId(actionId) || !Number.isSafeInteger(count) || count < 0 || count > constant.ACTION_COUNT_MAX) return
    setCardCountCustomState((prev) => ({
      // Pアイテムの指定だけを差し替え、自動発動アビリティの調整は残す
      ...prev,
      [cardName]: {
        ...prev[cardName],
        pItemCount: { ...prev[cardName]?.pItemCount, [actionId]: count },
      },
    }))
  }, [])

  /**
   * Pアイテム発動回数の回数調整を個別に削除する
   *
   * @param cardName - 対象サポート名
   * @param actionId - 対象アクションID
   * @returns なし
   */
  const removePItemCount = useCallback((cardName: string, actionId: ActionIdType) => {
    setCardCountCustomState((prev) => {
      // 指定されたPアイテム回数だけを削除する
      const card = prev[cardName]
      if (!card?.pItemCount || !(actionId in card.pItemCount)) return prev
      const restPItem = { ...card.pItemCount }
      delete restPItem[actionId]
      const restCard = { ...card }
      delete restCard.pItemCount
      const updated: CardCustomData = isEmptyPartial(restPItem) ? restCard : { ...restCard, pItemCount: restPItem }
      if (Object.keys(updated).length === 0) {
        // カードに残る調整がなければカードキーも整理する
        const remaining = { ...prev }
        delete remaining[cardName]
        return remaining
      }
      return { ...prev, [cardName]: updated }
    })
  }, [])

  /**
   * 特定サポートの全回数調整をリセットする
   *
   * @param cardName - 対象サポート名
   * @returns なし
   */
  const clearCardCustom = useCallback((cardName: string) => {
    setCardCountCustomState((prev) => {
      // カード単位の全調整を削除し、以後は自動計算値を利用する
      const next = { ...prev }
      delete next[cardName]
      return next
    })
  }, [])

  /**
   * 全サポートの回数調整を置き換える
   *
   * @param custom - 置き換えるサポート別回数調整
   * @returns 保存に成功した場合はtrue
   */
  const setCardCountCustom = useCallback((custom: CardCountCustom): boolean => {
    // 保存値全体を複製・検証し、比較用の一時変更とは分ける
    const nextCustom = cloneCardCountCustom(sanitizeCardCountCustom(custom))
    // 一括更新は連続入力用の待機を置かず、保存成功を確認してから状態へ反映する
    if (!saveCardCountCustom(nextCustom)) return false
    setCardCountCustomState(nextCustom)
    return true
  }, [])

  /**
   * 保存を行わず、確定済みの回数調整だけを画面へ反映する
   *
   * @param custom - 画面へ反映するサポート別回数調整
   * @returns なし
   */
  const applyCardCountCustom = useCallback((custom: CardCountCustom) => {
    setCardCountCustomState(cloneCardCountCustom(sanitizeCardCountCustom(custom)))
  }, [])

  return {
    cardCountCustom,
    setSelfTrigger,
    removeSelfTrigger,
    setPItemCount,
    removePItemCount,
    clearCardCustom,
    setCardCountCustom,
    applyCardCountCustom,
  }
}
