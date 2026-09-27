import * as data from '../../data'

/** テスト用カード名索引をマスタデータから作る */
export function createTestCardByName() {
  return new Map(data.AllCards.map((card) => [card.name, card] as const))
}
