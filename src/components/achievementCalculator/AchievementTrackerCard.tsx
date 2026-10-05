/** アチーブメント1項目の現在値と、到達済み・次のEXP報酬を表示する */
import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import * as constant from '../../constant'
import { usePressRepeat } from '../../hooks/usePressRepeat'
import type { AchievementMilestone } from '../../types/achievementCalculator'
import { calculateAchievementProgress, getNextAchievementMilestone } from '../../utils/achievementCalculator'

import { NumberInput } from '../ui/NumberInput'
import { ProgressBar } from '../ui/ProgressBar'

/** 報酬の表示と段階入力を構成する設定 */
interface AchievementTrackerCardProps {
  /** ゲーム内のアチーブ名 */
  title: string
  /** 進捗を入力する条件名 */
  metric?: string
  /** 入力中の文字列とは別に計算へ反映できた現在値 */
  value: number
  /** 累計条件の昇順に並べた各段階の報酬 */
  milestones: readonly AchievementMilestone[]
  /** EXPがない項目でも達成段階を操作できるようにする */
  allowZeroExpProgression?: boolean
  /** 有効時は+/-で報酬段階を飛ばさず、現在値を1ずつ増減する */
  oneStepSpinner?: boolean
  /** 指定しない場合は入力操作のない集計表示にする */
  onValueChange?: (value: number) => void
}

/**
 * ゲーム画面の累計値を直接入力し、達成状況を確認できるカード
 * @param props 累計現在値・段階報酬と、段階を移動する更新通知先
 * @returns 獲得EXP、前後段階への入力操作と達成進捗を示すカード
 */
export const AchievementTrackerCard = memo(function AchievementTrackerCard({
  title,
  metric,
  value,
  milestones,
  allowZeroExpProgression = false,
  oneStepSpinner = false,
  onValueChange,
}: AchievementTrackerCardProps) {
  const { t } = useTranslation()
  // 現在値までに達成した段階を合算し、次の報酬と総EXPを共通の集計で求める
  const summary = calculateAchievementProgress(milestones, value)
  // 通常は次のEXP報酬へ進み、報酬なしの達成項目だけ条件そのものへ進める
  const nextMilestone =
    summary.nextMilestone ??
    (allowZeroExpProgression ? getNextAchievementMilestone(milestones, value, true) : undefined)
  const targetValue = Math.max(0, ...milestones.map(({ threshold }) => threshold))
  // 現在値より小さい直近の報酬条件へ戻す。条件5・40・100の場合、60は40へ、40は5へ戻す
  const decreaseToPreviousMilestone = (multiplier = 1) => {
    let nextValue = value
    // 加速中は報酬境界を複数回たどり、最後に到達した境界だけを保存する
    for (let step = 0; step < multiplier; step += 1) {
      nextValue = milestones.reduce(
        (previous, { threshold, exp }) =>
          threshold < nextValue && (allowZeroExpProgression || exp > 0) ? Math.max(previous, threshold) : previous,
        0,
      )
      if (nextValue === 0) break
    }
    onValueChange?.(nextValue)
  }
  // 1刻み設定では通常1ずつ、長押し中は同じ入力を加速段階数だけ反映する
  const decreaseByStep = (multiplier = 1) => onValueChange?.(Math.max(0, value - multiplier))
  const increaseByStep = (multiplier = 1) => onValueChange?.(Math.min(targetValue, value + multiplier))
  const increaseToNextMilestone = (multiplier = 1) => {
    let nextValue = value
    // 長押し中は報酬境界を順に進み、到達した最後の境界を一度だけ反映する
    for (let step = 0; step < multiplier; step += 1) {
      const nextMilestone = getNextAchievementMilestone(milestones, nextValue, allowZeroExpProgression)
      if (!nextMilestone) break
      nextValue = Math.min(targetValue, nextMilestone.threshold)
    }
    onValueChange?.(nextValue)
  }
  // 全条件の達成と全EXP獲得を分け、末尾に報酬なしの条件がある場合も表示を保つ
  const isCompleted = targetValue > 0 && value >= targetValue
  const hasAllExp = isCompleted || (summary.totalExp > 0 && summary.earnedExp >= summary.totalExp)
  // 通常タップと長押しを共通化し、上下限や表示専用カードでは操作を無効にする
  const decreasePress = usePressRepeat(
    oneStepSpinner ? decreaseByStep : decreaseToPreviousMilestone,
    !onValueChange || value <= 0,
  )
  const increasePress = usePressRepeat(
    oneStepSpinner ? increaseByStep : increaseToNextMilestone,
    !onValueChange || value >= targetValue || (!oneStepSpinner && nextMilestone === undefined),
  )

  return (
    <article
      className={`rounded-xl border p-3 shadow-sm transition-colors ${isCompleted ? constant.ACHIEVEMENT_COMPLETE_CARD_CLASS : 'border-slate-200 bg-white'}`}
    >
      {/* アチーブ名と獲得済み／総EXP。全EXP獲得時は報酬表示を緑にする */}
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <h4 className="min-w-0 flex-1 break-words text-sm font-black text-slate-800">{title}</h4>
        <p
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-black tabular-nums ${hasAllExp ? constant.ACHIEVEMENT_COMPLETE_EXP_CLASS : 'bg-sky-50 text-sky-700'}`}
        >
          {t('achievement_calculator.form.exp_total', {
            earned: summary.earnedExp.toLocaleString(),
            total: summary.totalExp.toLocaleString(),
          })}
        </p>
      </div>

      {/* 条件名と直接入力・段階操作。Tab移動は入力欄だけを対象にする */}
      {(metric || onValueChange) && (
        <div className="mt-2 flex items-center justify-between gap-2">
          {metric && <p className="min-w-0 flex-1 text-[11px] font-semibold text-slate-500">{metric}</p>}
          {onValueChange && (
            <div className="ml-auto flex shrink-0 items-center gap-1" role="group" aria-label={title}>
              <button
                type="button"
                tabIndex={-1}
                {...decreasePress}
                disabled={value <= 0}
                aria-label={t(
                  oneStepSpinner
                    ? 'achievement_calculator.form.decrease_value'
                    : 'achievement_calculator.form.decrease_to_previous_reward',
                  { title },
                )}
                className={`${constant.ACHIEVEMENT_SPINNER_BUTTON_CLASS} touch-none select-none`}
              >
                {t('ui.symbol.minus')}
              </button>
              <NumberInput
                min={0}
                max={targetValue}
                inputMode="numeric"
                clampOnBlur
                aria-label={t('achievement_calculator.form.current_value_label', { title })}
                value={value}
                onChange={onValueChange}
                inputClassName={`${constant.ACHIEVEMENT_SPINNER_INPUT_CLASS} ${targetValue <= 1 ? 'w-12' : 'w-20 sm:w-24'}`}
              />
              <button
                type="button"
                tabIndex={-1}
                {...increasePress}
                disabled={value >= targetValue || (!oneStepSpinner && !nextMilestone)}
                aria-label={t(
                  oneStepSpinner
                    ? 'achievement_calculator.form.increase_value'
                    : nextMilestone
                      ? 'achievement_calculator.form.increase_to_next_reward'
                      : 'achievement_calculator.form.increase_value',
                  { title },
                )}
                className={`${constant.ACHIEVEMENT_SPINNER_BUTTON_CLASS} touch-none select-none`}
              >
                {t('ui.symbol.plus')}
              </button>
            </div>
          )}
        </div>
      )}

      {/* 入力値に対する達成率 */}
      <ProgressBar label={title} value={value} max={targetValue} onValueChange={onValueChange} className="mt-2" />

      {/* 次の報酬条件または全獲得の案内と、現在値／達成上限 */}
      <div className="mt-2 flex flex-wrap items-end justify-between gap-x-2 gap-y-1">
        <p className="min-w-0 flex-1 text-[11px] font-medium text-slate-500">
          {nextMilestone
            ? allowZeroExpProgression && nextMilestone.exp === 0
              ? t('achievement_calculator.form.next_progress', {
                  threshold: nextMilestone.threshold.toLocaleString(),
                })
              : t('achievement_calculator.form.next_milestone', {
                  threshold: nextMilestone.threshold.toLocaleString(),
                  exp: nextMilestone.exp.toLocaleString(),
                })
            : allowZeroExpProgression
              ? t('achievement_calculator.form.progress_complete')
              : t('achievement_calculator.form.registered_rewards_complete')}
        </p>
        <p className="shrink-0 text-[11px] font-bold tabular-nums text-slate-600">
          {t('ui.format.ratio', { value: value.toLocaleString(), max: targetValue.toLocaleString() })}
        </p>
      </div>
    </article>
  )
})
