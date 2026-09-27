/**
 * バッジのサイズと文字の太さに対応する表示設定
 *
 * 表示側が共通の見た目を使えるようにする
 */
import { BadgeSizeType, BadgeWeightType } from '../../types/enums'

const badgeSize: Record<BadgeSizeType, string> = {
  [BadgeSizeType.Sm]: 'px-1.5 py-0.5 rounded-full text-[9px]',
  [BadgeSizeType.Md]: 'px-2 py-0.5 rounded text-[10px]',
  [BadgeSizeType.MdRounded]: 'px-2 py-0.5 rounded-full text-[10px]',
}

const badgeWeight: Record<BadgeWeightType, string> = {
  [BadgeWeightType.Bold]: 'font-bold',
  [BadgeWeightType.Black]: 'font-black',
}

/**
 * バッジのサイズに対応する表示クラスを返す
 *
 * @param size - Badge のサイズ種別
 * @returns 表示クラスの文字列
 */
export function getBadgeSizeStyle(size: BadgeSizeType): string {
  return badgeSize[size]
}

/**
 * バッジの文字の太さに対応する表示クラスを返す
 *
 * @param weight - Badge のフォントウェイト種別
 * @returns 表示クラスの文字列
 */
export function getBadgeWeightClass(weight: BadgeWeightType): string {
  return badgeWeight[weight]
}
