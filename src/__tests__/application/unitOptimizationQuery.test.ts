/**
 * 同じ計算条件で最適編成を比較し、古い結果や中断を扱えることを検証する
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createCalculationDigest } from '../../application/query/calculationQuery'
import { createUnitOptimizationQuery } from '../../application/query/unitOptimizationQuery'
import { runUnitOptimizer } from '../../application/unitOptimizerRunner'
import * as constant from '../../constant'
import * as data from '../../data'
import { ApplicationOperationStatus, DomainIssueCode } from '../../types/application'
import type { CalculationRevision } from '../../types/calculation'
import * as enums from '../../types/enums'
import { createCalculationSnapshot } from '../../utils/calculationSnapshot'
import { createDefaultSettings } from '../../utils/scoreSettings'
import { createTestCardByName } from '../fixtures/cards'

const cardByName = createTestCardByName()

vi.mock('../../application/unitOptimizerRunner', () => ({
  runUnitOptimizer: vi.fn(),
}))

function createSnapshot() {
  return createCalculationSnapshot({
    scoreSettings: createDefaultSettings(),
    unitSettings: constant.DEFAULT_UNIT_SIMULATOR_SETTINGS,
    cardUncaps: {},
    cardCountCustom: {},
    allCards: data.AllCards,
    cardByName,
  })
}

describe('UnitOptimizationQuery', () => {
  const mockedRun = vi.mocked(runUnitOptimizer)

  beforeEach(() => {
    mockedRun.mockReset()
    mockedRun.mockResolvedValue({ status: ApplicationOperationStatus.Complete, result: null })
  })

  it('全variantを同じbaselineから独立してrunnerへ渡す', async () => {
    const query = createUnitOptimizationQuery(createSnapshot(), { revision: 'revision-8' })
    const result = await query.compare([
      { label: 'Vo初期値', patch: { unitSettings: { initialParams: { vocal: 10, dance: 0, visual: 0 } } } },
      { label: 'Da初期値', patch: { unitSettings: { initialParams: { vocal: 0, dance: 20, visual: 0 } } } },
    ])

    expect(result).toMatchObject({
      status: ApplicationOperationStatus.Complete,
      revision: 'revision-8',
      stale: false,
      variants: [
        { label: 'Vo初期値', valid: true, result: null },
        { label: 'Da初期値', valid: true, result: null },
      ],
    })
    expect(mockedRun).toHaveBeenCalledTimes(2)
    expect(mockedRun.mock.calls[0][0].input.settings.initialParams).toEqual({ vocal: 10, dance: 0, visual: 0 })
    expect(mockedRun.mock.calls[1][0].input.settings.initialParams).toEqual({ vocal: 0, dance: 20, visual: 0 })
    expect(query.baseline.snapshot.unitSettings.initialParams).toEqual({ vocal: 0, dance: 0, visual: 0 })
  })

  it('不正variantはrunnerを起動せず、その後のvariantは処理する', async () => {
    const query = createUnitOptimizationQuery(createSnapshot())
    const result = await query.compare([
      { label: '不正', patch: { unitSettings: { lockedCards: ['存在しないカード'] } } },
      { label: '正しい', patch: { unitSettings: { initialParams: { vocal: 10, dance: 0, visual: 0 } } } },
    ])

    expect(result.variants).toMatchObject([
      { label: '不正', valid: false, error: DomainIssueCode.InvalidVariant },
      { label: '正しい', valid: true, result: null },
    ])
    expect(mockedRun).toHaveBeenCalledTimes(1)
  })

  it('探索中にrevisionが変わったら結果をstaleとして返す', async () => {
    const snapshot = createSnapshot()
    let current: CalculationRevision = { revision: 'revision-3', digest: createCalculationDigest(snapshot) }
    mockedRun.mockImplementation(async () => {
      current = { revision: 'revision-4', digest: current.digest }
      return { status: ApplicationOperationStatus.Complete, result: null }
    })
    const query = createUnitOptimizationQuery(snapshot, {
      revision: current.revision,
      digest: current.digest,
      getCurrentRevision: () => current,
    })

    const result = await query.compare([{ patch: {} }])

    expect(result).toMatchObject({
      status: ApplicationOperationStatus.Stale,
      stale: true,
      revision: 'revision-3',
      variants: [],
    })
  })

  it('開始前のAbortSignalでrunnerを起動しない', async () => {
    const controller = new AbortController()
    controller.abort()
    const query = createUnitOptimizationQuery(createSnapshot())

    const result = await query.compare([{ patch: {} }], { signal: controller.signal })

    expect(result).toMatchObject({ status: ApplicationOperationStatus.Aborted, stale: false, variants: [] })
    expect(mockedRun).not.toHaveBeenCalled()
  })

  it('runnerのAbortSignal中断を比較結果へ反映する', async () => {
    mockedRun.mockResolvedValue({ status: ApplicationOperationStatus.Aborted, result: null })
    const query = createUnitOptimizationQuery(createSnapshot())

    const result = await query.compare([{ patch: {} }], { signal: new AbortController().signal })

    expect(result.status).toBe(ApplicationOperationStatus.Aborted)
    expect(result.variants).toEqual([])
  })

  it('variant完了直後のAbortSignalでも途中結果を返さない', async () => {
    const controller = new AbortController()
    mockedRun.mockImplementationOnce(async () => {
      controller.abort()
      return { status: ApplicationOperationStatus.Complete, result: null }
    })
    const query = createUnitOptimizationQuery(createSnapshot())

    const result = await query.compare([{ patch: {} }, { patch: {} }], { signal: controller.signal })

    expect(result).toMatchObject({ status: ApplicationOperationStatus.Aborted, stale: false, variants: [] })
    expect(mockedRun).toHaveBeenCalledTimes(1)
  })

  it('scoreSettingsのvariantもapplication runnerへ同じsnapshotから渡す', async () => {
    const query = createUnitOptimizationQuery(createSnapshot())
    await query.compare([
      {
        patch: {
          scoreSettings: {
            useScheduleLimits: false,
            actionCounts: { [enums.ActionIdType.NormalLessonVo]: 1 },
          },
        },
      },
    ])

    expect(mockedRun).toHaveBeenCalledTimes(1)
    expect(mockedRun.mock.calls[0][0].input.scoreSettings.useScheduleLimits).toBe(false)
  })
})
