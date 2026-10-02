/** 編成全体で丸めた評価結果と、合計・属性内訳の表示が一致することを検証する */
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import UnitResult from '../../../components/unitSimulator/UnitResult'
import * as constant from '../../../constant'
import * as data from '../../../data'
import type { SupportCard } from '../../../types/card'
import * as enums from '../../../types/enums'
import { createDefaultSettings, normalizeScoreSettingsDerived } from '../../../utils/scoreSettings'
import { evaluateManualUnit } from '../../../utils/unitSimulator'

const cards: SupportCard[] = [0, 1].map((index) => ({
  ...data.AllCards[0],
  name: `表示丸め確認${index}`,
  type: enums.CardType.Vocal,
  parameter_type: enums.ParameterType.Vocal,
  plan: enums.PlanType.Free,
  events: [],
  p_item: null,
  skill_card: null,
  abilities: [
    {
      name_key: enums.AbilityNameKeyType.ParameterBonus,
      trigger_key: enums.TriggerKeyType.VoParameterBonus,
      values: { '4': '10%' },
      is_parameter_bonus: true,
      is_percentage: true,
      parameter_type: enums.ParameterType.Vocal,
    },
  ],
}))

afterEach(cleanup)

describe('UnitResult', () => {
  it.each([
    { custom: true, cap: null },
    { custom: true, cap: 28 },
    { custom: false, cap: null },
  ])('カスタム=$custom・上限=$capの編成評価と合計・内訳が一致する', ({ custom, cap: paramCapOverride }) => {
    const scoreSettings = normalizeScoreSettingsDerived({
      ...createDefaultSettings(enums.ScenarioType.Hif),
      useCustomMode: custom,
      scheduleSelections: custom
        ? {}
        : { 2: enums.ActivityIdType.VoLesson, 4: enums.ActivityIdType.DaLesson, 3: enums.ActivityIdType.ClassVi },
      customParamBonusRows: [
        { vocal: 15, dance: 0, visual: 0 },
        { vocal: 15, dance: 0, visual: 0 },
      ],
      customClassBonus: { vocal: 0, dance: 0, visual: 0 },
      customNonBonusGain: { vocal: 0, dance: 0, visual: 0 },
    })
    const settings = {
      ...constant.DEFAULT_UNIT_SIMULATOR_SETTINGS,
      selectedCards: cards.map((card) => card.name),
      paramBonusPercent: { vocal: 5, dance: 0, visual: 0 },
      paramCapOverride,
    }
    const result = evaluateManualUnit({
      settings,
      scoreSettings,
      allCards: cards,
      cardByName: new Map(cards.map((card) => [card.name, card])),
      cardUncaps: {},
      excludedCardNames: [],
    })
    if (result === null) throw new Error('表示用の編成を評価できませんでした')
    // 個別ボーナス2+2と外部ボーナス1を足す方式では5になり、全体率25%の各回切り捨て6と異なる
    if (custom) {
      expect(result.parameterBonus.vocal).toBe(6)
      expect(result.totalScore).toBe(paramCapOverride ?? 36)
    }
    render(
      <UnitResult
        result={result}
        lockedCards={[]}
        customizedCardNames={new Set()}
        onToggleLock={vi.fn()}
        onRemove={vi.fn()}
        cardCountCustom={{}}
        onSelfTriggerChange={vi.fn()}
        onRemoveSelfTrigger={vi.fn()}
        onPItemCountChange={vi.fn()}
        onRemovePItemCount={vi.fn()}
        onClearCardCustom={vi.fn()}
        scenario={scoreSettings.scenario}
        difficulty={scoreSettings.difficulty}
        scheduleSelections={scoreSettings.scheduleSelections}
        useCustomMode={scoreSettings.useCustomMode}
        customClassBonus={scoreSettings.customClassBonus}
        customNonBonusGain={scoreSettings.customNonBonusGain}
        initialParams={settings.initialParams}
        paramCapOverride={paramCapOverride}
        selectedCards={settings.selectedCards}
        onStartSelect={vi.fn()}
        selectMode={false}
        isCalculating={false}
      />,
    )
    const header = screen.getByText('合計パラメータ上昇量').parentElement!.parentElement!
    expect(within(header).getByText(result.totalScore.toLocaleString())).toBeTruthy()
    fireEvent.click(screen.getByText('合計パラメータ上昇量'))
    const bonusRow = screen.getByText('パラボ').parentElement!
    expect(within(bonusRow).getByText(result.parameterBonus.vocal.toLocaleString())).toBeTruthy()
    const totalRow = screen.getByText('合計').parentElement!
    const displayedTotal = Array.from(totalRow.children)
      .slice(1)
      .reduce((sum, cell) => sum + Number(cell.textContent!.split('（')[0].replaceAll(',', '')), 0)
    expect(displayedTotal).toBe(result.totalScore)
    if (custom) expect(totalRow.children[1].textContent).toBe(paramCapOverride === null ? '36' : '28（-8）')
  })
})
