/** EXP付きのアイドル選択を、左右ボタンと横スクロールで表示する */
import { forwardRef, memo, useCallback, useImperativeHandle, useLayoutEffect } from 'react'
import { useTranslation } from 'react-i18next'
import * as constant from '../../constant'
import { useLoopingHorizontalScroll } from '../../hooks/useLoopingHorizontalScroll'
import type { IdolAchievementSelectorItem } from '../../types/achievementCalculator'
import { getExpTotalClass } from '../../utils/display/achievement'

import { ChevronRightIcon } from '../ui/icons'
import { ProgressBar } from '../ui/ProgressBar'

/** 名前・獲得済みEXP・全達成状態を持つ選択候補 */
interface IdolAchievementSelectorProps {
  /** 各アイドルの名称・EXP集計・全達成状態 */
  items: readonly IdolAchievementSelectorItem[]
  /** 詳細を表示しているアイドル */
  selectedId: string
  /** 選択アイドルを変更し、下のTrue End・基本・Pアイドルを切り替える */
  onSelect: (id: string) => void
}

/** 親のタブ切替から選択中アイドルを表示位置へ戻す操作 */
export interface IdolAchievementSelectorHandle {
  /** 選択中のアイドルが見えるよう、循環列内の最短位置へスクロールする */
  revealSelected: () => void
}

/**
 * 左右の端から反対側へ戻れるスクロールと、選択アイドルの表示位置を管理する
 * @param props 候補一覧・選択中のID・選択変更の通知先
 * @returns 左右の移動ボタンを備えた横スクロールのアイドル選択
 */
export const IdolAchievementSelector = memo(
  forwardRef<IdolAchievementSelectorHandle, IdolAchievementSelectorProps>(function IdolAchievementSelector(
    { items, selectedId, onSelect },
    ref,
  ) {
    const { t } = useTranslation()
    const { viewportRef, middleCopyRef, positionDotsRef, scrollBy, revealElement } = useLoopingHorizontalScroll()
    // ボタンもホイール・スワイプと同じスクロールへ接続する
    const scrollIdols = (direction: -1 | 1) => {
      const viewport = viewportRef.current
      if (viewport) scrollBy(direction * Math.max(160, viewport.clientWidth * 0.75))
    }

    // 親からのタブ復帰とアイドル変更時に、選択中の候補が見える位置へ寄せる
    const revealSelected = useCallback(() => {
      const selected = middleCopyRef.current?.querySelector<HTMLButtonElement>('[aria-pressed="true"]')
      if (selected) revealElement(selected, 'auto')
    }, [middleCopyRef, revealElement])
    useImperativeHandle(ref, () => ({ revealSelected }), [revealSelected])
    useLayoutEffect(() => {
      revealSelected()
    }, [selectedId, revealSelected])

    return (
      <div className="mx-auto max-w-7xl bg-slate-50 px-2 py-2 sm:px-6 lg:px-8">
        <div className="flex items-center gap-1">
          {/* 左のアイドルへスクロールするボタン */}
          <button
            type="button"
            aria-label={t('achievement_calculator.form.scroll_idols_left')}
            onClick={() => scrollIdols(-1)}
            className="flex h-10 w-7 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600"
          >
            <ChevronRightIcon className="h-4 w-4 rotate-180" />
          </button>
          {/* アイドル名・EXP・進捗バーを表示する選択ボタン列 */}
          <div
            ref={viewportRef}
            role="group"
            aria-label={t('achievement_calculator.section.idol')}
            className="min-w-0 flex-1 overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            style={{ touchAction: 'pan-x pinch-zoom' }}
            onFocusCapture={(event) => {
              if (event.target instanceof HTMLButtonElement) revealElement(event.target)
            }}
          >
            <div className="relative flex w-max gap-2">
              {/* 前後の補助列は見た目の連続性に使い、読み上げ・Tab移動では中央列だけを扱う */}
              {Array.from({ length: constant.IDOL_SELECTOR_COPY_COUNT }, (_, index) => index).map((copyIndex) => (
                <div
                  key={copyIndex}
                  ref={copyIndex === constant.IDOL_SELECTOR_MIDDLE_COPY_INDEX ? middleCopyRef : undefined}
                  aria-hidden={copyIndex !== constant.IDOL_SELECTOR_MIDDLE_COPY_INDEX || undefined}
                  className="flex shrink-0 gap-2"
                >
                  {items.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      aria-pressed={selectedId === item.id}
                      tabIndex={copyIndex === constant.IDOL_SELECTOR_MIDDLE_COPY_INDEX ? undefined : -1}
                      data-idol-id={item.id}
                      onClick={() => {
                        onSelect(item.id)
                        // 補助列をタップした場合も、読み上げ・キーボードの対象は中央の候補へ戻す
                        if (copyIndex !== constant.IDOL_SELECTOR_MIDDLE_COPY_INDEX) {
                          const primary = Array.from(middleCopyRef.current?.querySelectorAll('button') ?? []).find(
                            (button) => button.dataset.idolId === item.id,
                          )
                          primary?.focus({ preventScroll: true })
                        }
                      }}
                      className={`flex min-h-14 shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl border px-3 py-2 transition-colors ${item.isCompleted ? constant.ACHIEVEMENT_COMPLETE_TOGGLE_CLASS : selectedId === item.id ? 'border-sky-300 bg-sky-50 text-sky-950' : 'border-slate-200 bg-white text-slate-700 hover:border-sky-200'} ${item.isCompleted && selectedId === item.id ? 'ring-2 ring-inset ring-emerald-500' : ''}`}
                    >
                      <span className="text-xs font-black">{item.name}</span>
                      <span
                        className={`whitespace-nowrap text-[10px] font-bold tabular-nums ${getExpTotalClass(item.earnedExp, item.totalExp)}`}
                      >
                        {t('achievement_calculator.form.exp_total', {
                          earned: item.earnedExp.toLocaleString(),
                          total: item.totalExp.toLocaleString(),
                        })}
                      </span>
                      <ProgressBar
                        label={t('achievement_calculator.form.idol_exp_progress', { name: item.name })}
                        value={item.earnedExp}
                        max={item.totalExp}
                        className="mt-0.5 w-full gap-1"
                        percentClassName="w-8 text-[9px] font-bold"
                      />
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>
          {/* 右のアイドルへスクロールするボタン */}
          <button
            type="button"
            aria-label={t('achievement_calculator.form.scroll_idols_right')}
            onClick={() => scrollIdols(1)}
            className="flex h-10 w-7 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600"
          >
            <ChevronRightIcon className="h-4 w-4" />
          </button>
        </div>
        {/* 画面内に見えているアイドルの範囲を示し、循環の境界では左右両端が青くなる */}
        <div
          ref={positionDotsRef}
          className="mt-1.5 flex justify-center gap-1.5"
          role="img"
          aria-label={t('achievement_calculator.form.idol_visible_range')}
        >
          {items.map((item) => (
            <span
              key={item.id}
              title={item.name}
              aria-hidden="true"
              className="h-1.5 w-1.5 rounded-full bg-slate-300 data-[visible=true]:bg-sky-500"
            />
          ))}
        </div>
      </div>
    )
  }),
)
