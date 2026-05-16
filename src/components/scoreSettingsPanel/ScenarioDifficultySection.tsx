/**
 * シナリオ・難易度選択セクションコンポーネント
 *
 * シナリオ（初・N.I.Aなど）と難易度（PRO・MASTERなど）を
 * トグルボタンで選ぶ。非対応のオプションは無効化される。
 */
import { useTranslation } from 'react-i18next'
import type { ScoreSettings } from '../../types/card'
import { ToggleButton } from '../ui/ToggleButton'
import { ButtonSizeType } from '../../types/enums'
import * as enums from '../../types/enums'
import * as constant from '../../constant'
import * as data from '../../data'
import { calculateParameterBonusFromSchedule, sumCustomParamBonusRows } from '../../utils/scoreSettings'

/** ScenarioDifficultySection コンポーネントに渡すプロパティ */
interface ScenarioDifficultySectionProps {
  /** 現在の設定値 */
  settings: ScoreSettings
  /** 設定値が変わったときに呼ばれる関数 */
  onSettingsChange: (settings: ScoreSettings) => void
}

/** シナリオ・難易度選択 */
export function ScenarioDifficultySection({ settings, onSettingsChange }: ScenarioDifficultySectionProps) {
  const { t } = useTranslation()

  const resolveParameterBonusBase = (
    scenario: enums.ScenarioType,
    difficulty: enums.DifficultyType,
    useCustomMode: boolean,
  ) =>
    useCustomMode
      ? sumCustomParamBonusRows(settings.customParamBonusRows)
      : calculateParameterBonusFromSchedule(settings.scheduleSelections, scenario, difficulty)

  return (
    <div className="mt-2 space-y-3">
      {/* シナリオ選択（初 / N.I.A などをボタンで切り替える） */}
      <div>
        <label className={constant.FORM_SECTION_LABEL}>
          {t('ui.settings.scenario')}
          {data.ScenarioOptionList.some((o) => !o.enabled) && (
            <span className="text-[9px] font-normal text-slate-400">{t('ui.settings.partially_unsupported')}</span>
          )}
        </label>
        <div className="flex gap-1.5">
          {data.ScenarioOptionList.map((opt) => (
            <ToggleButton
              key={opt.value}
              isActive={settings.scenario === opt.value}
              onClick={() => {
                const useCustomMode = opt.value === enums.ScenarioType.Custom
                onSettingsChange({
                  ...settings,
                  scenario: opt.value,
                  useCustomMode,
                  parameterBonusBase: resolveParameterBonusBase(opt.value, settings.difficulty, useCustomMode),
                })
              }}
              activeClass={constant.BTN_TOGGLE_ACTIVE}
              inactiveClass={constant.BTN_TOGGLE_INACTIVE}
              disabled={!opt.enabled}
              size={ButtonSizeType.Lg}
            >
              {t(opt.label)}
            </ToggleButton>
          ))}
        </div>
      </div>

      {/* 難易度選択（カスタムモード時は非表示） */}
      {!settings.useCustomMode && (
        <div>
          <label className={constant.FORM_SECTION_LABEL}>
            {t('ui.settings.difficulty')}
            {data.DifficultyOptionList.some((o) => !o.enabled) && (
              <span className="text-[9px] font-normal text-slate-400">{t('ui.settings.partially_unsupported')}</span>
            )}
          </label>
          <div className="flex gap-1.5 flex-wrap">
            {data.DifficultyOptionList.map((opt) => (
              <ToggleButton
                key={opt.value}
                isActive={settings.difficulty === opt.value}
                onClick={() =>
                  onSettingsChange({
                    ...settings,
                    difficulty: opt.value,
                    parameterBonusBase: resolveParameterBonusBase(settings.scenario, opt.value, settings.useCustomMode),
                  })
                }
                activeClass={constant.BTN_TOGGLE_ACTIVE}
                inactiveClass={constant.BTN_TOGGLE_INACTIVE}
                disabled={!opt.enabled}
                size={ButtonSizeType.Md}
              >
                {t(opt.label)}
              </ToggleButton>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
