/**
 * カード別カウント設定フック
 *
 * 各カードの自動カウント（自身イベント効果の自動加算）と
 * Pアイテム発動回数のオーバーライドを管理する。
 * 未設定のアクションは自動計算値を使い、
 * 設定済みのアクションはカード別の値を優先する。
 * 変更は localStorage に自動保存される。
 */
import { useState, useCallback, useEffect } from 'react'
import type { ActionIdType } from '../types/enums'
import * as constant from '../constant'

/** カード1枚分のオーバーライドデータ */
export interface CardOverrideData {
  /** 自動カウント（selfBonus）のオーバーライド */
  selfTrigger?: Partial<Record<ActionIdType, number>>
  /** Pアイテム発動回数のオーバーライド */
  pItemCount?: Partial<Record<ActionIdType, number>>
}

/** カード名 → オーバーライドデータ */
export type CardCountOverrides = Record<string, CardOverrideData>

/** localStorage からカード別カウント設定を読み込む */
function loadOverrides(): CardCountOverrides {
  try {
    const raw = localStorage.getItem(constant.CARD_COUNT_OVERRIDES_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as CardCountOverrides
  } catch {
    return {}
  }
}

/** オーバーライドのサブマップが空かどうか */
function isEmptyPartial(obj: Partial<Record<string, number>> | undefined): boolean {
  if (!obj) return true
  return Object.keys(obj).length === 0
}

/** localStorage にカード別カウント設定を保存する */
function saveOverrides(overrides: CardCountOverrides): void {
  const cleaned: CardCountOverrides = {}
  for (const [cardName, data] of Object.entries(overrides)) {
    const entry: CardOverrideData = {}
    if (!isEmptyPartial(data.selfTrigger)) entry.selfTrigger = data.selfTrigger
    if (!isEmptyPartial(data.pItemCount)) entry.pItemCount = data.pItemCount
    if (Object.keys(entry).length > 0) {
      cleaned[cardName] = entry
    }
  }
  if (Object.keys(cleaned).length > 0) {
    localStorage.setItem(constant.CARD_COUNT_OVERRIDES_KEY, JSON.stringify(cleaned))
  } else {
    localStorage.removeItem(constant.CARD_COUNT_OVERRIDES_KEY)
  }
}

/** useCardCountOverrides の返却型 */
interface CardCountOverridesState {
  /** 全カードのカウントオーバーライド */
  cardCountOverrides: CardCountOverrides
  /** 自動カウント（selfBonus）のオーバーライドを設定する */
  setSelfTrigger: (cardName: string, actionId: ActionIdType, count: number) => void
  /** Pアイテム発動回数のオーバーライドを設定する */
  setPItemCount: (cardName: string, actionId: ActionIdType, count: number) => void
  /** 特定カードの全オーバーライドをリセットする */
  clearCardOverrides: (cardName: string) => void
}

/**
 * カード別カウント設定を管理するフック
 *
 * ページを読み込んだとき localStorage から復元し、
 * 変更があるたびに自動で保存する。
 */
export function useCardCountOverrides(): CardCountOverridesState {
  const [cardCountOverrides, setCardCountOverrides] = useState<CardCountOverrides>(loadOverrides)

  // 変更があったら localStorage に保存する（デバウンス付き）
  useEffect(() => {
    const timer = setTimeout(() => saveOverrides(cardCountOverrides), constant.FILTER_SAVE_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [cardCountOverrides])

  /** 自動カウント（selfBonus）のオーバーライドを設定する */
  const setSelfTrigger = useCallback((cardName: string, actionId: ActionIdType, count: number) => {
    setCardCountOverrides((prev) => ({
      ...prev,
      [cardName]: {
        ...prev[cardName],
        selfTrigger: { ...prev[cardName]?.selfTrigger, [actionId]: count },
      },
    }))
  }, [])

  /** Pアイテム発動回数のオーバーライドを設定する */
  const setPItemCount = useCallback((cardName: string, actionId: ActionIdType, count: number) => {
    setCardCountOverrides((prev) => ({
      ...prev,
      [cardName]: {
        ...prev[cardName],
        pItemCount: { ...prev[cardName]?.pItemCount, [actionId]: count },
      },
    }))
  }, [])

  /** 特定カードの全オーバーライドをリセットする */
  const clearCardOverrides = useCallback((cardName: string) => {
    setCardCountOverrides((prev) => {
      const next = { ...prev }
      delete next[cardName]
      return next
    })
  }, [])

  return { cardCountOverrides, setSelfTrigger, setPItemCount, clearCardOverrides }
}
