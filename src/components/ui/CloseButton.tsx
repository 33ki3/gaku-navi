/**
 * 閉じるボタン（×アイコン）
 *
 * モーダルやパネルの右上に配置する×ボタン。
 * SVGの×アイコンを内包する。
 */
import { useTranslation } from 'react-i18next'
import * as uiData from '../../data/ui'
import * as enums from '../../types/enums'
import { CloseIcon } from './icons'

/** CloseButton コンポーネントに渡すプロパティ */
interface CloseButtonProps {
  /** ×が押された時に呼ばれる関数 */
  onClick: () => void
  /** ボタンの大きさ（sm / md / lg）。デフォルトは md */
  size?: enums.ButtonSizeType
  /** 追加のCSSクラス */
  className?: string
}

/**
 * 十分な押下領域と読み上げ名を持つ閉じるボタンを表示する。
 *
 * @param props - 閉じる操作、ボタンサイズ、追加クラス
 * @returns ×アイコンを含む閉じるボタン
 */
export default function CloseButton({ onClick, size = enums.ButtonSizeType.Md, className = '' }: CloseButtonProps) {
  const { t } = useTranslation()
  const style = uiData.getCloseButtonSizeStyle(size)
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${style.button} ${className}`}
      aria-label={t('ui.accessibility.close')}
    >
      <CloseIcon className={style.icon} />
    </button>
  )
}
