/** 表示文言と、マスタを共有しても独立する達成状況を検証する */
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AchievementTrackerCard } from '../../../components/achievementCalculator/AchievementTrackerCard'
import { PIdolAchievementCard } from '../../../components/achievementCalculator/PIdolAchievementCard'
import * as constant from '../../../constant'
import * as data from '../../../data'
import { useAchievementCalculatorProgress } from '../../../hooks/useAchievementCalculatorProgress'
import ja from '../../../i18n/locales/ja.json'
import * as enums from '../../../types/enums'

afterEach(cleanup)
beforeEach(() => window.localStorage.clear())

describe('Pアイドルの表示', () => {
  it('6項目の名称とEXP報酬を指定順に表示する', () => {
    const completed = {
      [enums.PIdolCardAchievementId.FinalExamPassed]: false,
      [enums.PIdolCardAchievementId.SpecialTraining3]: false,
      [enums.PIdolCardAchievementId.EvaluationAPlus]: false,
      [enums.PIdolCardAchievementId.SpecialTraining4]: false,
      [enums.PIdolCardAchievementId.SpecialTraining5]: false,
      [enums.PIdolCardAchievementId.SpecialTraining6]: false,
    }
    const onAchievementChange = vi.fn()
    const onSetAllAchievements = vi.fn()
    render(
      <PIdolAchievementCard
        name="テストカード"
        achievements={data.P_IDOL_CARD_ACHIEVEMENTS.map(({ id, exp }) => ({
          id,
          exp,
          title: ja.achievement_calculator.achievement_name.p_idol_card[id],
        }))}
        completed={completed}
        onAchievementChange={onAchievementChange}
        onSetAllAchievements={onSetAllAchievements}
      />,
    )
    expect(screen.getAllByRole('button').map((button) => button.textContent)).toEqual([
      '最終試験に合格250 EXP',
      '特訓段階3にする1,000 EXP',
      'クリア時評価A+以上1,500 EXP',
      '特訓段階4にする1,500 EXP',
      '特訓段階5にする1,500 EXP',
      '特訓段階6にする2,000 EXP',
    ])
    fireEvent.click(screen.getByRole('button', { name: '特訓段階3にする1,000 EXP' }))
    expect(onAchievementChange).toHaveBeenCalledWith(enums.PIdolCardAchievementId.SpecialTraining3, true)
    fireEvent.click(screen.getByRole('checkbox'))
    expect(onSetAllAchievements).toHaveBeenCalledWith(true)
  })
})

describe('共通マスタによる達成状況', () => {
  it('評価ランク・特訓段階・別アイドルの値を連動させない', async () => {
    const { result } = renderHook(useAchievementCalculatorProgress)
    act(() => {
      result.current.setIdolValue(enums.IdolId.Saki, enums.IdolAchievementMetric.SpecialTrainingStages1To6, 6)
      result.current.setIdolValue(enums.IdolId.Saki, enums.IdolAchievementMetric.RankS4Plus, 1)
    })
    await waitFor(() => {
      expect(
        result.current.progress.idols[enums.IdolId.Saki][enums.IdolAchievementMetric.SpecialTrainingStages1To6],
      ).toBe(6)
      expect(result.current.progress.idols[enums.IdolId.Saki][enums.IdolAchievementMetric.RankS4Plus]).toBe(1)
    })
    expect(
      result.current.progress.idols[enums.IdolId.Saki][enums.IdolAchievementMetric.SpecialTrainingStages1To6],
    ).toBe(6)
    expect(result.current.progress.idols[enums.IdolId.Saki][enums.IdolAchievementMetric.SpecialTrainingStage7]).toBe(0)
    expect(result.current.progress.idols[enums.IdolId.Saki][enums.IdolAchievementMetric.RankB]).toBe(0)
    expect(
      result.current.progress.idols[enums.IdolId.Temari][enums.IdolAchievementMetric.SpecialTrainingStages1To6],
    ).toBe(0)
  })

  it('入力を再表示しても共通マスタの識別子で復元する', async () => {
    const first = renderHook(useAchievementCalculatorProgress)
    act(() =>
      first.result.current.setIdolValue(enums.IdolId.Lilja, enums.IdolAchievementMetric.SpecialTrainingStage7, 1),
    )
    await waitFor(() => {
      const saved = window.localStorage.getItem(constant.ACHIEVEMENT_CALCULATOR_STORAGE_KEY)
      expect(
        saved && JSON.parse(saved).idols[enums.IdolId.Lilja]?.[enums.IdolAchievementMetric.SpecialTrainingStage7],
      ).toBe(1)
    })
    first.unmount()
    const second = renderHook(useAchievementCalculatorProgress)
    expect(
      second.result.current.progress.idols[enums.IdolId.Lilja][enums.IdolAchievementMetric.SpecialTrainingStage7],
    ).toBe(1)
  })
})

/** 段階移動と長押しを組み合わせる最小の項目 */
function TrackerHarness() {
  const [value, setValue] = useState(0)
  return (
    <AchievementTrackerCard
      title="段階報酬"
      metric="回数"
      value={value}
      milestones={[
        { threshold: 10, exp: 100 },
        { threshold: 50, exp: 200 },
      ]}
      onValueChange={setValue}
    />
  )
}

describe('アチーブの段階移動', () => {
  it('長押しでも一回ずつ次・前の報酬段階へ移り、最大値で止まる', () => {
    vi.useFakeTimers()
    try {
      render(<TrackerHarness />)
      const plus = screen.getByRole('button', { name: '段階報酬を次の報酬まで進める' })
      fireEvent.pointerDown(plus)
      act(() => vi.advanceTimersByTime(constant.PRESS_REPEAT_DELAY_MS))
      expect(screen.getByRole('spinbutton').getAttribute('value')).toBe('10')
      act(() => vi.advanceTimersByTime(constant.PRESS_REPEAT_INTERVAL_MS))
      expect(screen.getByRole('spinbutton').getAttribute('value')).toBe('50')
      expect(plus.hasAttribute('disabled')).toBe(true)
      fireEvent.pointerUp(plus)
      const minus = screen.getByRole('button', { name: '段階報酬を前の報酬まで戻す' })
      fireEvent.pointerDown(minus)
      act(() => vi.advanceTimersByTime(constant.PRESS_REPEAT_DELAY_MS))
      expect(screen.getByRole('spinbutton').getAttribute('value')).toBe('10')
      act(() => vi.advanceTimersByTime(constant.PRESS_REPEAT_INTERVAL_MS))
      expect(screen.getByRole('spinbutton').getAttribute('value')).toBe('0')
      fireEvent.pointerUp(minus)
    } finally {
      cleanup()
      vi.useRealTimers()
    }
  })
})
