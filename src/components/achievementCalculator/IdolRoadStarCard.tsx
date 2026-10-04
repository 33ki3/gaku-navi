/** アイドルへの道の星ごとの達成入力と、アイドル単位の一括操作 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import * as constant from '../../constant'
import CollapsibleSection from '../ui/CollapsibleSection'
import { RatingStarIcon } from '../ui/icons'
import { ProgressBar } from '../ui/ProgressBar'
import { BulkCompletionToggle } from './BulkCompletionToggle'

/** アイドル別の進捗と、独立した星の更新通知先 */
interface IdolRoadStarCardProps {
  /** 見出しと一括トグルに表示するアイドル名 */
  name: string
  /** ステージ番号をキーにした3つの独立した星の達成状況 */
  value: Readonly<Record<string, readonly boolean[]>>
  /** 見出しと進捗バーに表示する達成済みの星の合計 */
  earnedStars: number
  /** 全ステージの星を達成した時の合計 */
  maxStars: number
  /** 指定したステージの星1つだけを更新する */
  onStageStarChange: (stageIndex: number, starIndex: number, completed: boolean) => void
  /** このアイドルの全ステージを一括更新する */
  onSetAllStages: (completed: boolean) => void
}

/**
 * 全ステージの一括操作と星ごとの独立した入力を提供する
 * @param props アイドル名・ステージごとの独立した星と、一括／個別の更新通知先
 * @returns 閉じた状態でも進捗と一括操作を利用できるステージ一覧
 */
export function IdolRoadStarCard({
  name,
  value,
  earnedStars,
  maxStars,
  onStageStarChange,
  onSetAllStages,
}: IdolRoadStarCardProps) {
  const { t } = useTranslation()
  // 閉じた状態でも星の進捗と一括操作を確認できる
  const [isOpen, setIsOpen] = useState(false)
  const isCompleted = earnedStars >= maxStars
  return (
    <CollapsibleSection
      isOpen={isOpen}
      onToggle={() => setIsOpen(!isOpen)}
      className={`overflow-hidden rounded-xl border shadow-sm transition-colors ${isCompleted ? constant.ACHIEVEMENT_COMPLETE_CARD_CLASS : 'border-slate-200 bg-white'}`}
      headerClassName="flex min-h-12 min-w-0 flex-1 items-center gap-2 px-3 text-left text-slate-500"
      title={
        <>
          <h3 className="min-w-0 flex-1 truncate text-sm font-black text-slate-800">{name}</h3>
          <span
            className={`shrink-0 text-xs font-black tabular-nums ${isCompleted ? constant.ACHIEVEMENT_COMPLETE_TEXT_CLASS : 'text-sky-800'}`}
          >
            {t('ui.format.ratio', { value: earnedStars.toLocaleString(), max: maxStars.toLocaleString() })}
          </span>
        </>
      }
      headerActions={
        <div className="pr-3">
          <BulkCompletionToggle
            name={name}
            isCompleted={isCompleted}
            isPartial={earnedStars > 0 && !isCompleted}
            onChange={onSetAllStages}
          />
        </div>
      }
      headerContent={<ProgressBar label={name} value={earnedStars} max={maxStars} className="mx-3 mb-3" />}
    >
      {/* 星は各ステージの独立した3条件を示し、選択した条件だけを更新する */}
      <div className="border-t border-slate-100 p-3">
        {/* 3列のアイドル表示でも星ボタンが縮まないよう、ステージはカード幅いっぱいに並べる */}
        <div className="grid gap-1">
          {Object.entries(value).map(([stageKey, stars]) => {
            const stageIndex = Number(stageKey)
            return (
              <div
                key={stageKey}
                className={`flex min-h-10 items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 transition-colors ${stars.every(Boolean) ? 'bg-emerald-50' : 'bg-slate-50'}`}
              >
                <span className="shrink-0 whitespace-nowrap text-xs font-bold tabular-nums text-slate-600">
                  {t('achievement_calculator.road.stage', { stage: stageIndex + 1 })}
                </span>
                <div
                  className="flex shrink-0 items-center gap-1"
                  role="group"
                  aria-label={t('achievement_calculator.road.stage', { stage: stageIndex + 1 })}
                >
                  {stars.map((selected, starIndex) => (
                    <button
                      key={starIndex}
                      type="button"
                      aria-label={t('achievement_calculator.road.set_stage_stars', {
                        stage: stageIndex + 1,
                        stars: starIndex + 1,
                      })}
                      aria-pressed={selected}
                      onClick={() => onStageStarChange(stageIndex, starIndex, !selected)}
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${selected ? 'text-amber-500' : 'text-slate-300 hover:bg-white hover:text-amber-400'}`}
                    >
                      <RatingStarIcon className="h-5 w-5" filled={selected} />
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </CollapsibleSection>
  )
}
