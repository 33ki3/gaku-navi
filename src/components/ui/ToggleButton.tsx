/**
 * トグルボタン共通コンポーネント
 *
 * フィルター選択などで使う「ON/OFFを切り替えるボタン」。
 * 押すと色が変わり、もう一度押すと元に戻る。
 */
import type { ButtonSizeType } from '../../types/enums'
import * as constant from '../../constant'
import { getFilterButtonStyle, getToggleButtonSizeStyle } from '../../data/ui'
import { ButtonSizeType as ButtonSizeEnum, FilterButtonCategory } from '../../types/enums'

/** ToggleButton コンポーネントに渡すプロパティ */
interface ToggleButtonProps {
  /** ボタンに表示するラベル */
  children: React.ReactNode
  /** 現在ONかどうか */
  isActive: boolean
  /** クリックされた時に呼ばれる関数 */
  onClick: () => void
  /** ONの時に使う色のクラス */
  activeClass: string
  /** OFFの時に使う色のクラス（省略するとデフォルトのグレー） */
  inactiveClass?: string
  /** ボタンを押せなくするかどうか */
  disabled?: boolean
  /** ボタンの大きさ（sm / md / lg） */
  size?: ButtonSizeType
  /** 追加のCSSクラス */
  className?: string
}

/** 活性/非活性を切り替えるトグルボタン */
export function ToggleButton({
  children,
  isActive,
  onClick,
  activeClass,
  inactiveClass = getFilterButtonStyle(FilterButtonCategory.Inactive),
  disabled = false,
  size = ButtonSizeEnum.Md,
  className = '',
}: ToggleButtonProps) {
  const stateClass = disabled ? constant.BTN_DISABLED : isActive ? activeClass : inactiveClass
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${getToggleButtonSizeStyle(size)} rounded-lg font-bold transition-colors ${stateClass} ${className}`}
    >
      {children}
    </button>
  )
}
