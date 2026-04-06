/**
 * サポートマスタデータ。
 *
 * cards.json を型付きの全サポート配列としてエクスポートする。
 * アビリティの凸別値は cards.json では空オブジェクトで出力され、読み込み時にマスタから復元する。
 */

import type { SupportCard } from '../../types/card'
import { resolveAbilityValues } from '../../utils/abilityValueResolver'
import rawCards from '../json/cards.json'

/**
 * 生サポートデータにアビリティ値を補完して、実行時の SupportCard 配列に変換する。
 *
 * @param cards - cards.json から読み込んだ生データ
 * @returns アビリティ値補完後のサポート配列
 */
function inflateCards(cards: SupportCard[]): SupportCard[] {
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
 * アプリ起動時に 1 回だけ生成され、以降は全コンポーネントから参照する。
 */
export const AllCards: SupportCard[] = inflateCards(rawCards as unknown as SupportCard[])

/** サポート名 → サポートオブジェクトの逆引きマップ（O(1)ルックアップ用） */
export const CardByName = new Map(AllCards.map((c) => [c.name, c]))
