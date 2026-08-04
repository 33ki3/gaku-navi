/**
 * 最適編成の初期パラメータ・パラメータボーナス設定
 */
import { useTranslation } from 'react-i18next'
import * as constant from '../../constant'
import * as enums from '../../types/enums'
import type { UnitSimulatorSettings } from '../../types/unit'
import { HelpTooltip } from '../ui/HelpTooltip'
import { ParameterSpinnerGrid } from './ParameterSpinnerGrid'

interface UnitParameterInputsProps {
  /** 現在の最適編成設定 */
  settings: UnitSimulatorSettings
  /** 設定変更時に呼び出す関数 */
  onChange: (settings: UnitSimulatorSettings) => void
}

/**
 * 初期パラメータとパラメータボーナスを表示する
 *
 * @param props - 現在の設定と変更処理
 * @returns パラメータ関連の数値入力欄
 */
export function UnitParameterInputs({ settings, onChange }: UnitParameterInputsProps) {
  const { t } = useTranslation()

  /** 初期パラメータを指定した種類だけ更新する */
  const changeInitialParameter = (parameterType: enums.ParameterType, value: number) => {
    onChange({
      ...settings,
      initialParams: { ...settings.initialParams, [parameterType]: value },
    })
  }

  /** パラメータボーナスを指定した種類だけ更新する */
  const changeParameterBonus = (parameterType: enums.ParameterType, value: number) => {
    onChange({
      ...settings,
      paramBonusPercent: { ...settings.paramBonusPercent, [parameterType]: value },
    })
  }

  return (
    <>
      {/* 育成開始時に持っているVo・Da・Viの初期値を入力するセクション */}
      <section>
        <h3 className={constant.SECTION_HEADING_SM_PX}>
          {t('unit.settings.initial_params')}
          <HelpTooltip text={t('unit.settings.initial_params_tip')} />
        </h3>
        <ParameterSpinnerGrid
          values={settings.initialParams}
          min={0}
          max={constant.INITIAL_PARAMETER_MAX}
          onChange={changeInitialParameter}
        />
      </section>

      {/* 最適編成結果へ加算するパラメータボーナス率を入力するセクション */}
      <section>
        <h3 className={constant.SECTION_HEADING_SM_PX}>
          {t('unit.settings.param_bonus')}
          <HelpTooltip text={t('unit.settings.param_bonus_tip')} />
        </h3>
        <ParameterSpinnerGrid
          values={settings.paramBonusPercent}
          min={0}
          max={constant.PARAMETER_BONUS_PERCENT_MAX}
          step={constant.PARAMETER_BONUS_PERCENT_STEP}
          onChange={changeParameterBonus}
        />
      </section>
    </>
  )
}
