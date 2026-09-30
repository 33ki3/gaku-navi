/**
 * 最適編成候補からの除外状態フィルター。
 *
 * 除外カードを一覧から隠さず、表示対象だけを切り替える。
 */
import { useTranslation } from 'react-i18next'
import * as constant from '../../constant'
import * as data from '../../data'
import type { CardFiltersReturn } from '../../hooks'
import * as enums from '../../types/enums'
import { ToggleButton } from '../ui/ToggleButton'

interface CardExclusionFilterProps {
  /** 選択中の除外状態フィルター */
  filters: CardFiltersReturn['selectedCardExclusionFilters']
  /** 除外状態フィルターを切り替える関数 */
  toggleFilter: CardFiltersReturn['toggleCardExclusionFilter']
}

/** 除外状態を複数選択できるフィルター行 */
export function CardExclusionFilter({ filters, toggleFilter }: CardExclusionFilterProps) {
  const { t } = useTranslation()

  return (
    <div>
      <p className={constant.FILTER_SECTION_LABEL}>{t('ui.filter.card_exclusion')}</p>
      <div className="flex flex-wrap items-center gap-2">
        {data.CardExclusionFilterEntries.map(({ value, label }) => (
          <ToggleButton
            key={value}
            isActive={filters.has(value)}
            onClick={() => toggleFilter(value)}
            activeClass={
              value === enums.CardExclusionFilterType.Excluded
                ? 'bg-rose-500 text-white shadow border border-transparent'
                : 'bg-emerald-500 text-white shadow border border-transparent'
            }
            size={enums.ButtonSizeType.Sm}
          >
            {t(label)}
          </ToggleButton>
        ))}
      </div>
    </div>
  )
}
