/**
 * イベント種別フィルターコンポーネント
 *
 * イベントの種類（スキルカード獲得・Pアイテム獲得・強化・チェンジ・削除等）
 * でカードを絞り込むフィルター行。
 * 獲得系（前半）と操作系（後半）の2カテゴリに分かれる。
 */
import { useTranslation } from 'react-i18next'
import type { CardFiltersReturn } from '../../hooks'
import * as data from '../../data'
import * as constant from '../../constant'
import { getFilterButtonStyle } from '../../data/ui'
import { ButtonSizeType, FilterButtonCategory } from '../../types/enums'
import { ToggleButton } from '../ui/ToggleButton'

/** EventTypeFilter コンポーネントに渡すプロパティ */
interface EventTypeFilterProps {
  /** 選択中のイベントフィルター */
  selectedEventFilters: CardFiltersReturn['selectedEventFilters']
  /** イベントフィルターの選択/解除を切り替える関数 */
  toggleEventFilter: CardFiltersReturn['toggleEventFilter']
}

/** イベント種別フィルター行 */
export function EventTypeFilter({ selectedEventFilters, toggleEventFilter }: EventTypeFilterProps) {
  const { t } = useTranslation()

  return (
    <div>
      <p className={constant.FILTER_SECTION_LABEL}>{t('ui.filter.event_type')}</p>
      <div className="flex flex-wrap items-center gap-2">
        {/* 獲得系イベント（スキルカード獲得・Pアイテム獲得など） */}
        {(() => {
          return data.EventFilterAcquireList.map((ef) => (
            <ToggleButton
              key={ef.value}
              isActive={selectedEventFilters.has(ef.value)}
              onClick={() => toggleEventFilter(ef.value)}
              activeClass={getFilterButtonStyle(FilterButtonCategory.EventAcquire)}
              size={ButtonSizeType.Sm}
            >
              {t(ef.label)}
            </ToggleButton>
          ))
        })()}
        {/* 区切り線 */}
        <span className={constant.FILTER_SEPARATOR} />
        {/* 操作系イベント（強化・チェンジ・削除など） */}
        {(() => {
          return data.EventFilterModifyList.map((ef) => (
            <ToggleButton
              key={ef.value}
              isActive={selectedEventFilters.has(ef.value)}
              onClick={() => toggleEventFilter(ef.value)}
              activeClass={getFilterButtonStyle(FilterButtonCategory.EventModify)}
              size={ButtonSizeType.Sm}
            >
              {t(ef.label)}
            </ToggleButton>
          ))
        })()}
      </div>
    </div>
  )
}
