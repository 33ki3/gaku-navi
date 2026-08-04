/**
 * 最適編成のSP枚数・タイプ別枚数制約
 */
import { useTranslation } from 'react-i18next'
import * as constant from '../../constant'
import * as data from '../../data'
import * as enums from '../../types/enums'
import type { UnitSimulatorSettings } from '../../types/unit'
import { HelpTooltip } from '../ui/HelpTooltip'
import { ParameterSpinnerGrid } from './ParameterSpinnerGrid'

interface UnitCountConstraintsProps {
  /** 現在の最適編成設定 */
  settings: UnitSimulatorSettings
  /** 設定変更時に呼び出す関数 */
  onChange: (settings: UnitSimulatorSettings) => void
}

/**
 * SP発生率枚数とタイプ別の最小・最大枚数を表示する
 *
 * @param props - 現在の設定と変更処理
 * @returns 枚数制約の入力欄と入力内容の警告
 */
export function UnitCountConstraints({ settings, onChange }: UnitCountConstraintsProps) {
  const { t } = useTranslation()
  const spTotal = data.SelectableTypeEntries.reduce(
    (total, entry) => total + settings.spConstraint[entry.parameterType],
    0,
  )
  const typeMinTotal = data.SelectableTypeEntries.reduce(
    (total, entry) => total + settings.typeCountMin[entry.parameterType],
    0,
  )
  const typeMaxTotal = data.SelectableTypeEntries.reduce(
    (total, entry) => total + settings.typeCountMax[entry.parameterType],
    0,
  )
  const typeMinExceedsMax = data.SelectableTypeEntries.some(
    (entry) => settings.typeCountMin[entry.parameterType] > settings.typeCountMax[entry.parameterType],
  )

  /** SP枚数を指定したパラメータだけ更新する */
  const changeSpCount = (parameterType: enums.ParameterType, value: number) => {
    onChange({
      ...settings,
      spConstraint: { ...settings.spConstraint, [parameterType]: value },
    })
  }

  /** タイプ別の最小枚数を更新する */
  const changeTypeMin = (parameterType: enums.ParameterType, value: number) => {
    onChange({
      ...settings,
      typeCountMin: { ...settings.typeCountMin, [parameterType]: value },
    })
  }

  /** タイプ別の最大枚数を更新する */
  const changeTypeMax = (parameterType: enums.ParameterType, value: number) => {
    onChange({
      ...settings,
      typeCountMax: { ...settings.typeCountMax, [parameterType]: value },
    })
  }

  return (
    <>
      {/* SP発生率をタイプ別に設定するセクション */}
      <section>
        <h3 className={constant.SECTION_HEADING_SM_PX}>
          {t('unit.settings.sp_count')}
          <HelpTooltip text={t('unit.settings.sp_count_tip')} />
          <span className="ml-2 text-slate-400">
            ({spTotal}/{constant.SP_TOTAL_MAX})
          </span>
        </h3>
        <ParameterSpinnerGrid
          values={settings.spConstraint}
          min={0}
          max={constant.SP_TOTAL_MAX}
          onChange={changeSpCount}
        />
        {spTotal > constant.SP_TOTAL_MAX && (
          <p className={constant.UNIT_SETTINGS_WARNING_TEXT}>{t('unit.settings.sp_over_limit')}</p>
        )}
      </section>

      {/* タイプごとの最低枚数を設定するセクション */}
      <section>
        <h3 className={constant.SECTION_HEADING_SM_PX}>
          {t('unit.settings.type_count_min')}
          <HelpTooltip text={t('unit.settings.type_count_min_tip')} />
          <span className="ml-2 text-slate-400">
            ({typeMinTotal}/{constant.UNIT_SIZE})
          </span>
        </h3>
        <ParameterSpinnerGrid
          values={settings.typeCountMin}
          min={0}
          max={constant.UNIT_SIZE}
          onChange={changeTypeMin}
        />
        {typeMinTotal > constant.UNIT_SIZE && (
          <p className={constant.UNIT_SETTINGS_WARNING_TEXT}>{t('unit.settings.type_min_over_limit')}</p>
        )}
        {typeMinExceedsMax && (
          <p className={constant.UNIT_SETTINGS_WARNING_TEXT}>{t('unit.settings.type_min_exceeds_max')}</p>
        )}
      </section>

      {/* タイプごとの最大枚数を設定するセクション */}
      <section>
        <h3 className={constant.SECTION_HEADING_SM_PX}>
          {t('unit.settings.type_count_max')}
          <HelpTooltip text={t('unit.settings.type_count_max_tip')} />
          <span className="ml-2 text-slate-400">
            ({typeMaxTotal}/{constant.UNIT_SIZE})
          </span>
        </h3>
        <ParameterSpinnerGrid
          values={settings.typeCountMax}
          min={0}
          max={constant.UNIT_SIZE}
          onChange={changeTypeMax}
        />
        {typeMaxTotal < constant.UNIT_SIZE && (
          <p className={constant.UNIT_SETTINGS_WARNING_TEXT}>{t('unit.settings.type_max_under_limit')}</p>
        )}
      </section>
    </>
  )
}
