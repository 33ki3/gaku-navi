/** 端末別差分の代表選択と、画像を省略した場合のテキスト表示を検証する */
import { describe, expect, it } from 'vitest'
import {
  createImageCell,
  describeValidationOutcome,
  describeVisualOutcome,
  formatOmittedVisualChange,
  selectVisualChangesForComment,
} from '../../../scripts/regressionSummary'
import { RegressionDevice, selectRepresentativeDeviceChanges } from '../../../scripts/regressionShared'

describe('回帰差分のPRコメント表示', () => {
  it('画面差分と検証結果を独立して表示する', () => {
    expect(
      describeVisualOutcome({
        reportAvailable: true,
        baselineAvailable: true,
        totalVisualComparisonCount: 78,
        totalVisualChangeCount: 13,
      }),
    ).toBe('⚠️ 差分あり: 13件')
    expect(describeValidationOutcome('success')).toBe('✅ 成功')
    expect(describeValidationOutcome('failure')).toBe('❌ 失敗')
  })

  it('コメント本文ファイル相対の添付画像パスを生成する', () => {
    expect(createImageCell('images/scenario/desktop/base.png', 'Base', true)).toBe(
      '![Base](images/scenario/desktop/base.png)',
    )
    expect(createImageCell('images/scenario/desktop/diff.png', '差分（赤）', true)).toBe(
      '![差分（赤）](images/scenario/desktop/diff.png)',
    )
  })

  it('PC差分があるシナリオではPCを代表にし、それ以外はiOSを代表にする', () => {
    const changes = [
      { scenarioId: 'shared', device: RegressionDevice.Desktop },
      { scenarioId: 'shared', device: RegressionDevice.IPhone },
      { scenarioId: 'shared', device: RegressionDevice.Android },
      { scenarioId: 'mobile', device: RegressionDevice.IPhone },
      { scenarioId: 'mobile', device: RegressionDevice.Android },
      { scenarioId: 'android-only', device: RegressionDevice.Android },
    ]

    expect(selectRepresentativeDeviceChanges(changes)).toEqual([changes[0], changes[3], changes[5]])
  })

  it('代表端末画像へまとめた差分も、端末名と差分率をテキストで残す', () => {
    const line = formatOmittedVisualChange({
      change: {
        scenarioId: 'filter-sort-actions',
        description: '一覧の並び順とフィルターを切り替える',
        device: RegressionDevice.IPhone,
        changedPixels: 1234,
        changedRatio: 0.04,
      },
      reason: 'representative-device',
    })

    expect(line).toContain('一覧の並び順とフィルターを切り替える')
    expect(line).not.toContain('filter-sort-actions')
    expect(line).toContain('iOS')
    expect(line).toContain('4.00%')
    expect(line).toContain('1,234 px')
    expect(line).toContain('代表端末画像に集約')
  })

  it('Base/Head画像は25組までにし、添付上限を超えた差分をテキスト対象へ回す', () => {
    const changes = Array.from({ length: 27 }, (_, index) => ({
      scenarioId: `scenario-${index + 1}`,
      device: RegressionDevice.Desktop,
      changedRatio: 0.01,
    }))

    const selection = selectVisualChangesForComment(changes)

    expect(selection.attachedChanges).toHaveLength(25)
    expect(selection.omittedVisualChanges).toHaveLength(2)
    expect(selection.omittedVisualChanges.every(({ reason }) => reason === 'attachment-limit')).toBe(true)
  })

  it('差分画像がある場合はBase/Headを含めた添付枚数を50枚以内に収める', () => {
    const changes = Array.from({ length: 17 }, (_, index) => ({
      scenarioId: `scenario-${index + 1}`,
      device: RegressionDevice.Desktop,
      diffScreenshot: `visual-diff/desktop/scenario-${index + 1}.png`,
    }))

    const selection = selectVisualChangesForComment(changes)

    expect(selection.attachedChanges).toHaveLength(16)
    expect(selection.omittedVisualChanges).toHaveLength(1)
    expect(selection.omittedVisualChanges[0]?.reason).toBe('attachment-limit')
  })
})
