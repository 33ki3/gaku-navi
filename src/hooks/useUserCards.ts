/**
 * ユーザー定義サポート管理フック。
 *
 * ユーザーが手動登録したサポートの CRUD 操作と localStorage 永続化を行う。
 * AllCards との結合や名前重複チェック用のヘルパーも提供する。
 */
import { useState, useCallback, useMemo } from 'react'
import type { SupportCard } from '../types/card'
import { loadUserCards, saveUserCards } from '../utils/userCardStorage'
import { resolveAbilityValues } from '../utils/abilityValueResolver'
import * as data from '../data'

/** useUserCards の返却型 */
interface UserCardsState {
  /** ユーザー定義サポートの配列 */
  userCards: SupportCard[]
  /** AllCards + userCards の結合配列 */
  allCards: SupportCard[]
  /** allCards の名前→カード Map */
  allCardByName: Map<string, SupportCard>
  /** ユーザー定義カード名の Set（UI 表示区別用） */
  userCardNames: Set<string>
  /** ユーザー定義サポートを追加する */
  addUserCard: (card: SupportCard) => void
  /** ユーザー定義サポートを更新する（名前で特定） */
  updateUserCard: (oldName: string, card: SupportCard) => void
  /** ユーザー定義サポートを削除する */
  deleteUserCard: (cardName: string) => void
}

/**
 * ユーザー定義サポートを管理するフック
 *
 * @returns ユーザーカード状態と CRUD 関数
 */
export function useUserCards(): UserCardsState {
  const [userCards, setUserCards] = useState<SupportCard[]>(loadUserCards)

  /** localStorage に保存して state を更新する */
  const persist = useCallback((cards: SupportCard[]) => {
    setUserCards(cards)
    saveUserCards(cards)
  }, [])

  /** ユーザー定義サポートを追加する */
  const addUserCard = useCallback(
    (card: SupportCard) => {
      persist([...userCards, card])
    },
    [userCards, persist],
  )

  /** ユーザー定義サポートを更新する */
  const updateUserCard = useCallback(
    (oldName: string, card: SupportCard) => {
      persist(userCards.map((c) => (c.name === oldName ? card : c)))
    },
    [userCards, persist],
  )

  /** ユーザー定義サポートを削除する */
  const deleteUserCard = useCallback(
    (cardName: string) => {
      persist(userCards.filter((c) => c.name !== cardName))
    },
    [userCards, persist],
  )

  /** AllCards + ユーザーカード（アビリティ値解決済み）の結合配列 */
  const allCards = useMemo(() => {
    const inflated = userCards.map((card) => ({
      ...card,
      abilities: card.abilities.map((ability, index) => ({
        ...ability,
        values: resolveAbilityValues(card, ability, index),
      })),
    }))
    return [...data.AllCards, ...inflated]
  }, [userCards])

  /** 結合カードの名前 Map */
  const allCardByName = useMemo(() => new Map(allCards.map((c) => [c.name, c])), [allCards])

  /** ユーザー定義カード名 Set */
  const userCardNames = useMemo(() => new Set(userCards.map((c) => c.name)), [userCards])

  return {
    userCards,
    allCards,
    allCardByName,
    userCardNames,
    addUserCard,
    updateUserCard,
    deleteUserCard,
  }
}
