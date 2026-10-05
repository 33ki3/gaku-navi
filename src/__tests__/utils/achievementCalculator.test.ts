/** アチーブ計算機の段階報酬と獲得済みEXPの集計を検証する */
import { describe, expect, it } from 'vitest'
import * as constant from '../../constant'
import * as data from '../../data'
import ja from '../../i18n/locales/ja.json'
import * as enums from '../../types/enums'
import * as calculator from '../../utils/achievementCalculator'

describe('calculateAchievementProgress', () => {
  const milestones = [
    { threshold: 10, exp: 100 },
    { threshold: 20, exp: 200 },
  ]

  it('閾値の直前は報酬を加算せず、次の報酬までの値を返す', () => {
    expect(calculator.calculateAchievementProgress(milestones, 9)).toMatchObject({
      earnedExp: 0,
      remainingExp: 300,
      totalExp: 300,
      nextMilestone: milestones[0],
    })
  })

  it('閾値ちょうどでその段階のEXPを加算する', () => {
    expect(calculator.calculateAchievementProgress(milestones, 10)).toMatchObject({
      earnedExp: 100,
      remainingExp: 200,
      totalExp: 300,
      nextMilestone: milestones[1],
    })
  })

  it('すべての条件を満たすと獲得済みEXPが報酬の合計と一致する', () => {
    expect(calculator.calculateAchievementProgress(milestones, 100)).toMatchObject({
      earnedExp: 300,
      remainingExp: 0,
      totalExp: 300,
      nextMilestone: undefined,
    })
  })
})

describe('achievementCalculator data', () => {
  it('アチーブメント各カテゴリの段階報酬を合計できる', () => {
    const productionTotal = data.PRODUCTION_ACHIEVEMENTS.reduce(
      (total, tracker) => total + tracker.milestones.reduce((subtotal, milestone) => subtotal + milestone.exp, 0),
      0,
    )
    const idolTotal = data.IDOL_ACHIEVEMENTS.reduce(
      (total, idol) =>
        total +
        idol.trackers.reduce(
          (subtotal, tracker) =>
            subtotal +
            calculator.getIdolAchievementMilestones(tracker).reduce((exp, milestone) => exp + milestone.exp, 0),
          0,
        ),
      0,
    )
    const roadTotal = data.IDOL_ROAD_REWARD_MILESTONES.reduce((total, milestone) => total + milestone.exp, 0)

    expect(data.PRODUCTION_ACHIEVEMENTS).toHaveLength(33)
    expect(data.IDOL_ACHIEVEMENTS).toHaveLength(13)
    expect(data.P_IDOL_CARD_ACHIEVEMENTS).toHaveLength(6)
    expect(data.P_IDOL_CARD_ACHIEVEMENTS.reduce((total, tracker) => total + tracker.exp, 0)).toBe(7_750)
    expect(
      data.IDOL_ACHIEVEMENT_RULES[enums.IdolAchievementMetric.SpecialTrainingStages1To6].milestones.at(-1)?.exp,
    ).toBe(1_600)
    expect(data.IDOL_ACHIEVEMENT_RULES[enums.IdolAchievementMetric.SpecialTrainingStage7].milestones.at(-1)?.exp).toBe(
      2_600,
    )
    expect(productionTotal).toBe(1_163_650)
    expect(idolTotal).toBe(1_182_950)
    expect(roadTotal).toBe(329_000)
  })

  it('累計900の時点では910の3,000 EXPが次の報酬になる', () => {
    expect(calculator.calculateAchievementProgress(data.IDOL_ROAD_REWARD_MILESTONES, 900)).toMatchObject({
      earnedExp: 277_000,
      nextMilestone: { threshold: 910, exp: 3_000 },
    })
  })

  it('ゲーム画面で確認できたプロデュース項目の進捗目標を持つ', () => {
    const targets = Object.fromEntries(
      data.PRODUCTION_ACHIEVEMENTS.map(({ id, milestones }) => [id, milestones.at(-1)?.threshold]),
    )

    expect(targets).toMatchObject({
      p_points: 4_000_000,
      skill_cards_acquired: 90_000,
      stamina_spent: 600_000,
      productions: 4_000,
    })
  })
})

describe('画面の表記とマスタの整合性', () => {
  it('Pアイドルの6項目を指定された順番・名称で表示する', () => {
    const names = ja.achievement_calculator.achievement_name.p_idol_card
    expect(data.P_IDOL_CARD_ACHIEVEMENTS.map(({ id }) => names[id])).toEqual([
      '最終試験に合格',
      '特訓段階3にする',
      'クリア時評価A+以上',
      '特訓段階4にする',
      '特訓段階5にする',
      '特訓段階6にする',
    ])
  })

  it('クリア時の条件と回数の表記を揃える', () => {
    const metric = ja.achievement_calculator.metric
    expect(metric.production.rank_b).toBe('クリア時評価B以上')
    expect(metric.production.rank_s4_plus).toBe('クリア時評価S4+以上')
    expect(metric.idol.status_dance).toBe('クリア時ダンスパラメータ')
    expect(metric.idol.status_vocal).toBe('クリア時ボーカルパラメータ')
    expect(metric.idol.status_visual).toBe('クリア時ビジュアルパラメータ')
    expect(metric.idol.power_gained).toBe('元気獲得数')
    expect(metric.idol.drinks_used).toBe('Pドリンク使用数')
    expect(metric.idol.stamina_spent).toBe('合計体力消費数')
    expect(metric.production.stamina_spent).toBe('合計体力消費数')
  })

  it('各アイドルの項目が重複せず、特訓・ランクを個別に持つ', () => {
    for (const idol of data.IDOL_ACHIEVEMENTS) {
      expect(new Set(idol.trackers.map(({ metric }) => metric)).size).toBe(idol.trackers.length)
      expect(idol.trackers.some(({ metric }) => metric === enums.IdolAchievementMetric.SpecialTrainingStages1To6)).toBe(
        true,
      )
      expect(idol.trackers.some(({ metric }) => metric === enums.IdolAchievementMetric.RankB)).toBe(true)
    }
  })

  it('Pアイドルは各アイドルに存在し、カードを一意に識別して登場日の降順で並ぶ', () => {
    expect(new Set(data.P_IDOLS.map(({ id }) => id)).size).toBe(data.P_IDOLS.length)
    for (const idol of data.IDOL_ACHIEVEMENTS) expect(data.P_IDOLS.some(({ idolId }) => idolId === idol.id)).toBe(true)
    expect(data.P_IDOLS.map(({ releasedAt }) => releasedAt)).toEqual(
      data.P_IDOLS.map(({ releasedAt }) => releasedAt)
        .sort()
        .reverse(),
    )
  })

  it('アイドルへの道の上限をステージ数と最後の報酬から求める', () => {
    expect(constant.ROAD_MAX_STARS_PER_IDOL).toBe(constant.ROAD_STAGE_COUNT_PER_IDOL * constant.ROAD_STARS_PER_STAGE)
    expect(calculator.getAchievementRewardTarget(data.IDOL_ROAD_REWARD_MILESTONES)).toBe(
      data.IDOL_ROAD_REWARD_MILESTONES.at(-1)?.threshold,
    )
    expect(data.IDOL_ROAD_REWARD_MILESTONES.every(({ exp }) => exp > 0)).toBe(true)
  })
})

describe('PLvの必要EXP', () => {
  it('現在レベルをキーに次のレベルまでの必要EXPを参照できる', () => {
    expect(calculator.getProducerLevelExpRequirement(1)).toBe(40)
    expect(calculator.getProducerLevelExpRequirement(54)).toBe(70_000)
    expect(calculator.getProducerLevelExpRequirement(998)).toBe(70_000)
    expect(calculator.calculateProducerLevelFromEarnedExp(39)).toEqual({ currentLevel: 1, remainingExpToNextLevel: 1 })
    expect(calculator.calculateProducerLevelFromEarnedExp(40)).toEqual({
      currentLevel: 2,
      remainingExpToNextLevel: 120,
    })
    // PLv55以降の必要EXPを繰り返し加算し、設定上限を超えた現在PLvも求める
    const total = Array.from({ length: constant.PRODUCER_LEVEL_TARGET_MAX }, (_, index) => index + 1).reduce(
      (sum, level) => sum + calculator.getProducerLevelExpRequirement(level),
      0,
    )
    expect(calculator.calculateProducerLevelFromEarnedExp(total)).toEqual({
      currentLevel: constant.PRODUCER_LEVEL_TARGET_MAX + 1,
      remainingExpToNextLevel: 70_000,
    })
    expect(calculator.calculateProducerLevelProgress(1, 40, 2)).toEqual({
      nextLevelEarnedExp: 0,
      nextLevelRemainingExp: 40,
      nextLevelRequiredExp: 40,
      expToTargetLevel: 40,
      targetProgressPercent: 0,
    })
  })
})
