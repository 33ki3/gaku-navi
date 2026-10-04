/** Pアイドルカード単位の単発アチーブメント6項目 */
import { useTranslation } from 'react-i18next'
import * as constant from '../../constant'
import type { PIdolAchievementOption } from '../../types/achievementCalculator'
import type { PIdolCardAchievementId } from '../../types/enums'
import * as enums from '../../types/enums'
import { getExpTotalClass } from '../../utils/display/achievement'

import { ToggleButton } from '../ui/ToggleButton'
import { BulkCompletionToggle } from './BulkCompletionToggle'

/** カード単位の独立した6条件と、一括・個別の更新操作 */
interface PIdolAchievementCardProps {
  /** カードの正式名称。アイドル名は選択済みなので付けない */
  name: string
  /** 最終試験・評価・特訓段階の達成条件をゲーム内の順で並べる */
  achievements: readonly PIdolAchievementOption[]
  /** 6条件それぞれの達成記録。上位条件を達成しても他条件は連動しない */
  completed: Readonly<Record<PIdolCardAchievementId, boolean>>
  /** このカードの6条件だけを全達成または全未達成にする */
  onSetAllAchievements: (completed: boolean) => void
  /** タップした条件だけを切り替える */
  onAchievementChange: (achievementId: PIdolCardAchievementId, completed: boolean) => void
}

/**
 * カードごとの6個の達成状況を常時表示する
 * @param props カード名・条件ごとの達成記録と、一括／個別の更新通知先
 * @returns Pアイドル1枚の達成条件と獲得EXPを示すカード
 */
export function PIdolAchievementCard({
  name,
  achievements,
  completed,
  onAchievementChange,
  onSetAllAchievements,
}: PIdolAchievementCardProps) {
  const { t } = useTranslation()
  // 各条件の独立した達成記録からEXPを求め、一括トグルの中間状態も判定する
  const earnedExp = achievements.reduce(
    (sum, achievement) => sum + (completed[achievement.id] ? achievement.exp : 0),
    0,
  )
  const isCompleted = achievements.length > 0 && achievements.every(({ id }) => completed[id])
  const isIncomplete = achievements.every(({ id }) => !completed[id])
  const totalExp = achievements.reduce((sum, achievement) => sum + achievement.exp, 0)

  return (
    <article
      className={`rounded-lg border transition-colors ${isCompleted ? constant.ACHIEVEMENT_COMPLETE_CARD_CLASS : 'border-slate-200 bg-white'}`}
    >
      {/* カード名・獲得済み／総EXP・カード単位の一括トグル */}
      <div className="flex min-h-12 flex-wrap items-center justify-between gap-2 px-3 py-2">
        <span className="truncate text-xs font-black text-slate-800">{name}</span>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <span className={`shrink-0 text-[10px] font-bold tabular-nums ${getExpTotalClass(earnedExp, totalExp)}`}>
            {t('achievement_calculator.form.exp_total', {
              earned: earnedExp.toLocaleString(),
              total: totalExp.toLocaleString(),
            })}
          </span>
          <BulkCompletionToggle
            name={name}
            isCompleted={isCompleted}
            isPartial={!isCompleted && !isIncomplete}
            onChange={onSetAllAchievements}
          />
        </div>
      </div>

      {/* カード内の6条件を個別に記録する達成トグル */}
      <div className="grid gap-1.5 border-t border-slate-100 p-2 sm:grid-cols-2 lg:grid-cols-3">
        {achievements.map(({ id, title, exp }) => {
          const isCompleted = completed[id]
          return (
            <ToggleButton
              key={id}
              isActive={isCompleted}
              onClick={() => onAchievementChange(id, !isCompleted)}
              activeClass={`border ${constant.ACHIEVEMENT_COMPLETE_TOGGLE_CLASS}`}
              inactiveClass="border border-slate-100 bg-slate-50 text-slate-600 hover:border-sky-100 hover:bg-sky-50/50"
              size={enums.ButtonSizeType.Sm}
              className="flex min-h-11 w-full items-center justify-between gap-2 px-2.5 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
            >
              <span className="min-w-0 text-left text-[11px] font-bold leading-snug">{title}</span>
              <span className="shrink-0 text-[10px] font-black tabular-nums">
                {t('achievement_calculator.form.exp_value', { exp: exp.toLocaleString() })}
              </span>
            </ToggleButton>
          )
        })}
      </div>
    </article>
  )
}
