/** 選択アイドルのTrue End・基本・Pアイドルの達成項目を表示する */
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import * as constant from '../../constant'
import * as data from '../../data'
import type { AchievementCalculatorTabProps } from '../../types/achievementCalculator'
import {
  calculateAchievementProgress,
  getIdolAchievementMilestones,
  isIdolTrueEndMetric,
} from '../../utils/achievementCalculator'

import { ToggleButton } from '../ui/ToggleButton'
import { AchievementSectionHeader } from './AchievementSectionHeader'
import { AchievementTrackerCard } from './AchievementTrackerCard'
import { PIdolAchievementCard } from './PIdolAchievementCard'

/**
 * 選択アイドルの達成記録を、True End・基本・Pアイドルの3領域へ接続する
 * @param props 選択アイドルの集計と、独立した条件の更新操作
 * @returns True End・基本・Pアイドルの入力領域。対象がない場合はnull
 */
export function IdolAchievementsTab({ summary, controls, oneStepSpinner }: AchievementCalculatorTabProps) {
  const { t } = useTranslation()
  const {
    selectedIdol,
    selectedPIdolCards,
    selectedPIdolEarnedExp,
    selectedPIdolTotalExp,
    selectedTrueEndTrackers,
    selectedTrueEndProgress,
    selectedBasicEarnedExp,
    selectedBasicTotalExp,
  } = summary
  const { progress, setIdolValue, setPIdolCardAchievement, setPIdolCardAchievements } = controls
  // 選択中アイドルと更新先が変わらない間は同じ更新関数を使う
  const valueChangeByMetric = useMemo(() => {
    if (!selectedIdol) return new Map()
    return new Map(
      selectedIdol.trackers.map(
        ({ metric }) => [metric, (value: number) => setIdolValue(selectedIdol.id, metric, value)] as const,
      ),
    )
  }, [selectedIdol, setIdolValue])
  // 選択先がマスタに存在しない場合は、別アイドルの記録を表示・編集しない
  if (!selectedIdol) return null
  return (
    <section id="achievement-panel-idol" role="tabpanel" aria-labelledby="achievement-tab-idol">
      <div className="space-y-6">
        {/* True Endは編ごとの単発条件として独立したトグルで記録する */}
        <section className="min-w-0">
          <AchievementSectionHeader
            title={t('achievement_calculator.section.true_end')}
            earnedExp={selectedTrueEndProgress.earnedExp}
            totalExp={selectedTrueEndProgress.totalExp}
          />
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {selectedTrueEndTrackers.map((tracker) => {
              const value = progress.idols[selectedIdol.id]?.[tracker.metric] ?? 0
              const summary = calculateAchievementProgress(getIdolAchievementMilestones(tracker), value)
              return (
                <ToggleButton
                  key={tracker.metric}
                  isActive={value > 0}
                  onClick={() => setIdolValue(selectedIdol.id, tracker.metric, value > 0 ? 0 : 1)}
                  activeClass={constant.ACHIEVEMENT_COMPLETE_TOGGLE_CLASS}
                  inactiveClass="border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  className="flex min-h-24 flex-col items-stretch justify-center gap-1 border px-3 py-3 text-left"
                >
                  <span className="text-sm font-black">{t(tracker.titleKey)}</span>
                  <span className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                    <span className="text-[11px] font-semibold text-slate-500">
                      {t(data.IDOL_ACHIEVEMENT_RULES[tracker.metric].metricKey)}
                    </span>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-black tabular-nums ${value > 0 ? constant.ACHIEVEMENT_COMPLETE_EXP_CLASS : 'bg-sky-50 text-sky-700'}`}
                    >
                      {t('achievement_calculator.form.exp_total', {
                        earned: summary.earnedExp.toLocaleString(),
                        total: summary.totalExp.toLocaleString(),
                      })}
                    </span>
                  </span>
                </ToggleButton>
              )
            })}
          </div>
        </section>
        {/* 基本項目はゲーム画面の順序を維持し、共通条件とアイドル固有の条件を同じカードで表示する */}
        <section className="min-w-0">
          <AchievementSectionHeader
            title={t('achievement_calculator.section.basic')}
            earnedExp={selectedBasicEarnedExp}
            totalExp={selectedBasicTotalExp}
          />
          <div className="min-w-0">
            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {selectedIdol.trackers
                .filter((tracker) => !isIdolTrueEndMetric(tracker.metric))
                .map((tracker) => (
                  <AchievementTrackerCard
                    key={tracker.metric}
                    title={t(tracker.titleKey)}
                    metric={t(tracker.metricKey ?? data.IDOL_ACHIEVEMENT_RULES[tracker.metric].metricKey)}
                    value={progress.idols[selectedIdol.id]?.[tracker.metric] ?? 0}
                    milestones={getIdolAchievementMilestones(tracker)}
                    allowZeroExpProgression
                    oneStepSpinner={oneStepSpinner}
                    onValueChange={valueChangeByMetric.get(tracker.metric)}
                  />
                ))}
            </div>
          </div>
        </section>

        {/* 登場日の新しいPアイドルから、カードごとの6項目を表示する */}
        <section className="min-w-0">
          <AchievementSectionHeader
            title={t('achievement_calculator.section.p_idol')}
            earnedExp={selectedPIdolEarnedExp}
            totalExp={selectedPIdolTotalExp}
          />
          <div className="min-w-0">
            <div className="grid gap-2 md:grid-cols-2">
              {selectedPIdolCards.map((card) => (
                <PIdolAchievementCard
                  key={card.id}
                  name={card.name}
                  achievements={data.P_IDOL_CARD_ACHIEVEMENTS.map((achievement) => ({
                    id: achievement.id,
                    title: t(achievement.titleKey),
                    exp: achievement.exp,
                  }))}
                  completed={progress.pIdolCards[card.id]}
                  onSetAllAchievements={(completed) => setPIdolCardAchievements(card.id, completed)}
                  onAchievementChange={(achievementId, completed) =>
                    setPIdolCardAchievement(card.id, achievementId, completed)
                  }
                />
              ))}
            </div>
          </div>
        </section>
      </div>
    </section>
  )
}
