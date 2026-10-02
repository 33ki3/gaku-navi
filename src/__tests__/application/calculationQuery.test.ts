/**
 * 同じ計算条件で複数の条件を比較し、古い結果や中断を扱えることを検証する
 */
import { describe, expect, it } from 'vitest'
import { createCalculationDigest, createCalculationQuery } from '../../application/query/calculationQuery'
import * as constant from '../../constant'
import * as data from '../../data'
import { ApplicationOperationStatus, DomainIssueCode } from '../../types/application'
import type { CalculationRevision } from '../../types/calculation'
import * as enums from '../../types/enums'
import { createCalculationSnapshot } from '../../utils/calculationSnapshot'
import { createDefaultSettings } from '../../utils/scoreSettings'
import { createTestCardByName } from '../fixtures/cards'

const cardByName = createTestCardByName()

function createSnapshot() {
  const scoreSettings = createDefaultSettings()
  scoreSettings.useScheduleLimits = false
  scoreSettings.actionCounts = {
    [enums.ActionIdType.NormalLessonVo]: 3,
    [enums.ActionIdType.NormalLessonDa]: 0,
  }
  return createCalculationSnapshot({
    scoreSettings,
    unitSettings: constant.DEFAULT_UNIT_SIMULATOR_SETTINGS,
    cardUncaps: {},
    cardCountCustom: {},
    allCards: data.AllCards,
    cardByName,
  })
}

describe('CalculationQuery', () => {
  it('同じsnapshotから作るdigestは安定し、baselineの参照を共有しない', () => {
    const snapshot = createSnapshot()
    const query = createCalculationQuery(snapshot, { revision: 'revision-4' })

    expect(query.baseline.revision).toBe('revision-4')
    expect(query.baseline.digest).toBe(createCalculationDigest(snapshot))
    expect(query.baseline.snapshot).not.toBe(snapshot)
    expect(query.baseline.snapshot.scoreSettings).not.toBe(snapshot.scoreSettings)
  })

  it('variantを同じbaselineから独立して適用する', () => {
    const query = createCalculationQuery(createSnapshot())
    const first = query.applyVariant({
      scoreSettings: { actionCounts: { [enums.ActionIdType.NormalLessonVo]: 6 } },
    })
    const second = query.applyVariant({
      scoreSettings: { actionCounts: { [enums.ActionIdType.NormalLessonDa]: 5 } },
    })

    expect(first).not.toBeNull()
    expect(second).not.toBeNull()
    expect(query.baseline.snapshot.scoreSettings.actionCounts[enums.ActionIdType.NormalLessonVo]).toBe(3)
    expect(first?.scoreSettings.actionCounts[enums.ActionIdType.NormalLessonVo]).toBe(6)
    expect(first?.scoreSettings.actionCounts[enums.ActionIdType.NormalLessonDa]).toBe(0)
    expect(second?.scoreSettings.actionCounts[enums.ActionIdType.NormalLessonVo]).toBe(3)
    expect(second?.scoreSettings.actionCounts[enums.ActionIdType.NormalLessonDa]).toBe(5)
  })

  it('revisionまたはdigestが変わると結果をstaleとして返す', () => {
    const snapshot = createSnapshot()
    let current: CalculationRevision = { revision: 'revision-1', digest: createCalculationDigest(snapshot) }
    const query = createCalculationQuery(snapshot, {
      revision: current.revision,
      digest: current.digest,
      getCurrentRevision: () => current,
    })

    expect(query.getState()).toMatchObject({
      status: ApplicationOperationStatus.Complete,
      stale: false,
      revision: 'revision-1',
    })
    current = { revision: 'revision-2', digest: current.digest }
    expect(query.getState()).toMatchObject({
      status: ApplicationOperationStatus.Stale,
      stale: true,
      revision: 'revision-1',
    })

    current = { revision: 'revision-1', digest: 'd1-changed' }
    expect(query.getState()).toMatchObject({
      status: ApplicationOperationStatus.Stale,
      stale: true,
      revision: 'revision-1',
    })
  })

  it('AbortSignalが開始前に中断されていれば計算しない', () => {
    const controller = new AbortController()
    controller.abort()
    const query = createCalculationQuery(createSnapshot(), { revision: 'revision-2' })

    const result = query.compareCardScores(data.AllCards[0].name, [], { signal: controller.signal })

    expect(result).toMatchObject({ status: ApplicationOperationStatus.Aborted, stale: false, variants: [] })
  })

  it('不正variantだけを無効として返し、他variantを処理する', () => {
    const query = createCalculationQuery(createSnapshot())
    const result = query.compareCardScores(data.AllCards[0].name, [
      { label: '不正', patch: { unitSettings: { selectedCards: ['存在しないカード'] } } },
      { label: '正しい', patch: { scoreSettings: { actionCounts: {} } } },
    ])

    expect(result.status).toBe(ApplicationOperationStatus.Complete)
    expect(result.variants).toMatchObject([
      { label: '不正', valid: false, error: DomainIssueCode.InvalidVariant },
      { label: '正しい', valid: true },
    ])
  })
})
