/**
 * ActionCountsSection の回帰テスト
 *
 * 複数スピナーの更新を保持し、短時間の反復入力をまとめて保存することを検証する。
 */
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { useState } from 'react'
import { I18nextProvider } from 'react-i18next'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ActionCountsSection } from '../../../components/scoreSettingsPanel/ActionCountsSection'
import i18n from '../../../i18n'
import type { ScoreSettings } from '../../../types/card'
import * as enums from '../../../types/enums'

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

beforeEach(() => vi.useFakeTimers())

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

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
    const pItem = getRowElements('Pアイテム獲得')

    expect(examPItem.input.value).toBe('1')
    expect(pItem.input.value).toBe('7')

    // 同一actで連続操作しても、後続更新が前更新を古いスナップショットで上書きしないこと
    act(() => {
      examPItem.minus.click()
      pItem.minus.click()
    })

    expect(getRowElements('試験後Pアイテム獲得').input.value).toBe('0')
    expect(getRowElements('Pアイテム獲得').input.value).toBe('6')

    act(() => vi.advanceTimersByTime(150))
  })

  it('保存待ち中に外部設定が確定したら古い回数を保存しない', async () => {
    const initial = { ...createTestSettings(), useScheduleLimits: false }
    const onSettingsChange = vi.fn()
    const onSettingsPreviewChange = vi.fn()
    const renderSection = (settings: ScoreSettings, persistedSettings: ScoreSettings) => (
      <I18nextProvider i18n={i18n}>
        <ActionCountsSection
          settings={settings}
          persistedSettings={persistedSettings}
          onSettingsPreviewChange={onSettingsPreviewChange}
          onSettingsChange={onSettingsChange}
          scheduleCounts={null}
          scheduleData={null}
        />
      </I18nextProvider>
    )
    const { rerender, unmount } = render(renderSection(initial, initial))
    fireEvent.click(getRowElements('Pアイテム獲得').plus)
    const preview = onSettingsPreviewChange.mock.calls[0]?.[0]
    rerender(renderSection(preview, initial))
    expect(getRowElements('Pアイテム獲得').input.valueAsNumber).toBe(1)

    const externalSettings = {
      ...initial,
      actionCounts: { ...initial.actionCounts, [enums.ActionIdType.PItemAcquire]: 42 },
    }
    rerender(renderSection(externalSettings, externalSettings))
    await act(async () => vi.advanceTimersByTimeAsync(200))
    expect(getRowElements('Pアイテム獲得').input.valueAsNumber).toBe(42)
    expect(onSettingsChange).not.toHaveBeenCalled()
    unmount()
    expect(onSettingsChange).not.toHaveBeenCalled()
  })

  it('保存済み設定の同値な再発行では保留入力を取り消さない', async () => {
    const initial = { ...createTestSettings(), useScheduleLimits: false }
    const onSettingsChange = vi.fn()
    const renderSection = (persistedSettings: ScoreSettings) => (
      <I18nextProvider i18n={i18n}>
        <ActionCountsSection
          settings={initial}
          persistedSettings={persistedSettings}
          onSettingsChange={onSettingsChange}
          scheduleCounts={null}
          scheduleData={null}
        />
      </I18nextProvider>
    )
    const { rerender } = render(renderSection(initial))
    fireEvent.click(getRowElements('Pアイテム獲得').plus)
    rerender(renderSection({ ...initial, actionCounts: { ...initial.actionCounts } }))
    await act(async () => vi.advanceTimersByTimeAsync(200))
    expect(onSettingsChange).toHaveBeenCalledTimes(1)
    expect(onSettingsChange.mock.calls[0]?.[0].actionCounts[enums.ActionIdType.PItemAcquire]).toBe(1)
  })

  it('自身のプレビューでは保存待ちを取り消さず最後の回数を保存する', async () => {
    const persistedSettings = { ...createTestSettings(), useScheduleLimits: false }
    const onSettingsChange = vi.fn()
    function PreviewWrapper() {
      const [settings, setSettings] = useState(persistedSettings)
      return (
        <I18nextProvider i18n={i18n}>
          <ActionCountsSection
            settings={settings}
            persistedSettings={persistedSettings}
            onSettingsPreviewChange={setSettings}
            onSettingsChange={onSettingsChange}
            scheduleCounts={null}
            scheduleData={null}
          />
        </I18nextProvider>
      )
    }
    render(<PreviewWrapper />)
    fireEvent.click(getRowElements('Pアイテム獲得').plus)
    fireEvent.click(getRowElements('Pアイテム獲得').plus)
    await act(async () => vi.advanceTimersByTimeAsync(200))
    expect(onSettingsChange).toHaveBeenCalledTimes(1)
    expect(onSettingsChange.mock.calls[0]?.[0].actionCounts[enums.ActionIdType.PItemAcquire]).toBe(2)
  })

  it('SPレッスン回数を連続操作すると最後の値をまとめて保存する', async () => {
    const settings = {
      ...createTestSettings(),
      useScheduleLimits: false,
      actionCounts: { [enums.ActionIdType.SpLessonVo]: 0 },
    }
    const onSettingsChange = vi.fn()

    render(
      <I18nextProvider i18n={i18n}>
        <ActionCountsSection
          settings={settings}
          onSettingsChange={onSettingsChange}
          scheduleCounts={null}
          scheduleData={null}
        />
      </I18nextProvider>,
    )

    const spLessonVo = getRowElements('SPレッスン(Vo)')
    for (let index = 0; index < 8; index += 1) fireEvent.click(spLessonVo.plus)

    expect(spLessonVo.input.value).toBe('8')
    expect(onSettingsChange).not.toHaveBeenCalled()

    await act(async () => vi.advanceTimersByTimeAsync(200))

    expect(onSettingsChange).toHaveBeenCalledTimes(1)
    expect(onSettingsChange.mock.calls[0]?.[0].actionCounts[enums.ActionIdType.SpLessonVo]).toBe(8)
  })
})
