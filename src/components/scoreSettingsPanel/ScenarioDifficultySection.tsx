/**
 * シナリオ・難易度選択セクションコンポーネント
 *
 * シナリオ（初・N.I.Aなど）と難易度（PRO・MASTERなど）を
 * トグルボタンで選ぶ。非対応のオプションは無効化される。
 */
import { useTranslation } from 'react-i18next'
import * as constant from '../../constant'
import * as data from '../../data'
import type { ScoreSettings } from '../../types/card'
import * as enums from '../../types/enums'
import { ButtonSizeType } from '../../types/enums'
import {
  loadScheduleSelections,
  loadScoreSettings,
  normalizeScoreSettingsDerived,
  resolveScoreSettingsDifficulty,
  sumCustomParamBonusRows,
} from '../../utils/scoreSettings'
import { ToggleButton } from '../ui/ToggleButton'

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

  const difficultyOptions = data.getDifficultyOptionList(settings.scenario)

  return (
    <div className="mt-2 space-y-3">
      {/* シナリオ選択（初 / N.I.A などをボタンで切り替える） */}
      <div>
        <label className={constant.FORM_SECTION_LABEL}>
          {t('ui.settings.scenario')}
          {/* 一部シナリオが未対応のため注記を表示する。 */}
          {data.ScenarioOptionList.some((o) => o.value === enums.ScenarioType.Nia) && (
            <span className="text-[9px] font-normal text-slate-400">{t('ui.settings.partially_unsupported')}</span>
          )}
        </label>
        <div className="flex gap-1.5">
          {data.ScenarioOptionList.map((opt) => (
            <ToggleButton
              key={opt.value}
              isActive={settings.scenario === opt.value}
              onClick={() => {
                const sharedSettings = loadScoreSettings()
                const useCustomMode = opt.value === enums.ScenarioType.Custom
                // 難易度なしシナリオ（HIF/カスタム）は None、それ以外は切替先の既定値を解決する
                const newDifficulty = resolveScoreSettingsDifficulty(opt.value, sharedSettings.difficulty)
                const scheduleSelections = loadScheduleSelections(opt.value)

                onSettingsChange(
                  normalizeScoreSettingsDerived({
                    ...sharedSettings,
                    scenario: opt.value,
                    useCustomMode,
                    difficulty: newDifficulty,
                    scheduleSelections,
                    parameterBonusBase: useCustomMode
                      ? sumCustomParamBonusRows(sharedSettings.customParamBonusRows)
                      : sharedSettings.parameterBonusBase,
                  }),
                )
              }}
              activeClass={constant.BTN_TOGGLE_ACTIVE}
              inactiveClass={constant.BTN_TOGGLE_INACTIVE}
              disabled={opt.value === enums.ScenarioType.Nia}
              size={ButtonSizeType.Lg}
            >
              {t(opt.label)}
            </ToggleButton>
          ))}
        </div>
      </div>

      {/* 難易度選択（カスタムモード/HIF時は非表示） */}
      {difficultyOptions.length > 0 && (
        <div>
          <label className={constant.FORM_SECTION_LABEL}>
            {t('ui.settings.difficulty')}
            {difficultyOptions.some((o) => o.value !== enums.DifficultyType.Legend) && (
              <span className="text-[9px] font-normal text-slate-400">{t('ui.settings.partially_unsupported')}</span>
            )}
          </label>
          <div className="flex gap-1.5 flex-wrap">
            {difficultyOptions.map((opt) => (
              <ToggleButton
                key={opt.value}
                isActive={settings.difficulty === opt.value}
                onClick={() =>
                  onSettingsChange(
                    normalizeScoreSettingsDerived({
                      ...settings,
                      difficulty: opt.value,
                    }),
                  )
                }
                activeClass={constant.BTN_TOGGLE_ACTIVE}
                inactiveClass={constant.BTN_TOGGLE_INACTIVE}
                disabled={opt.value !== enums.DifficultyType.Legend}
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
