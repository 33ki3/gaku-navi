/**
 * バッジ共通コンポーネント
 *
 * レアリティ（SSR/SR/R）、タイプ（Vo/Da/Vi）、プラン（センス/ロジック）などの
 * ラベルを表示するための汎用的な小さいタグ。
 * サイズ・色・フォントウェイトをpropsで切り替えられる。
 */
import type { ReactNode } from 'react'
import type { BadgeSizeType, BadgeWeightType } from '../../types/enums'
import { BadgeSizeType as BadgeSizeEnum, BadgeWeightType as BadgeWeightEnum } from '../../types/enums'
import { getBadgeSizeStyle, getBadgeWeightClass } from '../../data/ui'

/** Badge コンポーネントに渡すプロパティ */
interface BadgeProps {
  /** バッジ内に表示する内容（テキストやアイコンなど） */
  children: ReactNode
  /** サイズ（sm / md / lg）。デフォルトは md */
  size?: BadgeSizeType
  /** フォントの太さ（bold / normal）。デフォルトは bold */
  weight?: BadgeWeightType
  /** 背景色とテキスト色のTailwindクラス（例: "bg-blue-100 text-blue-800"） */
  color: string
  /** 追加のCSSクラス */
  className?: string
}

/** レアリティ・タイプ等を表示する汎用バッジ */
export function Badge({
  children,
  size = BadgeSizeEnum.Md,
  weight = BadgeWeightEnum.Bold,
  color,
  className = '',
}: BadgeProps) {
  return (
    <span className={`${getBadgeSizeStyle(size)} ${getBadgeWeightClass(weight)} ${color} shrink-0 whitespace-nowrap ${className}`.trim()}>
      {children}
    </span>
  )
}
