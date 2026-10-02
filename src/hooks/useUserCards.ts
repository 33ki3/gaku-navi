/**
 * ユーザーが追加したサポートの一覧と保存を管理する
 *
 * ユーザーが手動登録したサポートを追加・編集・削除する
 * 次回アクセス時にも使えるよう、ブラウザの保存領域へ保存する
 * 組み込みサポートと一緒に一覧と計算へ渡す
 */
import { useCallback, useMemo, useState } from 'react'
import * as constant from '../constant'
import * as data from '../data'
import type { SupportCard } from '../types/card'
import { resolveAbilityValues } from '../utils/abilityValueResolver'
import { isSupportCard } from '../utils/supportCardValidation'
import { loadUserCards, saveUserCards } from '../utils/userCardStorage'
import { isUserSupportCardFormValue } from '../utils/userSupportCardValidation'
import { useStorageEvent } from './useStorageEvent'

/** useUserCards の返却型 */
interface UserCardsState {
  /** ユーザー定義サポートの配列 */
  userCards: SupportCard[]
  /** 組み込みサポートとユーザー定義サポートの結合配列 */
  allCards: SupportCard[]
  /** 結合したカードを名前から探す一覧 */
  allCardByName: Map<string, SupportCard>
  /** ユーザー定義カード名の一覧（画面表示の区別用） */
  userCardNames: Set<string>
  /** ユーザー定義サポートを追加する */
  addUserCard: (card: SupportCard) => boolean
  /** ユーザー定義サポートを更新する（名前で特定） */
  updateUserCard: (oldName: string, card: SupportCard) => boolean
  /** ユーザー定義サポートを削除する */
  deleteUserCard: (cardName: string) => boolean
  /** ユーザー定義サポートを一括置換する（取り消し処理で使用） */
  replaceUserCards: (cards: readonly SupportCard[]) => boolean
  /** 保存を行わず、共通保存処理が確定した値だけを画面へ反映する */
  applyUserCards: (cards: readonly SupportCard[]) => boolean
}

/**
 * ユーザー定義サポートを管理するフック
 *
 * @returns ユーザーカードの状態と追加・編集・削除の操作
 */
export function useUserCards(): UserCardsState {
  /**
   * 保存済みユーザーカードから有効なカード構造だけを読み込む
   *
   * @returns 検証済みのユーザーカード配列
   */
  function loadValidUserCards(): SupportCard[] {
    return loadUserCards().filter(isSupportCard)
  }

  // ユーザーカードの保存値を初期値にし、組み込みカードとは別に管理する
  const [userCards, setUserCards] = useState<SupportCard[]>(loadValidUserCards)

  // 別タブで変更されたユーザーカードを、保存処理を再発火させずに画面へ反映する
  useStorageEvent(constant.USER_SUPPORTS_STORAGE_KEY, () => setUserCards(loadValidUserCards()))

  /** 保存して画面の一覧を更新する */
  const persist = useCallback((cards: SupportCard[]): boolean => {
    // 保存成功後にだけ画面を更新し、保存失敗時に画面だけ変わる状態を防ぐ
    if (!saveUserCards(cards)) return false
    setUserCards(cards)
    return true
  }, [])

  /** ユーザー定義サポートを追加する */
  const addUserCard = useCallback(
    (card: SupportCard): boolean => {
      // 追加経路でもフォーム由来の厳密な構造を確認する
      if (!isUserSupportCardFormValue(card)) return false
      return persist([...userCards, card])
    },
    [persist, userCards],
  )

  /** ユーザー定義サポートを更新する */
  const updateUserCard = useCallback(
    (oldName: string, card: SupportCard): boolean => {
      // 更新対象名は既存配列の一致要素だけを置き換える
      if (!isUserSupportCardFormValue(card)) return false
      return persist(userCards.map((c) => (c.name === oldName ? card : c)))
    },
    [persist, userCards],
  )

  /** ユーザー定義サポートを削除する */
  const deleteUserCard = useCallback(
    (cardName: string): boolean => {
      // 指定名以外のカードを保持したまま保存する
      return persist(userCards.filter((c) => c.name !== cardName))
    },
    [userCards, persist],
  )

  /** 直前の変更を戻せるよう、ユーザー定義サポート配列を復元する */
  const replaceUserCards = useCallback(
    (cards: readonly SupportCard[]): boolean => {
      // 取り消しやインポートの復元では、入力配列をコピーして一括保存する
      return persist([...cards])
    },
    [persist],
  )
  const applyUserCards = useCallback((cards: readonly SupportCard[]): boolean => {
    if (!cards.every(isUserSupportCardFormValue)) return false
    setUserCards([...cards])
    return true
  }, [])

  /** 組み込みサポートとユーザー定義サポートを合わせた一覧（能力値解決済み） */
  const allCards = useMemo(() => {
    // ユーザーカードの能力値を通常カードと同じ計算形式へそろえてから結合する
    const inflated = userCards.map((card) => ({
      ...card,
      abilities: card.abilities.map((ability, index) => ({
        ...ability,
        values: resolveAbilityValues(card, ability, index),
      })),
    }))
    return [...data.AllCards, ...inflated]
  }, [userCards])

  /** 組み込みカードとユーザー定義カードを名前から探す表 */
  const allCardByName = useMemo(() => new Map(allCards.map((c) => [c.name, c])), [allCards])

  /** ユーザー定義カード名の一覧 */
  const userCardNames = useMemo(() => new Set(userCards.map((c) => c.name)), [userCards])

  return {
    userCards,
    allCards,
    allCardByName,
    userCardNames,
    addUserCard,
    updateUserCard,
    deleteUserCard,
    replaceUserCards,
    applyUserCards,
  }
}
