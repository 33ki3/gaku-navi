/**
 * 凸数フィルターコンポーネント
 *
 * 0凸〜4凸のトグルボタンを並べたフィルター行。
 * 特定の凸数のカードだけ表示したい時に使う。
 */
import { useTranslation } from 'react-i18next'
import type { CardFiltersReturn } from '../../hooks'
import * as constant from '../../constant'
import * as enums from '../../types/enums'
import { ToggleButton } from '../ui/ToggleButton'

/** UncapFilter コンポーネントに渡すプロパティ */
interface UncapFilterProps {
  /** 選択中の凸数 */
  selectedUncaps: CardFiltersReturn['selectedUncaps']
  /** 凸数の選択/解除を切り替える関数 */
  toggleUncap: CardFiltersReturn['toggleUncap']
}

/** 凸数フィルター行 */
export function UncapFilter({ selectedUncaps, toggleUncap }: UncapFilterProps) {
  const { t } = useTranslation()

  return (
    <div>
      <p className={constant.FILTER_SECTION_LABEL}>{t('ui.filter.uncap')}</p>
      <div className="flex flex-wrap items-center gap-2">
        {/* 未所持〜4凸のトグルボタンを並べる */}
        {Object.values(enums.UncapType).map((uncap) => (
          <ToggleButton
            key={uncap}
            isActive={selectedUncaps.has(uncap)}
            onClick={() => toggleUncap(uncap)}
            activeClass={uncap === enums.UncapType.NotOwned
              ? 'bg-slate-500 text-white shadow border border-transparent'
              : 'bg-amber-400 text-amber-900 shadow border border-transparent'}
          >
            {uncap === enums.UncapType.NotOwned
              ? t('ui.uncap.not_owned')
              : `${uncap}${t('ui.unit.uncap')}`}
          </ToggleButton>
        ))}
      </div>
    </div>
  )
}
