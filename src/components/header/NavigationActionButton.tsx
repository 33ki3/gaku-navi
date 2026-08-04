import type { ComponentType } from 'react'
import type { IconProps } from '../ui/icons/types'

interface NavigationActionButtonProps {
  /** ボタンに表示するアイコン */
  icon: ComponentType<IconProps>
  /** ボタンに表示するラベル */
  label: string
  /** クリック時の処理 */
  onClick: () => void
  /** ボタン本体のレイアウト・状態クラス */
  className: string
  /** アイコンのサイズクラス */
  iconClassName: string
  /** ラベルの追加クラス */
  labelClassName?: string
  /** 押下状態を支援技術へ伝える値 */
  ariaPressed?: boolean
}

/**
 * ヘッダーと下部ナビゲーションで共有するアイコン付き操作ボタン。
 * 配置ごとのサイズや色は呼び出し側に残し、アイコンとラベルの構造だけを共通化する
 */
export function NavigationActionButton({
  icon: Icon,
  label,
  onClick,
  className,
  iconClassName,
  labelClassName = 'truncate',
  ariaPressed,
}: NavigationActionButtonProps) {
  return (
    /* アイコンとラベルを持つ共通ナビゲーションボタン */
    <button type="button" onClick={onClick} className={className} aria-pressed={ariaPressed}>
      <Icon className={iconClassName} />
      <span className={labelClassName}>{label}</span>
    </button>
  )
}
