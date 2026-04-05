/**
 * アビリティフィルターコンポーネント
 *
 * SPフィルターとアビリティキーワードフィルターをまとめた行。
 * キーワードは2カテゴリ（パラメータ系・効果系）に分かれている。
 */
import { useTranslation } from 'react-i18next'
import type { CardFiltersReturn } from '../../hooks'
import * as data from '../../data'
import * as constant from '../../constant'
import { getFilterButtonStyle } from '../../data/ui'
import { ButtonSizeType, FilterButtonCategory } from '../../types/enums'
import { ToggleButton } from '../ui/ToggleButton'

/** AbilityFilter コンポーネントに渡すプロパティ */
interface AbilityFilterProps {
  /** SPアビリティ持ちのみ表示フラグ */
  spOnly: boolean
  /** SPフィルターのON/OFFを切り替える関数 */
  toggleSP: CardFiltersReturn['toggleSP']
  /** 選択中のアビリティキーワード */
  selectedAbilityKeywords: CardFiltersReturn['selectedAbilityKeywords']
  /** アビリティキーワードの選択/解除を切り替える関数 */
  toggleAbilityKeyword: CardFiltersReturn['toggleAbilityKeyword']
}

/** アビリティフィルター行 */
export function AbilityFilter({ spOnly, toggleSP, selectedAbilityKeywords, toggleAbilityKeyword }: AbilityFilterProps) {
  const { t } = useTranslation()

  return (
    <div>
      <p className={constant.FILTER_SECTION_LABEL}>{t('ui.filter.ability')}</p>
      <div className="flex flex-wrap items-center gap-2">
        {/* SPアビリティ持ちだけ表示するボタン */}
        <ToggleButton
          isActive={spOnly}
          onClick={toggleSP}
          activeClass="bg-amber-400 text-amber-900 shadow border border-transparent"
        >
          {t('ui.filter.sp_rate')}
        </ToggleButton>
        {/* 区切り線 */}
        <span className={constant.FILTER_SEPARATOR} />
        {/* パラメータ系キーワード（初期パラメータ・パラメータボーナス） */}
        {data.AbilityParamKeywords.map((kw) => (
          <ToggleButton
            key={kw}
            isActive={selectedAbilityKeywords.has(kw)}
            onClick={() => toggleAbilityKeyword(kw)}
            activeClass={getFilterButtonStyle(FilterButtonCategory.AbilityParam)}
            size={ButtonSizeType.Sm}
          >
            {t(data.AbilityKeywordMap.get(kw)!.badge)}
          </ToggleButton>
        ))}
        {/* 区切り線 */}
        <span className={constant.FILTER_SEPARATOR} />
        {/* 効果系キーワード（授業・おでかけ・休む・相談・差し入れ 等） */}
        {data.AbilityEffectKeywords.map((kw) => (
          <ToggleButton
            key={kw}
            isActive={selectedAbilityKeywords.has(kw)}
            onClick={() => toggleAbilityKeyword(kw)}
            activeClass={getFilterButtonStyle(FilterButtonCategory.AbilityEffect)}
            size={ButtonSizeType.Sm}
          >
            {t(data.AbilityKeywordMap.get(kw)!.badge)}
          </ToggleButton>
        ))}
      </div>
    </div>
  )
}
