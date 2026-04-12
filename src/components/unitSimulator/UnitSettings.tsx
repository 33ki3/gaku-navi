/**
 * 最適編成設定コンポーネント
 *
 * 自動編成の条件を設定するフォーム。
 * プラン選択・タイプ制限・SP枚数・パラボ設定・レンタル枠設定を含む。
 */
import { useTranslation } from 'react-i18next'
import { useCallback } from 'react'

import { ToggleButton } from '../ui/ToggleButton'
import { SpinnerInput } from '../ui/SpinnerInput'
import { HelpTooltip } from '../ui/HelpTooltip'
import * as constant from '../../constant'
import { PlanType, CardType, ButtonSizeType, ParameterType } from '../../types/enums'
import * as data from '../../data'
import type { UnitSimulatorSettings } from '../../types/unit'

/** UnitSettings に渡すプロパティ */
interface UnitSettingsProps {
  /** 現在の設定 */
  settings: UnitSimulatorSettings
  /** 設定変更コールバック */
  onChange: (settings: UnitSimulatorSettings) => void
}

/**
 * 最適編成の編成設定UI
 *
 * @param props - コンポーネントプロパティ
 * @returns 設定フォーム要素
 */
export default function UnitSettings({ settings, onChange }: UnitSettingsProps) {
  const { t } = useTranslation()

  // SP枚数の合計
  const spTotal = settings.spConstraint.vocal + settings.spConstraint.dance + settings.spConstraint.visual
  // タイプ別最小枚数の合計
  const typeMinTotal =
    settings.typeCountMin[ParameterType.Vocal] +
    settings.typeCountMin[ParameterType.Dance] +
    settings.typeCountMin[ParameterType.Visual]
  // タイプ別最大枚数の合計
  const typeMaxTotal =
    settings.typeCountMax[ParameterType.Vocal] +
    settings.typeCountMax[ParameterType.Dance] +
    settings.typeCountMax[ParameterType.Visual]
  // タイプごとに最小が最大を超えているか
  const typeMinExceedsMax = data.SelectableTypeEntries.some(
    (entry) => settings.typeCountMin[entry.parameterType] > settings.typeCountMax[entry.parameterType],
  )

  /** プラン変更 */
  const handlePlanChange = useCallback(
    (plan: PlanType) => {
      onChange({ ...settings, plan })
    },
    [settings, onChange],
  )

  /** タイプトグル */
  const handleTypeToggle = useCallback(
    (type: CardType) => {
      const current = settings.allowedTypes
      const next = current.includes(type) ? current.filter((t) => t !== type) : [...current, type]
      onChange({ ...settings, allowedTypes: next })
    },
    [settings, onChange],
  )

  /** SP枚数変更 */
  const handleSpChange = useCallback(
    (key: ParameterType, value: number) => {
      onChange({
        ...settings,
        spConstraint: { ...settings.spConstraint, [key]: value },
      })
    },
    [settings, onChange],
  )

  /** タイプ別最小枚数変更 */
  const handleTypeMinChange = useCallback(
    (type: ParameterType, value: number) => {
      onChange({
        ...settings,
        typeCountMin: { ...settings.typeCountMin, [type]: value },
      })
    },
    [settings, onChange],
  )

  /** タイプ別最大枚数変更 */
  const handleTypeMaxChange = useCallback(
    (type: ParameterType, value: number) => {
      onChange({
        ...settings,
        typeCountMax: { ...settings.typeCountMax, [type]: value },
      })
    },
    [settings, onChange],
  )

  /** パラボ%変更 */
  const handleParamBonusChange = useCallback(
    (key: ParameterType, value: number) => {
      onChange({
        ...settings,
        paramBonusPercent: { ...settings.paramBonusPercent, [key]: value },
      })
    },
    [settings, onChange],
  )

  /** 初期パラメータ変更 */
  const handleInitialParamsChange = useCallback(
    (key: ParameterType, value: number) => {
      onChange({
        ...settings,
        initialParams: { ...settings.initialParams, [key]: value },
      })
    },
    [settings, onChange],
  )

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-4">
      {/* 育成プラン選択 */}
      <section>
        <h3 className={constant.SECTION_HEADING_SM_PX}>
          {t('unit.settings.plan')}
          <HelpTooltip text={t('unit.settings.plan_tip')} />
        </h3>
        <div className="flex gap-1.5">
          {data.SelectablePlanEntries.map((opt) => (
            <ToggleButton
              key={opt.id}
              isActive={settings.plan === opt.id}
              onClick={() => handlePlanChange(opt.id)}
              activeClass={opt.activeColor}
              inactiveClass={constant.BTN_TOGGLE_INACTIVE}
              size={ButtonSizeType.Sm}
            >
              {t(opt.label)}
            </ToggleButton>
          ))}
        </div>
      </section>

      {/* サポートタイプ制限 */}
      <section>
        <h3 className={constant.SECTION_HEADING_SM_PX}>
          {t('unit.settings.type_filter')}
          <HelpTooltip text={t('unit.settings.type_filter_tip')} />
        </h3>
        <div className="flex gap-1.5">
          {data.SelectableTypeEntries.map((entry) => (
            <ToggleButton
              key={entry.cardType}
              isActive={settings.allowedTypes.includes(entry.cardType)}
              onClick={() => handleTypeToggle(entry.cardType)}
              activeClass={entry.badge}
              inactiveClass={constant.BTN_TOGGLE_INACTIVE}
              size={ButtonSizeType.Sm}
            >
              {t(entry.displayLabel)}
            </ToggleButton>
          ))}
        </div>
      </section>

      {/* SP発生率枚数 */}
      <section>
        <h3 className={constant.SECTION_HEADING_SM_PX}>
          {t('unit.settings.sp_count')}
          <HelpTooltip text={t('unit.settings.sp_count_tip')} />
          <span className="ml-2 text-slate-400">
            ({spTotal}/{constant.SP_TOTAL_MAX})
          </span>
        </h3>
        <div className="grid grid-cols-3 gap-2">
          {data.SelectableTypeEntries.map((entry) => (
            <div key={entry.parameterType} className="flex flex-col items-center gap-1">
              <span className={`text-[10px] font-bold ${entry.text}`}>{t(entry.displayLabel)}</span>
              <SpinnerInput
                value={settings.spConstraint[entry.parameterType]}
                min={0}
                max={constant.SP_TOTAL_MAX}
                onChange={(v) => handleSpChange(entry.parameterType, v)}
              />
            </div>
          ))}
        </div>
        {spTotal > constant.SP_TOTAL_MAX && (
          <p className="text-[10px] text-red-500 font-bold mt-1">{t('unit.settings.sp_over_limit')}</p>
        )}
      </section>

      {/* タイプ別 最小枚数 */}
      <section>
        <h3 className={constant.SECTION_HEADING_SM_PX}>
          {t('unit.settings.type_count_min')}
          <HelpTooltip text={t('unit.settings.type_count_min_tip')} />
          <span className="ml-2 text-slate-400">
            ({typeMinTotal}/{constant.UNIT_SIZE})
          </span>
        </h3>
        <div className="grid grid-cols-3 gap-2">
          {data.SelectableTypeEntries.map((entry) => (
            <div key={entry.cardType} className="flex flex-col items-center gap-1">
              <span className={`text-[10px] font-bold ${entry.text}`}>{t(entry.displayLabel)}</span>
              <SpinnerInput
                value={settings.typeCountMin[entry.parameterType]}
                min={0}
                max={constant.UNIT_SIZE}
                onChange={(v) => handleTypeMinChange(entry.parameterType, v)}
              />
            </div>
          ))}
        </div>
        {typeMinTotal > constant.UNIT_SIZE && (
          <p className="text-[10px] text-red-500 font-bold mt-1">{t('unit.settings.type_min_over_limit')}</p>
        )}
        {typeMinExceedsMax && (
          <p className="text-[10px] text-red-500 font-bold mt-1">{t('unit.settings.type_min_exceeds_max')}</p>
        )}
      </section>

      {/* タイプ別 最大枚数 */}
      <section>
        <h3 className={constant.SECTION_HEADING_SM_PX}>
          {t('unit.settings.type_count_max')}
          <HelpTooltip text={t('unit.settings.type_count_max_tip')} />
          <span className="ml-2 text-slate-400">
            ({typeMaxTotal}/{constant.UNIT_SIZE})
          </span>
        </h3>
        <div className="grid grid-cols-3 gap-2">
          {data.SelectableTypeEntries.map((entry) => (
            <div key={entry.cardType} className="flex flex-col items-center gap-1">
              <span className={`text-[10px] font-bold ${entry.text}`}>{t(entry.displayLabel)}</span>
              <SpinnerInput
                value={settings.typeCountMax[entry.parameterType]}
                min={0}
                max={constant.UNIT_SIZE}
                onChange={(v) => handleTypeMaxChange(entry.parameterType, v)}
              />
            </div>
          ))}
        </div>
        {typeMaxTotal < constant.UNIT_SIZE && (
          <p className="text-[10px] text-red-500 font-bold mt-1">{t('unit.settings.type_max_under_limit')}</p>
        )}
      </section>

      {/* 初期パラメータ設定 */}
      <section>
        <h3 className={constant.SECTION_HEADING_SM_PX}>
          {t('unit.settings.initial_params')}
          <HelpTooltip text={t('unit.settings.initial_params_tip')} />
        </h3>
        <div className="grid grid-cols-3 gap-2">
          {data.SelectableTypeEntries.map((entry) => (
            <div key={entry.parameterType} className="flex flex-col items-center gap-1">
              <span className={`text-[10px] font-bold ${entry.text}`}>{t(entry.displayLabel)}</span>
              <SpinnerInput
                value={settings.initialParams[entry.parameterType]}
                min={0}
                max={9999}
                onChange={(v) => handleInitialParamsChange(entry.parameterType, v)}
              />
            </div>
          ))}
        </div>
      </section>

      {/* パラメータボーナス設定 */}
      <section>
        <h3 className={constant.SECTION_HEADING_SM_PX}>
          {t('unit.settings.param_bonus')}
          <HelpTooltip text={t('unit.settings.param_bonus_tip')} />
        </h3>
        <div className="grid grid-cols-3 gap-2">
          {data.SelectableTypeEntries.map((entry) => (
            <div key={entry.parameterType} className="flex flex-col items-center gap-1">
              <span className={`text-[10px] font-bold ${entry.text}`}>{t(entry.displayLabel)}</span>
              <SpinnerInput
                value={settings.paramBonusPercent[entry.parameterType]}
                min={0}
                max={200}
                step={0.1}
                onChange={(v) => handleParamBonusChange(entry.parameterType, v)}
              />
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
