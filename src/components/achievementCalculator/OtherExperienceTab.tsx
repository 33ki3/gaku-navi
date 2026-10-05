/** プロデュース報酬・課題・パネルミッション・アイドルへの道の入力を表示する */
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import * as constant from '../../constant'
import * as data from '../../data'
import type { AchievementCalculatorTabProps } from '../../types/achievementCalculator'
import { calculateAchievementProgress, sumAchievementProgress } from '../../utils/achievementCalculator'

import { HelpTooltip } from '../ui/HelpTooltip'
import { SpinnerInput } from '../ui/SpinnerInput'
import { AchievementSectionHeader } from './AchievementSectionHeader'
import { AchievementTrackerCard } from './AchievementTrackerCard'
import { IdolRoadStarCard } from './IdolRoadStarCard'
import { IdolRoadSummary } from './IdolRoadSummary'

/**
 * アチーブ以外のEXP入力とアイドルへの道を、報酬の種類ごとに並べる
 * @param props 課題・プロデュース報酬・アイドルへの道の集計と更新操作
 * @returns アチーブ以外のEXP獲得元を入力するタブ
 */
export function OtherExperienceTab({ summary, controls, oneStepSpinner }: AchievementCalculatorTabProps) {
  const { t } = useTranslation()
  const {
    productionCountTracker,
    productionRunCount,
    productionRewardAdjustmentCount,
    productionRewardAdjustmentIsValid,
    productionRunBaseExp,
    productionRunEarnedExp,
    totalStars,
    roadProgress,
  } = summary
  const {
    progress,
    setProductionValue,
    setOtherTaskValue,
    setProductionRewardAdjustment,
    setIdolRoadStageStar,
    setIdolRoadStars,
  } = controls
  // 回数と課題の更新関数を項目ごとに固定し、他カードの再描画を避ける
  const productionValueChangeByTrackerId = useMemo(
    () =>
      new Map(
        data.PRODUCTION_ACHIEVEMENTS.map(({ id }) => [id, (value: number) => setProductionValue(id, value)] as const),
      ),
    [setProductionValue],
  )
  const otherTaskValueChangeByTrackerId = useMemo(
    () =>
      new Map(
        data.OTHER_EXPERIENCE_TRACKERS.map(({ id }) => [id, (value: number) => setOtherTaskValue(id, value)] as const),
      ),
    [setOtherTaskValue],
  )
  return (
    <section id="achievement-panel-other" role="tabpanel" aria-labelledby="achievement-tab-other">
      {/* プロデュース回数と試験結果によるプレイ報酬の補正 */}
      <section className="mb-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <h2 className="text-sm font-black text-slate-900">
              {t('achievement_calculator.other.production_reward.title')}
            </h2>
            <HelpTooltip
              text={t('achievement_calculator.other.production_reward.description', {
                count: productionRunCount,
                exp: constant.PRODUCTION_RUN_BASE_EXP.toLocaleString(),
                baseExp: productionRunBaseExp.toLocaleString(),
              })}
            />
          </div>
          <p className="shrink-0 text-xs font-black tabular-nums text-sky-800">
            {t('achievement_calculator.form.exp_value', { exp: productionRunEarnedExp.toLocaleString() })}
          </p>
        </div>
        {/* プロデュースタブと同じ回数を編集し、アチーブ報酬とプレイ報酬の両方へ反映する */}
        {productionCountTracker && (
          <div className="mb-3 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            <AchievementTrackerCard
              title={t(productionCountTracker.titleKey)}
              metric={t(productionCountTracker.metricKey)}
              value={productionRunCount}
              milestones={productionCountTracker.milestones}
              oneStepSpinner={oneStepSpinner}
              onValueChange={productionValueChangeByTrackerId.get(productionCountTracker.id)}
            />
          </div>
        )}
        {/* 試験結果を先に入力できるようにし、合計が総回数を超えた場合は補正を保留して警告する */}
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {data.PRODUCTION_RUN_REWARD_ADJUSTMENTS.map((adjustment) => {
            const value = progress.productionRewardAdjustments[adjustment.id]

            return (
              <div
                key={adjustment.id}
                className="flex min-h-16 items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2"
              >
                <span className="min-w-0">
                  <span className="block text-xs font-bold text-slate-700">{t(adjustment.titleKey)}</span>
                  <span className="mt-0.5 block text-[10px] font-medium text-slate-500">
                    {t('achievement_calculator.other.production_reward.outcome_exp', {
                      exp: constant.PRODUCTION_RUN_BASE_EXP - adjustment.expDeduction,
                      totalDeduction: (value * adjustment.expDeduction).toLocaleString(),
                    })}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-1.5">
                  <SpinnerInput
                    value={value}
                    onChange={(nextValue) => setProductionRewardAdjustment(adjustment.id, nextValue)}
                    min={0}
                    max={Number.MAX_SAFE_INTEGER}
                    inputMode="numeric"
                    clampOnBlur
                    aria-label={t('achievement_calculator.other.production_reward.count_label', {
                      title: t(adjustment.titleKey),
                    })}
                    buttonClassName={constant.ACHIEVEMENT_SPINNER_BUTTON_CLASS}
                    className="flex items-center gap-1"
                    inputClassName={`${constant.ACHIEVEMENT_SPINNER_INPUT_CLASS} w-20`}
                  />
                </span>
              </div>
            )
          })}
        </div>
        {/* 試験結果の内訳が総プロデュース回数を超えた時の入力警告 */}
        {!productionRewardAdjustmentIsValid && (
          <p role="alert" className="border-t border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800">
            {t('achievement_calculator.other.production_reward.count_error', {
              adjustments: productionRewardAdjustmentCount.toLocaleString(),
              count: productionRunCount,
            })}
          </p>
        )}
      </section>
      {/* 課題・各パネルを表示セクション単位で集計する */}
      <div className="space-y-6">
        {data.OTHER_EXPERIENCE_SECTIONS.map((section) => {
          const trackers = data.OTHER_EXPERIENCE_TRACKERS.filter((tracker) => tracker.sectionId === section.id)
          const sectionSummary = sumAchievementProgress(
            trackers.map((tracker) =>
              calculateAchievementProgress(tracker.milestones, progress.otherTasks[tracker.id] ?? 0),
            ),
          )

          return (
            <section key={section.id} className="min-w-0">
              <AchievementSectionHeader
                title={t(section.titleKey)}
                earnedExp={sectionSummary.earnedExp}
                totalExp={sectionSummary.totalExp}
              />
              <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                {trackers.map((tracker) => (
                  <AchievementTrackerCard
                    key={tracker.id}
                    title={t(tracker.titleKey)}
                    metric={t(tracker.metricKey)}
                    value={progress.otherTasks[tracker.id] ?? 0}
                    milestones={tracker.milestones}
                    oneStepSpinner={oneStepSpinner}
                    onValueChange={otherTaskValueChangeByTrackerId.get(tracker.id)}
                  />
                ))}
              </div>
            </section>
          )
        })}
      </div>
      {/* アイドルへの道は各ステージの星から集計し、総数への直接入力は置かない */}
      <section className="mt-6">
        <IdolRoadSummary totalStars={totalStars} progress={roadProgress} />

        {/* アイドル別のステージ。閉じた状態でも星数の進捗と一括操作を表示する */}
        <div className="mb-3 mt-4">
          <h2 className="text-sm font-black text-slate-900">{t('achievement_calculator.road.idol_stages')}</h2>
        </div>
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {data.IDOL_ACHIEVEMENTS.map((idol) => {
            const stages = progress.idolRoad[idol.id]
            const earnedStars = Object.values(stages).reduce((sum, stars) => sum + stars.filter(Boolean).length, 0)
            return (
              <IdolRoadStarCard
                key={idol.id}
                name={t(idol.nameKey)}
                value={stages}
                earnedStars={earnedStars}
                maxStars={constant.ROAD_MAX_STARS_PER_IDOL}
                onStageStarChange={(stageIndex, starIndex, completed) =>
                  setIdolRoadStageStar(idol.id, stageIndex, starIndex, completed)
                }
                onSetAllStages={(completed) => setIdolRoadStars(idol.id, completed)}
              />
            )
          })}
        </div>
      </section>
    </section>
  )
}
