/**
 * HIFの表示切替と主属性編集で、保存対象の副属性が失われないことを検証する
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ScheduleSection } from '../../../components/scoreSettingsPanel/ScheduleSection'
import * as data from '../../../data'
import i18n from '../../../i18n'
import type { ScoreSettings } from '../../../types/card'
import * as enums from '../../../types/enums'
import { createDefaultSettings } from '../../../utils/scoreSettings'

afterEach(cleanup)

function renderSchedule(hifLessonSplitSub: boolean) {
  const settings = {
    ...createDefaultSettings(enums.ScenarioType.Hif),
    scheduleSelections: { 2: enums.ActivityIdType.VoLessonVi },
    hifLessonSplitSub,
  }
  const onSettingsChange = vi.fn<(next: ScoreSettings) => void>()
  render(
    <I18nextProvider i18n={i18n}>
      <ScheduleSection
        settings={settings}
        onSettingsChange={onSettingsChange}
        resolvedDifficulty={enums.DifficultyType.None}
        scheduleData={data
          .getScheduleData(enums.ScenarioType.Hif, enums.DifficultyType.None)
          .filter((week) => week.week === 2)}
        scheduleCounts={null}
        isOpen
        onToggle={() => undefined}
      />
    </I18nextProvider>,
  )
  return onSettingsChange
}

describe('HIFの選択保持', () => {
  it('主属性のみへ表示を切り替えても保存対象のペアを変えない', () => {
    const onSettingsChange = renderSchedule(false)
    fireEvent.click(screen.getByRole('checkbox', { name: i18n.t('ui.settings.hif_lesson_split_sub') }))
    expect(onSettingsChange).toHaveBeenCalledWith(
      expect.objectContaining({
        hifLessonSplitSub: true,
        scheduleSelections: { 2: enums.ActivityIdType.VoLessonVi },
      }),
    )
  })

  it('主属性を変更しても非表示の副属性を維持する', () => {
    const onSettingsChange = renderSchedule(true)
    fireEvent.click(screen.getByRole('button', { name: i18n.t('score.activity.da_lesson') }))
    expect(onSettingsChange).toHaveBeenCalledWith(
      expect.objectContaining({
        scheduleSelections: { 2: enums.ActivityIdType.DaLessonVi },
      }),
    )
  })
})
