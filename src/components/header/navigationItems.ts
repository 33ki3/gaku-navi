/**
 * 主要ナビゲーション項目の実行時データを組み立てる。
 *
 * 表示順はprimaryNavigation.tsのマスタ、ラベル・状態・操作は各画面から受け取る
 */
import type { ComponentType } from 'react'
import { DESKTOP_PRIMARY_NAVIGATION_ORDER } from '../../data/ui/primaryNavigation'
import { PrimaryNavigationKey } from '../../types/enums'
import { CalculatorIcon, ScoreSettingsIcon, StarIcon } from '../ui/icons'
import type { IconProps } from '../ui/icons/types'

/** 主要ナビゲーション1項目の表示状態と操作 */
interface PrimaryNavigationItem {
  key: PrimaryNavigationKey
  icon: ComponentType<IconProps>
  label: string
  action: () => void
  active: boolean
}

type PrimaryNavigationInput = Omit<PrimaryNavigationItem, 'key' | 'icon'>

/** アイコンは実行時データでは変わらないため、共通ユーティリティで対応付ける */
const PRIMARY_NAVIGATION_ICONS: Record<PrimaryNavigationKey, ComponentType<IconProps>> = {
  [PrimaryNavigationKey.Uncap]: StarIcon,
  [PrimaryNavigationKey.Simulator]: CalculatorIcon,
  [PrimaryNavigationKey.ScoreSettings]: ScoreSettingsIcon,
}

/** ナビゲーション順と画面状態から表示項目を組み立てる */
export function createPrimaryNavigationItems(
  items: Record<PrimaryNavigationKey, PrimaryNavigationInput>,
  order: readonly PrimaryNavigationKey[] = DESKTOP_PRIMARY_NAVIGATION_ORDER,
): PrimaryNavigationItem[] {
  return order.map((key) => ({ key, icon: PRIMARY_NAVIGATION_ICONS[key], ...items[key] }))
}
