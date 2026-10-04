/** 全アイドルの星とEXPを集計する、入力を持たないアイドルへの道の見出し */
import { useTranslation } from 'react-i18next'
import * as constant from '../../constant'
import * as data from '../../data'
import type { AchievementProgressSummary } from '../../types/achievementCalculator'
import { ProgressBar } from '../ui/ProgressBar'
import { AchievementSectionHeader } from './AchievementSectionHeader'

/** 全アイドルの達成量と、星数から導出したEXP報酬の集計 */
interface IdolRoadSummaryProps {
  /** 全ステージの達成済み星数 */
  totalStars: number
  /** 星の報酬条件から集計した獲得EXPと次の報酬 */
  progress: AchievementProgressSummary
}

/**
 * 全ステージの達成上限とEXP報酬の上限を分けて表示する
 * @param props 全アイドルの達成済み星数と、EXP報酬の集計
 * @returns 星の達成率と、次のEXP報酬までの不足数を示す見出し
 */
export function IdolRoadSummary({ totalStars, progress }: IdolRoadSummaryProps) {
  const { t } = useTranslation()
  const maxStars = data.IDOL_ACHIEVEMENTS.length * constant.ROAD_MAX_STARS_PER_IDOL
  return (
    <div>
      <AchievementSectionHeader
        title={t('achievement_calculator.section.road')}
        earnedExp={progress.earnedExp}
        totalExp={progress.totalExp}
      />
      <ProgressBar label={t('achievement_calculator.section.road')} value={totalStars} max={maxStars} />
      {/* 報酬段階と、全ステージの達成上限は別の基準で表示する */}
      <div className="mt-2 flex flex-wrap items-end justify-between gap-x-2 gap-y-1">
        <p className="min-w-0 flex-1 text-[11px] font-medium text-slate-500">
          {progress.nextMilestone
            ? t('achievement_calculator.road.next_reward', {
                count: progress.nextMilestone.threshold - totalStars,
                exp: progress.nextMilestone.exp.toLocaleString(),
              })
            : t('achievement_calculator.form.registered_rewards_complete')}
        </p>
        <p className="shrink-0 text-[11px] font-bold tabular-nums text-slate-600">
          {t('ui.format.ratio', { value: totalStars.toLocaleString(), max: maxStars.toLocaleString() })}
        </p>
      </div>
    </div>
  )
}
