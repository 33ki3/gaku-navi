/**
 * レアリティ・タイプ・プランフィルターコンポーネント
 *
 * SSR/SR/R、Vo/Da/Vi/アシスト、フリー/センス/ロジック/アノマリーの
 * トグルボタンを横に並べるフィルター行。
 * 各カテゴリは区切り線で分かれている。
 */
import { useTranslation } from 'react-i18next'
import type { CardFiltersReturn } from '../../hooks'
import * as data from '../../data'
import * as constant from '../../constant'
import * as enums from '../../types/enums'
import { ToggleButton } from '../ui/ToggleButton'
import { HelpTooltip } from '../ui/HelpTooltip'

/** RarityTypePlanFilter コンポーネントに渡すプロパティ */
interface RarityTypePlanFilterProps {
  /** 選択中のレアリティ */
  selectedRarities: CardFiltersReturn['selectedRarities']
  /** レアリティの選択/解除を切り替える関数 */
  toggleRarity: CardFiltersReturn['toggleRarity']
  /** 選択中のタイプ */
  selectedTypes: CardFiltersReturn['selectedTypes']
  /** タイプの選択/解除を切り替える関数 */
  toggleType: CardFiltersReturn['toggleType']
  /** 選択中のプラン */
  selectedPlans: CardFiltersReturn['selectedPlans']
  /** プランの選択/解除を切り替える関数 */
  togglePlan: CardFiltersReturn['togglePlan']
}

/** レアリティ・タイプ・プランのトグルフィルター */
export function RarityTypePlanFilter({
  selectedRarities,
  toggleRarity,
  selectedTypes,
  toggleType,
  selectedPlans,
  togglePlan,
}: RarityTypePlanFilterProps) {
  const { t } = useTranslation()

  return (
    <div>
      <div className={`${constant.FILTER_SECTION_LABEL} flex items-center`}>
        {t('ui.filter.rarity_type_plan')}
        <HelpTooltip text={t('ui.help.tooltip_filter')} className="ml-1" />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {/* レアリティ（SSR / SR / R）のトグルボタン */}
        {Object.values(enums.RarityType).map((rarity) => {
          const entry = data.getRarityEntry(rarity)
          return (
            <ToggleButton
              key={rarity}
              isActive={selectedRarities.has(rarity)}
              onClick={() => toggleRarity(rarity)}
              activeClass={`${entry.color} border border-transparent bg-clip-padding`}
            >
              {t(entry.label)}
            </ToggleButton>
          )
        })}
        {/* 区切り線 */}
        <span className={constant.FILTER_SEPARATOR} />
        {/* タイプ（Vo / Da / Vi / アシスト）のトグルボタン */}
        {data.TypeDisplayEntries.map((tf) => (
          <ToggleButton
            key={tf.cardType}
            isActive={selectedTypes.has(tf.cardType)}
            onClick={() => toggleType(tf.cardType)}
            activeClass={`${tf.badge} border border-transparent`}
          >
            {t(tf.label)}
          </ToggleButton>
        ))}
        {/* 区切り線 */}
        <span className={constant.FILTER_SEPARATOR} />
        {/* プラン（センス / ロジック）のトグルボタン */}
        {Object.values(enums.PlanType).map((plan) => {
          const entry = data.getPlanBadge(plan)
          return (
            <ToggleButton
              key={plan}
              isActive={selectedPlans.has(plan)}
              onClick={() => togglePlan(plan)}
              activeClass={`${entry.activeColor} border border-transparent`}
            >
              {t(entry.label)}
            </ToggleButton>
          )
        })}
      </div>
    </div>
  )
}
