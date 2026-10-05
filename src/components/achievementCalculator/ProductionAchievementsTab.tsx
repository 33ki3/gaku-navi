/** プロデュース全体の達成項目を表示する */
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import * as data from '../../data'
import type { AchievementCalculatorTabProps } from '../../types/achievementCalculator'

import { AchievementSectionHeader } from './AchievementSectionHeader'
import { AchievementTrackerCard } from './AchievementTrackerCard'

/**
 * プロデュース全体のEXP合計と、ゲーム画面順の累計項目を表示する
 * @param props プロデュース全体の集計と、項目ごとの現在値更新操作
 * @returns ゲーム画面順に並ぶプロデュースの累計アチーブメント
 */
export function ProductionAchievementsTab({ summary, controls, oneStepSpinner }: AchievementCalculatorTabProps) {
  const { t } = useTranslation()
  const { productionSummary } = summary
  const { progress, setProductionValue } = controls
  // 更新関数の参照を項目ごとに保ち、変更していないカードの再描画を避ける
  const valueChangeByTrackerId = useMemo(
    () =>
      new Map(
        data.PRODUCTION_ACHIEVEMENTS.map(({ id }) => [id, (value: number) => setProductionValue(id, value)] as const),
      ),
    [setProductionValue],
  )
  return (
    <section id="achievement-panel-production" role="tabpanel" aria-labelledby="achievement-tab-production">
      {/* プロデュースアチーブメントの見出しと獲得済み／総EXP */}
      <AchievementSectionHeader
        title={t('achievement_calculator.section.production')}
        earnedExp={productionSummary.earnedExp}
        totalExp={productionSummary.totalExp}
      />
      {/* 配列の順序をゲーム画面の並びとして扱い、EXPがない条件も達成状況を記録する */}
      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {data.PRODUCTION_ACHIEVEMENTS.map((tracker) => (
          <AchievementTrackerCard
            key={tracker.id}
            title={t(tracker.titleKey)}
            metric={t(tracker.metricKey)}
            value={progress.production[tracker.id]}
            milestones={tracker.milestones}
            allowZeroExpProgression={tracker.milestones.every(({ exp }) => exp === 0)}
            oneStepSpinner={oneStepSpinner}
            onValueChange={valueChangeByTrackerId.get(tracker.id)}
          />
        ))}
      </div>
    </section>
  )
}
