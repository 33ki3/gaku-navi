/**
 * アプリ全体で使うサポートカード一覧
 *
 * 起動時に外部データを読み込み、アプリで使うサポートカード配列へ変換する
 * アビリティの凸別値は読み込み時に共通設定から補完し、カードごとの重複を避ける
 */

import type { SupportCard } from '../../types/card'
import { resolveAbilityValues } from '../../utils/abilityValueResolver'

/** 外部から読み込んだカードデータを補正し、アプリで使う一覧へ変換する */
export function inflateCards(rawCards: unknown): SupportCard[] {
  if (!Array.isArray(rawCards)) {
    throw new Error('Card data must be an array')
  }

  const cards = rawCards as SupportCard[]
  return cards.map((card) => ({
    ...card,
    abilities: card.abilities.map((ability, index) => ({
      ...ability,
      values: resolveAbilityValues(card, ability, index),
    })),
  }))
}

/**
 * アプリ全体で参照するサポートカード一覧
 * 起動時に読み込み、以降は各画面から同じ一覧を参照する
 */
export let AllCards: SupportCard[] = []

/** 外部から読み込んだカードデータを、アプリ全体で使う形へ初期化する */
export function initializeCards(rawCards: unknown): void {
  AllCards = inflateCards(rawCards)
}
