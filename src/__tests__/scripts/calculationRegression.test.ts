/** 計算観測をbase/headで比較し、seed付き条件をレポートへ残す */
import { describe, expect, it } from 'vitest'
import {
  type CalculationObservation,
  compareCalculationObservations,
  renderCalculationRegressionReport,
} from '../../../scripts/calculationRegression'

function observation(
  id: string,
  score: number,
  options: { scenarioHash?: string; randomProfile?: Record<string, unknown> } = {},
): CalculationObservation {
  return {
    id,
    description: `condition ${id}`,
    scenarioHash: options.scenarioHash ?? 'same-input',
    ...(options.randomProfile ? { semanticInput: { randomProfile: options.randomProfile } } : {}),
    calculation: { internal: { totalScore: score, selectedCards: ['card-a', 'card-b'] } },
  }
}

describe('計算回帰レポート', () => {
  it('一致したランダム条件もseedとprofileを記録する', () => {
    const profile = { seed: 'run-seed', sample: 1, plan: 'sense' }
    const report = compareCalculationObservations(
      new Map([['optimization-random-01', observation('optimization-random-01', 100, { randomProfile: profile })]]),
      new Map([['optimization-random-01', observation('optimization-random-01', 100, { randomProfile: profile })]]),
      { seed: 'run-seed', baseStatus: 'success', headStatus: 'success' },
    )

    const markdown = renderCalculationRegressionReport(report)

    expect(report.changes).toHaveLength(0)
    expect(report.randomizedProfiles).toEqual([
      { id: 'optimization-random-01', profile, baselinePresent: true, changed: false },
    ])
    expect(markdown).toContain('run-seed')
    expect(markdown).toContain('base/headの計算結果は一致しました。')
  })

  it('計算値の差分と入力条件の変更を別々に記録する', () => {
    const base = new Map([['optimization-random-01', observation('optimization-random-01', 100)]])
    const head = new Map([
      ['optimization-random-01', observation('optimization-random-01', 125, { scenarioHash: 'changed-input' })],
    ])

    const report = compareCalculationObservations(base, head, {
      seed: 'run-seed',
      baseStatus: 'success',
      headStatus: 'success',
    })

    expect(report.changes[0]).toMatchObject({
      id: 'optimization-random-01',
      inputChanged: true,
      baseScore: 100,
      headScore: 125,
    })
    expect(report.changes[0]?.changes).toContainEqual({
      path: 'totalScore',
      before: 100,
      after: 125,
      delta: 25,
    })
  })

  it('base/headに追加・削除された条件数を報告する', () => {
    const report = compareCalculationObservations(
      new Map([
        ['removed', observation('removed', 10)],
        ['shared', observation('shared', 20)],
      ]),
      new Map([
        ['added', observation('added', 30)],
        ['shared', observation('shared', 20)],
      ]),
      { seed: 'run-seed', baseStatus: 'success', headStatus: 'success' },
    )

    expect(report.newScenarioIds).toEqual(['added'])
    expect(report.removedScenarioIds).toEqual(['removed'])
    expect(report.comparedScenarioCount).toBe(1)
  })

  it('baseにないランダム条件を比較済みとして表示しない', () => {
    const report = compareCalculationObservations(
      new Map(),
      new Map([
        ['optimization-random-01', observation('optimization-random-01', 30, { randomProfile: { seed: 'run-seed' } })],
      ]),
      { seed: 'run-seed', baseStatus: 'success', headStatus: 'success' },
    )

    const markdown = renderCalculationRegressionReport(report)

    expect(report.randomizedProfiles[0]).toMatchObject({ baselinePresent: false, changed: true })
    expect(markdown).toContain('baseに比較条件がなく、head側の結果のみです。')
    expect(markdown).not.toContain('base/headの計算結果は一致しました。')
  })
})
