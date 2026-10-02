/**
 * 固定レンタルをカード名で判定し、選択中の編成から画面の枠配置を作る。
 * レンタルの固定はカード名の一致で判定し、配列のスロット順へ依存させない。
 */
import * as constant from '../constant'
import type { UnitSimulatorSettings } from '../types/unit'

/**
 * レンタル名が固定一覧に含まれていれば、そのカードを固定レンタルとして扱う
 *
 * @param settings - レンタル指定と固定一覧
 * @returns 固定されたレンタル名。未選択・未固定ならnull
 */
export function getLockedRentalCardName(settings: UnitSimulatorSettings): string | null {
  return settings.rentalCardName && settings.lockedCards.includes(settings.rentalCardName)
    ? settings.rentalCardName
    : null
}

/**
 * 選択中のカードを、通常5枠とレンタル1枠の表示へ並べる
 *
 * @param settings - 選択カード一覧とレンタル名
 * @returns 空き枠をnullで埋めた画面表示用の6枠
 */
export function getUnitSlotCards(settings: UnitSimulatorSettings): (string | null)[] {
  // 通常枠のnullは位置を保ち、レンタルだけを6枠目へ配置する
  const normal = settings.selectedCards
    .filter((name) => settings.rentalCardName === null || name !== settings.rentalCardName)
    .slice(0, constant.UNIT_SIZE - 1)
  while (normal.length < constant.UNIT_SIZE - 1) normal.push(null)
  return [
    ...normal,
    settings.rentalCardName && settings.selectedCards.includes(settings.rentalCardName)
      ? settings.rentalCardName
      : null,
  ]
}
