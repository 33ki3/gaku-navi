/**
 * サポートマスタデータ。
 *
 * cards.json は起動時に外部アセットから読み込み、型付きの全サポート配列へ変換する。
 * アビリティの凸別値は cards.json に重複保存せず、読み込み時にマスタから復元する。
 */

import type { SupportCard } from '../../types/card'
import { resolveAbilityValues } from '../../utils/abilityValueResolver'

/** 生サポートデータにアビリティ値を補完して、実行時の SupportCard 配列に変換する */
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
 * 全サポートカードマスタ。
 * 起動時に initializeCards で設定され、以降は全コンポーネントから参照する。
 */
export let AllCards: SupportCard[] = []

/** サポート名 → サポートオブジェクトの逆引きマップ（O(1)ルックアップ用） */
export let CardByName = new Map<string, SupportCard>()

/** 外部から読み込んだカードデータを、アプリ全体で使う形へ初期化する */
export function initializeCards(rawCards: unknown): void {
  AllCards = inflateCards(rawCards)
  CardByName = new Map(AllCards.map((card) => [card.name, card]))
}
