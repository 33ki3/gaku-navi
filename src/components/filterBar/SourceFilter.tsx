/**
 * 入手種別フィルターコンポーネント
 *
 * サポートの入手方法（恒常・コイン・季節限定・フェス・イベント等）
 * でサポートを絞り込むフィルター行。
 * 全入手種別を1つのフラットなリストとして表示する。
 */
import { useTranslation } from 'react-i18next'
import type { CardFiltersReturn } from '../../hooks'
import * as data from '../../data'
import * as constant from '../../constant'
import { ButtonSizeType, FilterButtonCategory } from '../../types/enums'
import { getFilterButtonStyle } from '../../data/ui'
import { ToggleButton } from '../ui/ToggleButton'

/** SourceFilter コンポーネントに渡すプロパティ */
interface SourceFilterProps {
  /** 選択中の入手種別フィルター */
  selectedSources: CardFiltersReturn['selectedSources']
  /** 入手種別フィルターの選択/解除を切り替える関数 */
  toggleSource: CardFiltersReturn['toggleSource']
}

/** 入手種別フィルター行 */
export function SourceFilter({ selectedSources, toggleSource }: SourceFilterProps) {
  const { t } = useTranslation()

  return (
    <div>
      <p className={constant.FILTER_SECTION_LABEL}>{t('ui.filter.source')}</p>
      <div className="flex flex-wrap items-center gap-2">
        {data.SourceDisplayEntries.map((sf) => (
          <ToggleButton
            key={sf.id}
            isActive={selectedSources.has(sf.id)}
            onClick={() => toggleSource(sf.id)}
            activeClass={getFilterButtonStyle(FilterButtonCategory.Source)}
            size={ButtonSizeType.Sm}
          >
            {t(sf.label)}
          </ToggleButton>
        ))}
      </div>
    </div>
  )
}
