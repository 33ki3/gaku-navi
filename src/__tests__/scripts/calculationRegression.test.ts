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
  options: {
    description?: string
    scenarioHash?: string
    randomProfile?: Record<string, unknown>
    selectedCards?: string[]
    lineup?: {
      totalScore: number
      members: Array<{
        name: string
        parameterType: string
        uncap: number
        isRental: boolean
        cardScore: number
      }>
    }
  } = {},
): CalculationObservation {
  return {
    id,
    description: options.description ?? `condition ${id}`,
    scenarioHash: options.scenarioHash ?? 'same-input',
    ...(options.randomProfile ? { semanticInput: { randomProfile: options.randomProfile } } : {}),
    calculation: {
      internal: { totalScore: score, selectedCards: options.selectedCards ?? ['card-a', 'card-b'] },
    },
    ...(options.lineup ? { lineup: options.lineup } : {}),
  }
}

describe('計算回帰レポート', () => {
  it('一致したランダム条件もseedとprofileを記録する', () => {
    const profile = {
      seed: 'run-seed',
      sample: 1,
      plan: 'sense',
      lessonCounts: { vocal: 7, dance: 1, visual: 0 },
      scheduleSelections: { 2: 'vo_lesson' },
      paramBonusPercent: { vocal: 30, dance: 25, visual: 40 },
    }
    const lineup = {
      totalScore: 100,
      members: [
        { name: 'ダンスカード', parameterType: 'dance', uncap: 4, isRental: false, cardScore: 240 },
        { name: 'ボーカルカード', parameterType: 'vocal', uncap: 4, isRental: false, cardScore: 210 },
      ],
    }
    const report = compareCalculationObservations(
      new Map([
        ['optimization-random-01', observation('optimization-random-01', 100, { randomProfile: profile, lineup })],
      ]),
      new Map([
        ['optimization-random-01', observation('optimization-random-01', 100, { randomProfile: profile, lineup })],
      ]),
      { seed: 'run-seed', baseStatus: 'success', headStatus: 'success' },
    )

    const markdown = renderCalculationRegressionReport(report)

    expect(report.changes).toHaveLength(0)
    expect(report.comparedScenarios[0]?.plan).toBe('Sense')
    expect(report.randomizedProfiles[0]).toMatchObject({
      id: 'optimization-random-01',
      description: 'condition optimization-random-01',
      profile,
      plan: 'Sense',
      baseScore: 100,
      headScore: 100,
      baseLineup: lineup,
      headLineup: lineup,
      inputChanged: false,
      baselinePresent: true,
      changed: false,
    })
    expect(markdown).toContain('run-seed')
    expect(markdown).toContain('| 状態 | 条件 | プラン | Base総合点 | Head総合点 | 差 |')
    expect(markdown).toContain('✅ 一致')
    expect(markdown).toContain('Base / Head共通の最適編成（アプリの結果）')
    expect(markdown).toContain('| Vo | ボーカルカード | 4凸 | 210 |')
    expect(markdown).toContain('条件設定:')
    expect(markdown).toContain('レッスン配分 Vo7・Da1')
    expect(markdown).toContain('パラメータボーナス Vo 30%・Da 25%・Vi 40%')
    expect(markdown).toContain('"scheduleSelections"')
    expect(markdown).toContain('<summary>再現用プロフィール（JSON）</summary>')
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
    expect(report.newScenarioResults).toMatchObject([{ id: 'added', headScore: 30 }])
    expect(report.removedScenarioIds).toEqual(['removed'])
    expect(report.comparedScenarioCount).toBe(1)
    expect(renderCalculationRegressionReport(report)).not.toContain('編成データがありません。')
  })

  it('計算差分とHIF条件のbase/head編成を表示する', () => {
    const id = 'optimization-hif-vo7-da1'
    const baseLineup = {
      totalScore: 100,
      members: [
        { name: 'Base Vo', parameterType: 'vocal', uncap: 2, isRental: false, cardScore: 240 },
        { name: 'Base Da', parameterType: 'dance', uncap: 2, isRental: false, cardScore: 210 },
      ],
    }
    const headLineup = {
      totalScore: 125,
      members: [
        { name: 'Voカード', parameterType: 'vocal', uncap: 4, isRental: false, cardScore: 320 },
        { name: 'Daカード', parameterType: 'dance', uncap: 3, isRental: true, cardScore: 280 },
      ],
    }
    const report = compareCalculationObservations(
      new Map([
        [
          id,
          observation(id, 100, {
            description: 'HIF / Vo7・Da1 / Sense',
            selectedCards: ['Base Vo', 'Base Da'],
            lineup: baseLineup,
          }),
        ],
      ]),
      new Map([
        [
          id,
          observation(id, 125, {
            description: 'HIF / Vo7・Da1 / Sense',
            selectedCards: ['Voカード', 'Daカード'],
            lineup: headLineup,
          }),
        ],
      ]),
      { seed: 'run-seed', baseStatus: 'success', headStatus: 'success' },
    )

    const markdown = renderCalculationRegressionReport(report)

    expect(markdown).toContain('# 計算回帰テスト')
    expect(markdown).toContain('| HIF / Vo7・Da1 | Sense |')
    expect(markdown).toContain('最適編成（Base / アプリの結果）')
    expect(markdown).toContain('| Vo | Base Vo | 2凸 | 240 |')
    expect(markdown).toContain('最適編成（Head / アプリの結果）')
    expect(markdown).toContain('| Vo | Voカード | 4凸 | 320 |')
    expect(markdown).toContain('| Da | Daカード | 3凸（レンタル） | 280 |')
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
    expect(markdown).toContain('Baseに比較条件がありません。Headの結果を表示します。')
    expect(markdown).not.toContain('BaseとHeadの計算結果は一致しました。')
  })
})
