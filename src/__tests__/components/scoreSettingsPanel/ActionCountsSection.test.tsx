/**
 * ActionCountsSection の回帰テスト
 *
 * 複数スピナーを同一フレームで連続操作したとき、
 * 後続更新が古い設定スナップショットで前更新を上書きしないことを検証する。
 */
import { act, render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { I18nextProvider } from 'react-i18next'
import { useState } from 'react'
import i18n from '../../../i18n'
import { ActionCountsSection } from '../../../components/scoreSettingsPanel/ActionCountsSection'
import * as enums from '../../../types/enums'
import type { ScoreSettings } from '../../../types/card'

function createTestSettings(): ScoreSettings {
  return {
    name: 'test',
    scenario: enums.ScenarioType.Hajime,
    difficulty: enums.DifficultyType.Legend,
    parameterBonusBase: { vocal: 0, dance: 0, visual: 0 },
    actionCounts: {},
    scheduleSelections: {},
    useScheduleLimits: true,
    includeSelfTrigger: true,
    includePItem: true,
    useFixedUncap: false,
    useCustomMode: false,
    customParamBonusRows: [{ vocal: 0, dance: 0, visual: 0 }],
    customClassBonus: { vocal: 0, dance: 0, visual: 0 },
    customNonBonusGain: { vocal: 0, dance: 0, visual: 0 },
    hifExamRatios: [
      { vocal: 0, dance: 0, visual: 0 },
      { vocal: 0, dance: 0, visual: 0 },
      { vocal: 0, dance: 0, visual: 0 },
    ],
    hifLessonSplitSub: true,
  }
}

function getRowElements(label: string) {
  const labelNode = screen.getByText(label)
  const row = labelNode.parentElement?.parentElement
  if (!row) throw new Error(`row not found: ${label}`)
  return {
    plus: within(row).getByRole('button', { name: '+' }),
    minus: within(row).getByRole('button', { name: '−' }),
    input: within(row).getByRole('spinbutton') as HTMLInputElement,
  }
}

function TestWrapper() {
  const [settings, setSettings] = useState<ScoreSettings>(() => {
    const base = createTestSettings()
    return {
      ...base,
      useCustomMode: true,
      useScheduleLimits: false,
      actionCounts: {
        [enums.ActionIdType.PItemAcquire]: 7,
        [enums.ActionIdType.ExamPItemAcquire]: 1,
      },
    }
  })

  return (
    <I18nextProvider i18n={i18n}>
      <ActionCountsSection
        settings={settings}
        onSettingsChange={setSettings}
        scheduleCounts={null}
        scheduleData={null}
      />
    </I18nextProvider>
  )
}

describe('ActionCountsSection', () => {
  it('複数スピナーの連続更新で値が逆転しない', () => {
    render(<TestWrapper />)

    const examPItem = getRowElements('試験後Pアイテム獲得')
    const pItem = getRowElements('Pアイテム獲得（試験後を除く）')

    expect(examPItem.input.value).toBe('1')
    expect(pItem.input.value).toBe('7')

    // 同一actで連続操作しても、後続更新が前更新を古いスナップショットで上書きしないこと
    act(() => {
      examPItem.minus.click()
      pItem.minus.click()
    })

    expect(getRowElements('試験後Pアイテム獲得').input.value).toBe('0')
    expect(getRowElements('Pアイテム獲得（試験後を除く）').input.value).toBe('6')
  })
})
