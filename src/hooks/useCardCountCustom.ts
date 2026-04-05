/**
 * サポート別カウント設定フック
 *
 * 各サポートの自動カウント（自身イベント効果の自動加算）と
 * Pアイテム発動回数のカウント調整を管理する。
 * 未設定のアクションは自動計算値を使い、
 * 設定済みのアクションはサポート別の値を優先する。
 * 変更は localStorage に自動保存される。
 */
import { useState, useCallback, useEffect } from 'react'
import type { ActionIdType } from '../types/enums'
import * as constant from '../constant'

/** サポート1枚分のカウント調整データ */
export interface CardCustomData {
  /** 自動カウント（selfBonus）のカウント調整 */
  selfTrigger?: Partial<Record<ActionIdType, number>>
  /** Pアイテム発動回数のカウント調整 */
  pItemCount?: Partial<Record<ActionIdType, number>>
}

/** サポート名 → カウント調整データ */
export type CardCountCustom = Record<string, CardCustomData>

/** localStorage からサポート別カウント設定を読み込む */
export function loadCardCountCustom(): CardCountCustom {
  try {
    const raw = localStorage.getItem(constant.CARD_COUNT_CUSTOM_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as CardCountCustom
  } catch {
    return {}
  }
}

/** カウント調整のサブマップが空かどうか */
function isEmptyPartial(obj: Partial<Record<string, number>> | undefined): boolean {
  if (!obj) return true
  return Object.keys(obj).length === 0
}

/** localStorage にサポート別カウント設定を保存する */
function saveCustom(custom: CardCountCustom): void {
  const cleaned: CardCountCustom = {}
  for (const [cardName, data] of Object.entries(custom)) {
    const entry: CardCustomData = {}
    if (!isEmptyPartial(data.selfTrigger)) entry.selfTrigger = data.selfTrigger
    if (!isEmptyPartial(data.pItemCount)) entry.pItemCount = data.pItemCount
    if (Object.keys(entry).length > 0) {
      cleaned[cardName] = entry
    }
  }
  if (Object.keys(cleaned).length > 0) {
    localStorage.setItem(constant.CARD_COUNT_CUSTOM_KEY, JSON.stringify(cleaned))
  } else {
    localStorage.removeItem(constant.CARD_COUNT_CUSTOM_KEY)
  }
}

/** useCardCountCustom の返却型 */
export interface CardCountCustomState {
  /** 全サポートのカウント調整 */
  cardCountCustom: CardCountCustom
  /** 自動カウント（selfBonus）のカウント調整を設定する */
  setSelfTrigger: (cardName: string, actionId: ActionIdType, count: number) => void
  /** 自動カウントのカウント調整を個別に削除する */
  removeSelfTrigger: (cardName: string, actionId: ActionIdType) => void
  /** Pアイテム発動回数のカウント調整を設定する */
  setPItemCount: (cardName: string, actionId: ActionIdType, count: number) => void
  /** Pアイテム発動回数のカウント調整を個別に削除する */
  removePItemCount: (cardName: string, actionId: ActionIdType) => void
  /** 特定サポートの全カウント調整をリセットする */
  clearCardCustom: (cardName: string) => void
}

/**
 * サポート別カウント設定を管理するフック
 *
 * ページを読み込んだとき localStorage から復元し、
 * 変更があるたびに自動で保存する。
 */
export function useCardCountCustom(): CardCountCustomState {
  const [cardCountCustom, setCardCountCustom] = useState<CardCountCustom>(loadCardCountCustom)

  // 変更があったら localStorage に保存する（デバウンス付き）
  useEffect(() => {
    const timer = setTimeout(() => saveCustom(cardCountCustom), constant.FILTER_SAVE_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [cardCountCustom])

  /** 自動カウント（selfBonus）のカウント調整を設定する */
  const setSelfTrigger = useCallback((cardName: string, actionId: ActionIdType, count: number) => {
    setCardCountCustom((prev) => ({
      ...prev,
      [cardName]: {
        ...prev[cardName],
        selfTrigger: { ...prev[cardName]?.selfTrigger, [actionId]: count },
      },
    }))
  }, [])

  /** 自動カウントのカウント調整を個別に削除する */
  const removeSelfTrigger = useCallback((cardName: string, actionId: ActionIdType) => {
    setCardCountCustom((prev) => {
      const card = prev[cardName]
      if (!card?.selfTrigger || !(actionId in card.selfTrigger)) return prev
      const restTrigger = { ...card.selfTrigger }
      delete restTrigger[actionId]
      const restCard = { ...card }
      delete restCard.selfTrigger
      const updated: CardCustomData = isEmptyPartial(restTrigger) ? restCard : { ...restCard, selfTrigger: restTrigger }
      if (Object.keys(updated).length === 0) {
        const remaining = { ...prev }
        delete remaining[cardName]
        return remaining
      }
      return { ...prev, [cardName]: updated }
    })
  }, [])

  /** Pアイテム発動回数のカウント調整を設定する */
  const setPItemCount = useCallback((cardName: string, actionId: ActionIdType, count: number) => {
    setCardCountCustom((prev) => ({
      ...prev,
      [cardName]: {
        ...prev[cardName],
        pItemCount: { ...prev[cardName]?.pItemCount, [actionId]: count },
      },
    }))
  }, [])

  /** Pアイテム発動回数のカウント調整を個別に削除する */
  const removePItemCount = useCallback((cardName: string, actionId: ActionIdType) => {
    setCardCountCustom((prev) => {
      const card = prev[cardName]
      if (!card?.pItemCount || !(actionId in card.pItemCount)) return prev
      const restPItem = { ...card.pItemCount }
      delete restPItem[actionId]
      const restCard = { ...card }
      delete restCard.pItemCount
      const updated: CardCustomData = isEmptyPartial(restPItem) ? restCard : { ...restCard, pItemCount: restPItem }
      if (Object.keys(updated).length === 0) {
        const remaining = { ...prev }
        delete remaining[cardName]
        return remaining
      }
      return { ...prev, [cardName]: updated }
    })
  }, [])

  /** 特定サポートの全カウント調整をリセットする */
  const clearCardCustom = useCallback((cardName: string) => {
    setCardCountCustom((prev) => {
      const next = { ...prev }
      delete next[cardName]
      return next
    })
  }, [])

  return { cardCountCustom, setSelfTrigger, removeSelfTrigger, setPItemCount, removePItemCount, clearCardCustom }
}
