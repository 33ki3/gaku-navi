/**
 * サポートごとのアビリティ値補正
 *
 * 共通の能力値と個別カードの値が異なる場合に、カード単位で補正するための対応表
 * 外側キーはサポート名、内側キーはスロット番号（1から数える）
 */

/** アビリティ値の辞書型。キー: 凸レベル(0-4)、値: 効果量。 */
type AbilityValues = Record<string, string>

/** スロット別エントリ型。キー: スロット番号(文字列)、値: 凸別効果量。 */
type SlotMap = Record<string, AbilityValues>

/** 全体の型。キー: サポート名、値: スロット別エントリ。 */
type DataType = Record<string, SlotMap>

const data: DataType = {
  食欲の秋なんです: {
    '1': { '0': '9', '1': '9', '2': '9', '3': '9', '4': '9' },
  },
  '私たちも成長していくぞ！': {
    '1': { '0': '21%', '1': '21%', '2': '28%', '3': '28%', '4': '28%' },
  },
}

/** サポート名・スロット番号・凸数から例外値を探す対応表 */
export const AbilityExceptionMap: ReadonlyMap<string, ReadonlyMap<number, AbilityValues>> = new Map(
  Object.entries(data).map(([card, slots]) => [
    card,
    new Map(Object.entries(slots).map(([slot, values]) => [Number(slot), values])),
  ]),
)
