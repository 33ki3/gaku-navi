/**
 * 閉じるボタン（×アイコン）
 *
 * モーダルやパネルの右上に配置する×ボタン。
 * SVGの×アイコンを内包する。
 */
import type { ButtonSizeType } from '../../types/enums'
import { ButtonSizeType as ButtonSizeEnum } from '../../types/enums'
import { getCloseButtonSizeStyle } from '../../data/ui'
import { CloseIcon } from './icons'

/** CloseButton コンポーネントに渡すプロパティ */
interface CloseButtonProps {
  /** ×が押された時に呼ばれる関数 */
  onClick: () => void
  /** ボタンの大きさ（sm / md / lg）。デフォルトは md */
  size?: ButtonSizeType
  /** 追加のCSSクラス */
  className?: string
}

/** 閉じるボタンを描画する */
export default function CloseButton({ onClick, size = ButtonSizeEnum.Md, className = '' }: CloseButtonProps) {
  const style = getCloseButtonSizeStyle(size)
  return (
    <button onClick={onClick} className={`${style.button} ${className}`}>
      <CloseIcon className={style.icon} />
    </button>
  )
}
