/**
 * 最適編成の編成条件をまとめる設定フォーム。
 *
 * 各設定領域の表示と更新処理は、責務別の小さなコンポーネントへ委譲する。
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import * as enums from '../../types/enums'
import type { UnitSimulatorSettings } from '../../types/unit'
import CollapsibleSection from '../ui/CollapsibleSection'
import { UnitCountConstraints } from './UnitCountConstraints'
import { UnitOptimizerOptions } from './UnitOptimizerOptions'
import { UnitParameterInputs } from './UnitParameterInputs'
import { UnitPlanFilters } from './UnitPlanFilters'

interface UnitSettingsProps {
  /** 現在の設定 */
  settings: UnitSimulatorSettings
  /** 設定変更コールバック */
  onChange: (settings: UnitSimulatorSettings) => void
  /** 現在有効なパラメータ上限値 */
  resolvedParamCap: number | null
  /** 除外設定モードが有効か */
  isCardExclusionEditMode?: boolean
  /** 除外設定モードの切り替え */
  onToggleCardExclusionMode?: () => void
}

/**
 * 最適編成の設定領域を責務別に組み合わせる。
 *
 * @param props - 最適編成設定、変更処理、解決済み上限値
 * @returns 最適編成の編成設定フォーム
 */
export default function UnitSettings({
  settings,
  onChange,
  resolvedParamCap,
  isCardExclusionEditMode,
  onToggleCardExclusionMode,
}: UnitSettingsProps) {
  const { t } = useTranslation()
  const [isOptionsOpen, setIsOptionsOpen] = useState(false)

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      {/* 育成プランと候補タイプの条件 */}
      <UnitPlanFilters settings={settings} onChange={onChange} />
      {/* SP枚数とタイプ別枚数の制約 */}
      <UnitCountConstraints settings={settings} onChange={onChange} />
      {/* 初期パラメータとボーナス率 */}
      <UnitParameterInputs settings={settings} onChange={onChange} />
      <section className="border-t border-slate-200 pt-4">
        {/* 除外設定・ロック統合・候補数などのオプション */}
        <CollapsibleSection
          title={t('unit.settings.options')}
          isOpen={isOptionsOpen}
          onToggle={() => setIsOptionsOpen((open) => !open)}
          variant={enums.CollapsibleVariantType.Panel}
        >
          <div className="pt-3">
            <UnitOptimizerOptions
              settings={settings}
              onChange={onChange}
              resolvedParamCap={resolvedParamCap}
              isCardExclusionEditMode={isCardExclusionEditMode}
              onToggleCardExclusionMode={onToggleCardExclusionMode}
            />
          </div>
        </CollapsibleSection>
      </section>
    </div>
  )
}
