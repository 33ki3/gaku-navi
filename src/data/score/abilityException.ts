/**
 * アビリティ値カード個別例外マスタ。
 *
 * マスタ値と実際のデータが不一致のカードを上書きで補正するためのマップ。
 * 外側キー: カード名、内側キー: スロット番号(1-based)。
 */

import rawData from './abilityException.json'

/** アビリティ値の辞書型。キー: 凸レベル(0-4)、値: 効果量。 */
type AbilityValues = Record<string, string>

/** JSON のスロット別エントリ型。キー: スロット番号(文字列)、値: 凸別効果量。 */
type RawSlotMap = Record<string, AbilityValues>

/** JSON 全体の型。キー: カード名、値: スロット別エントリ。 */
type RawData = Record<string, RawSlotMap>

const data = rawData as RawData

/** カード個別例外マップ。外側: カード名 → 内側: スロット番号(1-based) → 凸別値。 */
export const AbilityExceptionMap: ReadonlyMap<string, ReadonlyMap<number, AbilityValues>> = new Map(
  Object.entries(data).map(([card, slots]) => [
    card,
    new Map(Object.entries(slots).map(([slot, values]) => [Number(slot), values])),
  ]),
)
