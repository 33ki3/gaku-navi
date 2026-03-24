/**
 * 閉じるボタン（×アイコン）
 *
 * モーダルやパネルの右上に配置する×ボタン。
 * SVGの×アイコンを内包する。
 */
import type { ButtonSizeType } from '../../types/enums'
import { ButtonSizeType as ButtonSizeEnum } from '../../types/enums'
import { getCloseButtonSizeStyle } from '../../data/ui'

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
      {/* ×アイコン */}
      <svg className={style.icon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  )
}
