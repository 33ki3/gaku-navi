/**
 * 適用中の絞り込み件数を表示する共通バッジ。
 *
 * 一覧、フィルターモーダル、スマホ下部メニューで
 * 色・大きさ・上限表記を揃える
 */
import { useTranslation } from 'react-i18next'
import * as constant from '../../constant'

interface FilterCountBadgeProps {
  /** 表示する適用中条件の件数。0以下なら表示しない */
  count: number
  /** 配置場所ごとに追加する余白・位置指定 */
  className?: string
}

/**
 * 絞り込み件数を共通デザインで表示する
 *
 * @param props - 件数と配置用の追加クラス
 * @returns 件数バッジ。件数が0以下なら何も返さない
 */
export function FilterCountBadge({ count, className = '' }: FilterCountBadgeProps) {
  const { t } = useTranslation()
  if (count <= 0) return null

  const label = count > constant.COUNT_BADGE_MAX ? t('ui.filter.count_overflow') : count
  return <span className={`${constant.FILTER_COUNT_BADGE} ${className}`}>{label}</span>
}
