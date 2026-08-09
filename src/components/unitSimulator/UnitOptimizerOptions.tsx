/**
 * 最適編成の共通オプション。
 *
 * 最適編成パネルとオプションモーダルの両方から利用し、同じ設定項目と更新処理を提供する。
 */
import { useTranslation } from 'react-i18next'
import * as constant from '../../constant'
import type { UnitSimulatorSettings } from '../../types/unit'
import { CheckboxField } from '../ui/CheckboxField'
import { HelpTooltip } from '../ui/HelpTooltip'
import { SpinnerInput } from '../ui/SpinnerInput'

interface UnitOptimizerOptionsProps {
  /** 現在の最適編成設定 */
  settings: UnitSimulatorSettings
  /** 設定変更時に呼び出す関数 */
  onChange: (settings: UnitSimulatorSettings) => void
  /** 点数設定から解決した現在のパラメータ上限 */
  resolvedParamCap?: number | null
  /** パラメータ上限と候補枚数の数値設定を表示するか */
  showNumericOptions?: boolean
}

/**
 * 最適編成で共通利用するチェック項目と数値設定を描画する
 *
 * @param props - 現在の設定、変更処理、数値項目の表示条件
 * @returns 最適編成のオプション一覧
 */
export function UnitOptimizerOptions({
  settings,
  onChange,
  resolvedParamCap,
  showNumericOptions = true,
}: UnitOptimizerOptionsProps) {
  const { t } = useTranslation()

  return (
    <div className="space-y-3">
      {/* レンタル枠と通常枠のロックを、カード単位で引き継ぐ設定 */}
      <CheckboxField
        label={t('unit.settings.unify_rental_lock')}
        checked={!!settings.unifyRentalLock}
        onChange={(checked) => onChange({ ...settings, unifyRentalLock: checked })}
        description={t('unit.settings.unify_rental_lock_tip')}
      />
      {/* コンテストで取得するスキルカードを候補から除外する設定 */}
      <CheckboxField
        label={t('unit.settings.exclude_contest_skill_cards')}
        checked={!!settings.excludeContestSkillCards}
        onChange={(checked) => onChange({ ...settings, excludeContestSkillCards: checked })}
        description={t('unit.settings.exclude_contest_skill_cards_tip')}
      />
      {/* コンテストで取得するPアイテムを候補から除外する設定 */}
      <CheckboxField
        label={t('unit.settings.exclude_contest_p_items')}
        checked={!!settings.excludeContestPItems}
        onChange={(checked) => onChange({ ...settings, excludeContestPItems: checked })}
        description={t('unit.settings.exclude_contest_p_items_tip')}
      />
      {showNumericOptions && (
        <>
          <div className="flex items-center justify-between gap-3">
            <span className={constant.SECTION_HEADING_SM_PX}>
              {t('unit.settings.param_cap')}
              <HelpTooltip text={t('unit.settings.param_cap_tip')} />
            </span>
            <SpinnerInput
              value={resolvedParamCap ?? 0}
              min={constant.PARAM_CAP_MIN}
              max={constant.INITIAL_PARAMETER_MAX}
              step={1}
              onChange={(value) => onChange({ ...settings, paramCapOverride: value })}
            />
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className={constant.SECTION_HEADING_SM_PX}>
              {t('unit.settings.candidate_limit')}
              <HelpTooltip text={t('unit.settings.candidate_limit_tip')} />
            </span>
            <SpinnerInput
              value={settings.exhaustiveCandidateLimit ?? constant.EXHAUSTIVE_CANDIDATE_LIMIT}
              min={constant.CANDIDATE_LIMIT_MIN}
              max={constant.CANDIDATE_LIMIT_MAX}
              step={1}
              onChange={(value) => onChange({ ...settings, exhaustiveCandidateLimit: value })}
            />
          </div>
        </>
      )}
    </div>
  )
}
