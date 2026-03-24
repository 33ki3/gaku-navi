/**
 * 凸数セレクター共通コンポーネント
 *
 * 0凸〜4凸までの5つのボタンを横に並べて、
 * カードの凸数（限界突破回数）を選べるUI。
 * カード一覧・カード詳細モーダルの両方で使われる。
 */
import { useTranslation } from 'react-i18next'
import type { UncapSelectorVariantType, UncapType } from '../../types/enums'
import * as enums from '../../types/enums'
import { getUncapSelectorVariantStyle } from '../../data/ui'

/** UncapSelector コンポーネントに渡すプロパティ */
interface UncapSelectorProps {
  /** 今選ばれている凸数 */
  value: UncapType
  /** 凸数が変わった時に呼ばれる関数 */
  onChange: (uncap: UncapType) => void
  /** 選択中のボタン色クラス */
  activeClass: string
  /** 未選択のボタン色クラス */
  inactiveClass: string
  /** 未所持ボタンを表示するか（デフォルト: true） */
  showNotOwned?: boolean
  /** 見た目のバリアント（compact / full）。デフォルトは compact */
  variant?: UncapSelectorVariantType
  /** 追加のCSSクラス */
  className?: string
}

/** 凸数（0凸〜4凸）を選択するボタン群 */
export function UncapSelector({
  value,
  onChange,
  activeClass,
  inactiveClass,
  showNotOwned = true,
  variant = enums.UncapSelectorVariantType.Compact,
  className = '',
}: UncapSelectorProps) {
  const { t } = useTranslation()
  const style = getUncapSelectorVariantStyle(variant)
  const uncapValues = showNotOwned
    ? Object.values(enums.UncapType)
    : Object.values(enums.UncapType).filter((u) => u !== enums.UncapType.NotOwned)
  return (
    <div className={`flex ${style.gap} ${className}`}>
      {/* 凸数のトグルボタンを並べる */}
      {uncapValues.map((u) => (
        <button
          key={u}
          onClick={() => onChange(u)}
          className={`${style.button} transition-all ${value === u ? (u === enums.UncapType.NotOwned ? 'bg-slate-500 text-white' : activeClass) : inactiveClass}`}
        >
          {u === enums.UncapType.NotOwned ? t('ui.uncap.not_owned') : `${u}${t('ui.unit.uncap')}`}
        </button>
      ))}
    </div>
  )
}
