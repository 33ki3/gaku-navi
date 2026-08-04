/**
 * 最適編成のプラン・サポートタイプ設定
 */
import { useTranslation } from 'react-i18next'
import * as constant from '../../constant'
import * as data from '../../data'
import * as enums from '../../types/enums'
import type { UnitSimulatorSettings } from '../../types/unit'
import { HelpTooltip } from '../ui/HelpTooltip'
import { ToggleButton } from '../ui/ToggleButton'

interface UnitPlanFiltersProps {
  /** 現在の最適編成設定 */
  settings: UnitSimulatorSettings
  /** 設定変更時に呼び出す関数 */
  onChange: (settings: UnitSimulatorSettings) => void
}

/**
 * 育成プランと候補に含めるサポートタイプを表示する
 *
 * @param props - 現在の設定と変更処理
 * @returns プランとサポートタイプの設定欄
 */
export function UnitPlanFilters({ settings, onChange }: UnitPlanFiltersProps) {
  const { t } = useTranslation()

  /** 育成プランを更新し、候補カードの条件を変える */
  const changePlan = (plan: enums.PlanType) => {
    onChange({ ...settings, plan })
  }

  /** 指定したサポートタイプを候補に含めるか切り替える */
  const toggleCardType = (cardType: enums.CardType) => {
    const allowedTypes = settings.allowedTypes.includes(cardType)
      ? settings.allowedTypes.filter((type) => type !== cardType)
      : [...settings.allowedTypes, cardType]
    onChange({ ...settings, allowedTypes })
  }

  return (
    <>
      {/* 育成プランを1つ選ぶセクション */}
      <section>
        <h3 className={constant.SECTION_HEADING_SM_PX}>
          {t('unit.settings.plan')}
          <HelpTooltip text={t('unit.settings.plan_tip')} />
        </h3>
        <div className="flex gap-1.5">
          {data.SelectablePlanEntries.map((option) => (
            <ToggleButton
              key={option.id}
              isActive={settings.plan === option.id}
              onClick={() => changePlan(option.id)}
              activeClass={option.activeColor}
              inactiveClass={constant.BTN_TOGGLE_INACTIVE}
              size={enums.ButtonSizeType.Sm}
            >
              {t(option.label)}
            </ToggleButton>
          ))}
        </div>
      </section>

      {/* 最適編成へ含めるサポートタイプを複数選ぶセクション */}
      <section>
        <h3 className={constant.SECTION_HEADING_SM_PX}>
          {t('unit.settings.type_filter')}
          <HelpTooltip text={t('unit.settings.type_filter_tip')} />
        </h3>
        <div className="flex gap-1.5">
          {data.TypeDisplayEntries.map((entry) => (
            <ToggleButton
              key={entry.cardType}
              isActive={settings.allowedTypes.includes(entry.cardType)}
              onClick={() => toggleCardType(entry.cardType)}
              activeClass={entry.badge}
              inactiveClass={constant.BTN_TOGGLE_INACTIVE}
              size={enums.ButtonSizeType.Sm}
            >
              {t(entry.displayLabel)}
            </ToggleButton>
          ))}
        </div>
      </section>
    </>
  )
}
