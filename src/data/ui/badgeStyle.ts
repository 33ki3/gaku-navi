/**
 * バッジスタイルマスタ。
 *
 * Badge コンポーネントのサイズ・ウェイトバリアントに対応する
 * スタイルクラスを提供する。
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
 * Badge サイズに対応する Tailwind CSS クラスを返す。
 *
 * @param size - Badge のサイズ種別
 * @returns Tailwind CSS クラス文字列
 */
export function getBadgeSizeStyle(size: BadgeSizeType): string {
  return badgeSize[size]
}

/**
 * Badge ウェイトに対応するフォントクラスを返す。
 *
 * @param weight - Badge のフォントウェイト種別
 * @returns Tailwind CSS フォントクラス文字列
 */
export function getBadgeWeightClass(weight: BadgeWeightType): string {
  return badgeWeight[weight]
}
