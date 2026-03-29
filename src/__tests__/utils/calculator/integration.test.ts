/**
 * 点数計算統合テスト
 *
 * 実際のカードデータとスケジュールを使って点数を検証する。
 * アビリティが満遍なくカバーされるようカードを選出し、
 * 計算結果を手計算の期待値と照合する。
 */
import { describe, expect, it } from 'vitest'
import { AllCards } from '../../../data'
import { getScheduleData } from '../../../data/score'
import { calculateCardParameter } from '../../../utils/calculator/calculateCard'
import { calculateParameterBonusFromSchedule, getPerLessonParameterValues } from '../../../utils/calculator/parameterBonus'
import { mergeScheduleCounts } from '../../../utils/scoreSettings'
import type { SupportCard, ScoreSettings } from '../../../types/card'
import type { ActionIdType } from '../../../types/enums'
import * as enums from '../../../types/enums'

// --- 実カードデータ（AllCards から取得） ---

/** 名前でカードを検索し、見つからない場合はエラーにする */
function findCard(name: string): SupportCard {
  const card = AllCards.find(c => c.name === name)
  if (!card) throw new Error(`カードが見つかりません: ${name}`)
  return card
}

const imageTraining = findCard('いめーじとれーにんぐ')
const hitamukiLesson = findCard('ひたむき居残りレッスン')
const niMeiSama = findCard('2名様、ご案内～♪')
const gutsugutsu = findCard('ぐつぐつ、いいにおい♪')
const atashiNoKachi = findCard('あたしの勝ち、ですね～！')
const oshikatsu = findCard('推し活なひととき、だね！')
const oshiro = findCard('これは――お城ッ！！')
const hitorigoto = findCard('ひとりごとです')

// --- テスト用ヘルパー ---

const emptyActions: Partial<Record<ActionIdType, number>> = {}
const emptyExtra: Partial<Record<ActionIdType, number>> = {}
const zeroBonusBase = { vocal: 0, dance: 0, visual: 0 }

// --- 統合テスト: 手計算の期待値と照合 ---

/** 実カードデータとアクション回数を使った手計算との照合テスト */
describe('統合テスト: 実カード × アクション回数', () => {
  it('いめーじとれーにんぐ (R/Vocal) 凸4: lesson×5 + bonusBase500', () => {
    // parameter_bonus: 4.3%, lesson_end: 3, event_boost: 100%
    // event param_boost: 10 → 10 * 2.0 = 20
    // lesson_end: 3 * 5 = 15
    // parameter_bonus: floor(500 * 4.3 / 100) = floor(21.5) = 21
    // total = 20 + 15 + 21 = 56
    const actions = { [enums.ActionIdType.LessonVo]: 5 }
    const bonusBase = { vocal: 500, dance: 0, visual: 0 }
    const result = calculateCardParameter(imageTraining, enums.UncapType.Four, actions, emptyExtra, bonusBase)

    expect(result.eventBoost).toBe(20)
    expect(result.eventBoostPercent).toBe(100)
    expect(result.parameterBonus).toBe(21)
    expect(result.paramBonusPercent).toBeCloseTo(4.3)
    expect(result.totalIncrease).toBe(56)
  })

  it('いめーじとれーにんぐ (R/Vocal) 凸0: lesson×5 + bonusBase500', () => {
    // event_boost: "" → 0% → multiplier 1.0
    // event param_boost: 10 * 1.0 = 10
    // lesson_end: 1 * 5 = 5
    // parameter_bonus: floor(500 * 2.8 / 100) = floor(14) = 14
    // total = 10 + 5 + 14 = 29
    const actions = { [enums.ActionIdType.LessonVo]: 5 }
    const bonusBase = { vocal: 500, dance: 0, visual: 0 }
    const result = calculateCardParameter(imageTraining, enums.UncapType.Zero, actions, emptyExtra, bonusBase)

    expect(result.eventBoost).toBe(10)
    expect(result.eventBoostPercent).toBe(0)
    expect(result.parameterBonus).toBe(14)
    expect(result.totalIncrease).toBe(29)
  })

  it('ひたむき居残りレッスン (R/Visual) 凸4: lesson×5 + activity_supply_gift×2', () => {
    // initial_stat: 33 (fixed 1 count)
    // normal_lesson_end: 9 * 5 = 45
    // activity_supply_gift: 8 * 2 = 16
    // event_boost: 100% → multiplier 2.0
    // event param_boost: 10 * 2.0 = 20
    // total = 20 + 33 + 45 + 16 = 114
    const actions = {
      [enums.ActionIdType.Lesson]: 5,
      [enums.ActionIdType.NormalLessonVi]: 5,
      [enums.TriggerKeyType.ActivitySupplyGift]: 2,
    }
    const result = calculateCardParameter(hitamukiLesson, enums.UncapType.Four, actions, emptyExtra, zeroBonusBase)

    expect(result.parameterType).toBe(enums.ParameterType.Visual)
    expect(result.eventBoost).toBe(20)
    expect(result.totalIncrease).toBe(114)
  })

  it('ひたむき居残りレッスン (R/Visual) 凸0: アクションなし', () => {
    // initial_stat: 23 (fixed 1 count)
    // event_boost: "" → 0% → event 10 * 1.0 = 10
    // total = 10 + 23 = 33
    const result = calculateCardParameter(hitamukiLesson, enums.UncapType.Zero, emptyActions, emptyExtra, zeroBonusBase)
    expect(result.totalIncrease).toBe(33)
  })

  it('2名様、ご案内～♪ (SR/Vocal) 凸4: outing×3 + lesson×5 + enhance×4 + PDrink×2', () => {
    // initial_stat: 49, outing: 10*3=30, skill_enhance: 3*4=12
    // event_boost: 100% → 15 * 2.0 = 30
    // p_item boost (vitality_card_acquire): 6 * 2 = 12
    // total = 30 + 49 + 30 + 12 + 12 = 133
    const actions = {
      [enums.TriggerKeyType.Outing]: 3,
      [enums.ActionIdType.Lesson]: 5,
      [enums.TriggerKeyType.SkillEnhance]: 4,
      [enums.TriggerKeyType.VitalityCardAcquire]: 2,
    }
    const result = calculateCardParameter(niMeiSama, enums.UncapType.Four, actions, emptyExtra, zeroBonusBase)

    expect(result.eventBoost).toBe(30)
    expect(result.totalIncrease).toBe(133)
  })

  it('ぐつぐつ、いいにおい♪ (SR/Vocal) 凸4: max_count制限 + 複数トリガー', () => {
    // initial_stat: 49, sp_lesson_20: 15*min(6,4)=60, activity_supply_gift: 11*2=22
    // change: 16*min(5,3)=48, event_boost: 100% → 15*2.0=30
    // total = 30 + 49 + 60 + 22 + 48 = 209
    const actions = {
      [enums.TriggerKeyType.SpLesson20]: 6,
      [enums.TriggerKeyType.ActivitySupplyGift]: 2,
      [enums.TriggerKeyType.Change]: 5,
    }
    const result = calculateCardParameter(gutsugutsu, enums.UncapType.Four, actions, emptyExtra, zeroBonusBase)

    expect(result.eventBoost).toBe(30)
    // sp_lesson_20 は max_count:4 で制限
    const spLesson = result.abilityBoosts.find(b => b.nameKey === enums.AbilityNameKeyType.SpLesson20)
    expect(spLesson?.count).toBe(4)
    expect(spLesson?.total).toBe(60)
    // change は max_count:3 で制限
    const change = result.abilityBoosts.find(b => b.nameKey === enums.AbilityNameKeyType.Change)
    expect(change?.count).toBe(3)
    expect(change?.total).toBe(48)
    expect(result.totalIncrease).toBe(209)
  })

  it('あたしの勝ち、ですね～！ (SSR/Visual) 凸4: SSR自己発火 + card_enhance', () => {
    // initial_stat: 65 (fixed 1 count)
    // activity_supply_gift: 17 * 3 = 51
    // ssr_card_acquire: selfTrigger → +1 (SSR+SkillCard event)
    //   → 6 * (2 + 0 + 1) = 6 * 3 = 18
    // event_boost: 100% → multiplier 2.0
    // event param_boost: 20 * 2.0 = 40
    // total = 40 + 65 + 51 + 18 = 174
    const actions = {
      [enums.TriggerKeyType.ActivitySupplyGift]: 3,
      [enums.TriggerKeyType.SsrCardAcquire]: 2,
    }
    const result = calculateCardParameter(atashiNoKachi, enums.UncapType.Four, actions, emptyExtra, zeroBonusBase, true)

    expect(result.parameterType).toBe(enums.ParameterType.Visual)
    expect(result.eventBoost).toBe(40)
    // SSR自己発火で +1 されている
    const ssrAcquire = result.abilityBoosts.find(b => b.nameKey === enums.AbilityNameKeyType.SsrCardAcquire)
    expect(ssrAcquire?.count).toBe(3)
    expect(ssrAcquire?.total).toBe(18)
    expect(result.totalIncrease).toBe(174)
  })

  it('あたしの勝ち、ですね～！ (SSR/Visual) 凸4: 自己発火OFF', () => {
    // same as above but includeSelfTrigger = false
    // ssr_card_acquire: 6 * 2 = 12 (no selfTrigger)
    // total = 40 + 65 + 51 + 12 = 168
    const actions = {
      [enums.TriggerKeyType.ActivitySupplyGift]: 3,
      [enums.TriggerKeyType.SsrCardAcquire]: 2,
    }
    const result = calculateCardParameter(atashiNoKachi, enums.UncapType.Four, actions, emptyExtra, zeroBonusBase, false)

    const ssrAcquire = result.abilityBoosts.find(b => b.nameKey === enums.AbilityNameKeyType.SsrCardAcquire)
    expect(ssrAcquire?.count).toBe(2)
    expect(result.totalIncrease).toBe(168)
  })
})

// --- 統合テスト: スケジュール → パラメータボーナス → 点数計算 ---

/** スケジュール選択からパラメータボーナス算出・点数計算までの一気通貫テスト */
describe('統合テスト: スケジュール → パラメータボーナス → 点数計算', () => {
  it('Hajime/Legend: Vo×3週 → いめーじとれーにんぐの parameter_bonus', () => {
    // Hajime/Legend weeks: 4(140,55), 7(180,60), 12(260,70)
    // Vocal 選択 → vocal = 140+180+260 = 580
    const selections: Record<number, enums.ActivityIdType> = {
      4: enums.ActivityIdType.VoLesson,
      7: enums.ActivityIdType.VoLesson,
      12: enums.ActivityIdType.VoLesson,
    }
    const bonusBase = calculateParameterBonusFromSchedule(
      selections,
      enums.ScenarioType.Hajime,
      enums.DifficultyType.Legend,
    )
    expect(bonusBase.vocal).toBe(580)

    // いめーじとれーにんぐ (uncap4): parameter_bonus 4.3%
    // floor(580 * 4.3 / 100) = floor(24.94) = 24
    // lesson_end: 3 * 3 = 9
    // event_boost: 100% → 10 * 2.0 = 20
    // total = 20 + 9 + 24 = 53
    const actions = { [enums.ActionIdType.LessonVo]: 3 }
    const result = calculateCardParameter(imageTraining, enums.UncapType.Four, actions, emptyExtra, bonusBase)

    expect(result.parameterBonus).toBe(24)
    expect(result.totalIncrease).toBe(53)
  })

  it('Hajime/Legend: Vi×2週 → ひたむき居残りレッスンの visual bonusBase', () => {
    // Vi 選択: week 4(140,55), week 7(180,60) → visual = 140+180 = 320
    const selections: Record<number, enums.ActivityIdType> = {
      4: enums.ActivityIdType.ViLesson,
      7: enums.ActivityIdType.ViLesson,
    }
    const bonusBase = calculateParameterBonusFromSchedule(
      selections,
      enums.ScenarioType.Hajime,
      enums.DifficultyType.Legend,
    )
    expect(bonusBase.visual).toBe(320)

    // ひたむき居残りレッスン (uncap4): no parameter_bonus ability
    // initial_stat: 33, normal_lesson: 9*2=18, activity_supply_gift: 8*1=8
    // event: 10 * 2.0 = 20
    // total = 20 + 33 + 18 + 8 = 79
    const actions = {
      [enums.ActionIdType.Lesson]: 2,
      [enums.ActionIdType.NormalLessonVi]: 2,
      [enums.TriggerKeyType.ActivitySupplyGift]: 1,
    }
    const result = calculateCardParameter(hitamukiLesson, enums.UncapType.Four, actions, emptyExtra, bonusBase)
    expect(result.totalIncrease).toBe(79)
  })

  it('Hajime/Legend: perLesson によるレッスンごとの切り捨て計算', () => {
    // week 4: Vo(main:140, sub:55), week 7: Da(main:180, sub:60)
    const selections: Record<number, enums.ActivityIdType> = {
      4: enums.ActivityIdType.VoLesson,
      7: enums.ActivityIdType.DaLesson,
    }
    const perLesson = getPerLessonParameterValues(
      selections,
      enums.ScenarioType.Hajime,
      enums.DifficultyType.Legend,
    )
    // week4(Vo): vocal=140, dance=55, visual=55
    // week7(Da): vocal=60, dance=180, visual=60
    expect(perLesson.vocal).toEqual([140, 60])
    expect(perLesson.dance).toEqual([55, 180])
    expect(perLesson.visual).toEqual([55, 60])

    // いめーじとれーにんぐ (vocal, uncap4): parameter_bonus 4.3%
    // perLesson vocal: [140, 60]
    // floor(140 * 4.3 / 100) + floor(60 * 4.3 / 100) = floor(6.02) + floor(2.58) = 6 + 2 = 8
    const actions = { [enums.ActionIdType.LessonVo]: 2 }
    const result = calculateCardParameter(
      imageTraining, enums.UncapType.Four, actions, emptyExtra, zeroBonusBase, true, true, perLesson,
    )
    expect(result.parameterBonus).toBe(8)
    // event: 10 * 2.0 = 20, lesson_end: 3*2=6
    // total = 20 + 6 + 8 = 34
    expect(result.totalIncrease).toBe(34)
  })

  it('Hajime/Legend → 2名様、ご案内～♪ の Pアイテム計算', () => {
    // 2名様 (uncap4): initial_stat=49, outing=10*2=20, skill_enhance=3*3=9
    // event_boost: 100% → 15 * 2.0 = 30
    // p_item: vitality_card_acquire × 1 → 6*1 = 6
    // total = 30 + 49 + 20 + 9 + 6 = 114
    const actions = {
      [enums.TriggerKeyType.Outing]: 2,
      [enums.TriggerKeyType.SkillEnhance]: 3,
      [enums.ActionIdType.Lesson]: 2,
      [enums.TriggerKeyType.VitalityCardAcquire]: 1,
    }
    const result = calculateCardParameter(niMeiSama, enums.UncapType.Four, actions, emptyExtra, zeroBonusBase)
    expect(result.eventBoost).toBe(30)
    expect(result.totalIncrease).toBe(114)
  })

  it('extraEventCounts が他カード由来の追加回数として加算される', () => {
    // ぐつぐつ (uncap4):
    // activity_supply_gift: 11 * (1+1) = 22, change: 16 * (1+1) = 32
    // sp_lesson_20: 15 * 2 = 30, initial_stat: 49
    // event_boost: 100% → 15 * 2.0 = 30
    // total = 30 + 49 + 30 + 22 + 32 = 163
    const actions = {
      [enums.TriggerKeyType.ActivitySupplyGift]: 1,
      [enums.TriggerKeyType.Change]: 1,
      [enums.TriggerKeyType.SpLesson20]: 2,
    }
    const extra = {
      [enums.TriggerKeyType.ActivitySupplyGift]: 1,
      [enums.TriggerKeyType.Change]: 1,
    }
    const result = calculateCardParameter(gutsugutsu, enums.UncapType.Four, actions, extra, zeroBonusBase)
    expect(result.totalIncrease).toBe(163)
  })
})

// --- 統合テスト: 実スケジュール × 実カード ---

/** ユーザーが手動入力する回数（スケジュール制御外のアクション） */
const manualInputs: Partial<Record<ActionIdType, number>> = {
  [enums.ActionIdType.SkillAcquire]: 20,
  [enums.ActionIdType.ASkillAcquire]: 9,
  [enums.ActionIdType.MSkillAcquire]: 11,
  [enums.ActionIdType.SsrCardAcquire]: 5,
  [enums.ActionIdType.DrowsyAcquire]: 1,
  [enums.ActionIdType.VitalityCardAcquire]: 2,
  [enums.ActionIdType.GoodConditionCardAcquire]: 3,
  [enums.ActionIdType.ConcentrationCardAcquire]: 4,
  [enums.ActionIdType.GoodImpressionCardAcquire]: 3,
  [enums.ActionIdType.MotivationCardAcquire]: 4,
  [enums.ActionIdType.AggressiveCardAcquire]: 3,
  [enums.ActionIdType.ReserveCardAcquire]: 4,
  [enums.ActionIdType.FullPowerCardAcquire]: 5,
  [enums.ActionIdType.SkillEnhance]: 11,
  [enums.ActionIdType.ASkillEnhance]: 5,
  [enums.ActionIdType.MSkillEnhance]: 6,
  [enums.ActionIdType.Delete]: 3,
  [enums.ActionIdType.ASkillDelete]: 1,
  [enums.ActionIdType.MSkillDelete]: 2,
  [enums.ActionIdType.TroubleDelete]: 1,
  [enums.ActionIdType.Change]: 2,
  [enums.ActionIdType.Customize]: 3,
  [enums.ActionIdType.PItemAcquire]: 2,
  [enums.ActionIdType.PDrinkAcquire]: 5,
  [enums.ActionIdType.PDrinkExchange]: 4,
  [enums.ActionIdType.SpLesson20]: 3,
}

/** テスト用の ScoreSettings を作る */
function makeSettings(
  selections: Record<number, enums.ActivityIdType>,
): ScoreSettings {
  return {
    name: 'test',
    scenario: enums.ScenarioType.Hajime,
    difficulty: enums.DifficultyType.Legend,
    parameterBonusBase: { vocal: 0, dance: 0, visual: 0 },
    actionCounts: { ...manualInputs },
    scheduleSelections: selections,
    useScheduleLimits: true,
    includeSelfTrigger: true,
    includePItem: true,
    useFixedUncap: false,
  }
}

/**
 * パターン1: Vo重視スケジュール
 * 授業→授業→活動支給→Voレッスン→活動支給→授業→Voレッスン→相談
 * →特別指導→中間試験→活動支給→Voレッスン→活動支給→Voレッスン
 * →授業→Daレッスン→相談→最終試験
 */
const pattern1Selections: Record<number, enums.ActivityIdType> = {
  1: enums.ActivityIdType.Class,
  2: enums.ActivityIdType.Class,
  3: enums.ActivityIdType.ActivitySupply,
  4: enums.ActivityIdType.VoLesson,
  5: enums.ActivityIdType.ActivitySupply,
  6: enums.ActivityIdType.Class,
  7: enums.ActivityIdType.VoLesson,
  8: enums.ActivityIdType.Consult,
  9: enums.ActivityIdType.SpecialTraining,
  10: enums.ActivityIdType.MidExam,
  11: enums.ActivityIdType.ActivitySupply,
  12: enums.ActivityIdType.VoLesson,
  13: enums.ActivityIdType.ActivitySupply,
  14: enums.ActivityIdType.VoLesson,
  15: enums.ActivityIdType.Class,
  16: enums.ActivityIdType.DaLesson,
  17: enums.ActivityIdType.Consult,
  18: enums.ActivityIdType.FinalExam,
}

/**
 * パターン2: Vi重視スケジュール
 * 授業→授業→おでかけ→Viレッスン→おでかけ→休む→Viレッスン→相談
 * →特別指導→中間試験→活動支給→Viレッスン→活動支給→Daレッスン
 * →授業→Daレッスン→相談→最終試験
 */
const pattern2Selections: Record<number, enums.ActivityIdType> = {
  1: enums.ActivityIdType.Class,
  2: enums.ActivityIdType.Class,
  3: enums.ActivityIdType.Outing,
  4: enums.ActivityIdType.ViLesson,
  5: enums.ActivityIdType.Outing,
  6: enums.ActivityIdType.Rest,
  7: enums.ActivityIdType.ViLesson,
  8: enums.ActivityIdType.Consult,
  9: enums.ActivityIdType.SpecialTraining,
  10: enums.ActivityIdType.MidExam,
  11: enums.ActivityIdType.ActivitySupply,
  12: enums.ActivityIdType.ViLesson,
  13: enums.ActivityIdType.ActivitySupply,
  14: enums.ActivityIdType.DaLesson,
  15: enums.ActivityIdType.Class,
  16: enums.ActivityIdType.DaLesson,
  17: enums.ActivityIdType.Consult,
  18: enums.ActivityIdType.FinalExam,
}

const schedule = getScheduleData(enums.ScenarioType.Hajime, enums.DifficultyType.Legend)

describe('統合テスト: 実スケジュール × 実カード', () => {
  describe('パターン1: Vo重視（Vo×4 + Da×1）', () => {
    const settings1 = makeSettings(pattern1Selections)
    const merged1 = mergeScheduleCounts(settings1, schedule)
    const bonus1 = calculateParameterBonusFromSchedule(
      pattern1Selections,
      enums.ScenarioType.Hajime,
      enums.DifficultyType.Legend,
    )

    it('スケジュール制御アクションの回数が正しい', () => {
      // Vo×4(w4,7,12,14) + Da×1(w16) → sp_lesson=5
      expect(merged1[enums.ActionIdType.SpLesson]).toBe(5)
      // 属性別レッスン合計: lesson_vo=4, lesson_da=1, lesson=5
      expect(merged1[enums.ActionIdType.LessonVo]).toBe(4)
      expect(merged1[enums.ActionIdType.LessonDa]).toBe(1)
      expect(merged1[enums.ActionIdType.Lesson]).toBe(5)
      // 授業4回(w1,2,6,15)
      expect(merged1[enums.ActionIdType.ClassWork]).toBe(4)
      // 活動支給4回(w3,5,11,13)
      expect(merged1[enums.ActionIdType.ActivitySupplyGift]).toBe(4)
      // おでかけ0回
      expect(merged1[enums.ActionIdType.Outing]).toBe(0)
      // 相談2回(w8,17)
      expect(merged1[enums.ActionIdType.Consult]).toBe(2)
      // 試験2回(w10,18)
      expect(merged1[enums.ActionIdType.ExamEnd]).toBe(2)
    })

    it('パラメータボーナスが正しい', () => {
      // Vo: 140+180+260+370+115(Da sub) = 1065
      // Da: 55+60+70+90+570(Da main) = 845
      // Vi: 55+60+70+90+115 = 390
      expect(bonus1.vocal).toBe(1065)
      expect(bonus1.dance).toBe(845)
      expect(bonus1.visual).toBe(390)
    })

    it('いめーじとれーにんぐ: 凸4 paramBonus + lesson + class_work', () => {
      // parameter_bonus: 4.3% → floor(1065 * 4.3 / 100) = floor(45.795) = 45
      // lesson_end: 3 * 4 = 12（lesson_vo=4、Voレッスンのみ）
      // class_work_end: 3 * 4 = 12
      // event_boost: 100% → 10 * 2.0 = 20
      // total = 20 + 12 + 12 + 45 = 89
      const result = calculateCardParameter(
        imageTraining, enums.UncapType.Four, merged1, emptyExtra, bonus1,
      )
      expect(result.parameterBonus).toBe(45)
      expect(result.totalIncrease).toBe(89)
    })

    it('いめーじとれーにんぐ: perLesson で切り捨て計算', () => {
      const perLesson = getPerLessonParameterValues(
        pattern1Selections,
        enums.ScenarioType.Hajime,
        enums.DifficultyType.Legend,
      )
      // vocal perLesson: [140, 180, 260, 370, 115]
      // floor(140*0.043)+floor(180*0.043)+floor(260*0.043)+floor(370*0.043)+floor(115*0.043)
      // = 6+7+11+15+4 = 43 (合算の45より2低い)
      const result = calculateCardParameter(
        imageTraining, enums.UncapType.Four, merged1, emptyExtra,
        zeroBonusBase, true, true, perLesson,
      )
      expect(result.parameterBonus).toBe(43)
      // total = 20 + 12 + 12 + 43 = 87（lesson_vo=4）
      expect(result.totalIncrease).toBe(87)
    })

    it('ひたむき居残りレッスン: 通常レッスン0回 + 活動支給の加算', () => {
      // SPレッスンのみのスケジュールでは normal_lesson=0
      // initial_stat: 33
      // normal_lesson_end: 9 * 0 = 0
      // activity_supply_gift: 8 * 4 = 32
      // event_boost: 100% → 10 * 2.0 = 20
      // total = 20 + 33 + 0 + 32 = 85
      const result = calculateCardParameter(
        hitamukiLesson, enums.UncapType.Four, merged1, emptyExtra, zeroBonusBase,
      )
      expect(result.totalIncrease).toBe(85)
    })

    it('2名様ご案内: Pアイテム ON（元気カード獲得で Vo+6）', () => {
      // initial_stat: 49, outing: 10*0=0, skill_enhance: 3*11=33
      // class_work_end: 5*4=20, event_boost: 100% → 15*2.0=30
      // p_item: vitality_card_acquire=2 → 6*2=12
      // total = 30 + 49 + 0 + 33 + 20 + 12 = 144
      const result = calculateCardParameter(
        niMeiSama, enums.UncapType.Four, merged1, emptyExtra, zeroBonusBase,
        true, true,
      )
      expect(result.totalIncrease).toBe(144)
    })

    it('2名様ご案内: Pアイテム OFF', () => {
      // total = 30 + 49 + 0 + 33 + 20 = 132
      const result = calculateCardParameter(
        niMeiSama, enums.UncapType.Four, merged1, emptyExtra, zeroBonusBase,
        true, false,
      )
      expect(result.totalIncrease).toBe(132)
    })

    it('ぐつぐつ: sp_lesson_20 + change + 活動支給', () => {
      // initial_stat: 49, sp_lesson_20: 15*min(3,4)=45
      // activity_supply_gift: 11*4=44, change: 16*min(2,3)=32
      // event_boost: 100% → 15*2.0=30
      // total = 30 + 49 + 45 + 44 + 32 = 200
      const result = calculateCardParameter(
        gutsugutsu, enums.UncapType.Four, merged1, emptyExtra, zeroBonusBase,
      )
      expect(result.totalIncrease).toBe(200)
    })

    it('あたしの勝ち: 自己発火 ON（SSR+SkillCard → ssr_card_acquire+1）', () => {
      // initial_stat: 65
      // activity_supply_gift: 17 * 4 = 68
      // ssr_card_acquire: 6 * (5+1) = 36
      // event_boost: 100% → 20 * 2.0 = 40
      // total = 40 + 65 + 68 + 36 = 209
      const result = calculateCardParameter(
        atashiNoKachi, enums.UncapType.Four, merged1, emptyExtra, zeroBonusBase,
        true,
      )
      expect(result.totalIncrease).toBe(209)
    })

    it('あたしの勝ち: 自己発火 OFF', () => {
      // ssr_card_acquire: 6 * 5 = 30
      // total = 40 + 65 + 68 + 30 = 203
      const result = calculateCardParameter(
        atashiNoKachi, enums.UncapType.Four, merged1, emptyExtra, zeroBonusBase,
        false,
      )
      expect(result.totalIncrease).toBe(203)
    })

    it('推し活なひととき: paramBonus + customize + 活動支給', () => {
      // parameter_bonus: 8.5% → floor(390 * 8.5 / 100) = floor(33.15) = 33
      // good_impression_card_acquire: 4 * 3 = 12
      // customize: 11 * min(3, 6) = 33
      // activity_supply_gift: 17 * 4 = 68
      // event_boost: 100% → 20 * 2.0 = 40
      // total = 40 + 33 + 12 + 33 + 68 = 186
      const result = calculateCardParameter(
        oshikatsu, enums.UncapType.Four, merged1, emptyExtra, bonus1,
      )
      expect(result.parameterBonus).toBe(33)
      expect(result.eventBoost).toBe(40)
      expect(result.totalIncrease).toBe(186)
    })

    it('これは――お城ッ！！: Pアイテム（特訓ブースト） + customize', () => {
      // initial_stat: 65
      // activity_supply_gift: 17 * 4 = 68
      // good_condition_card_acquire: 4 * 3 = 12
      // customize: 11 * min(3, 6) = 33
      // p_item: special_training 30 * 1 = 30
      // event_boost: 100% → 20 * 2.0 = 40
      // total = 40 + 65 + 68 + 12 + 33 + 30 = 248
      const result = calculateCardParameter(
        oshiro, enums.UncapType.Four, merged1, emptyExtra, bonus1,
      )
      expect(result.eventBoost).toBe(40)
      expect(result.totalIncrease).toBe(248)
    })

    it('ひとりごとです: 自己発火 ON（card_change → change+1, p_item delete → a_skill_delete+2）', () => {
      // initial_stat: 65
      // change: 21 * min(2+1, 3) = 63
      // sp_lesson_end: 17 * 0 = 0（sp_lesson_vi=0、Pattern1にViなし）
      // a_skill_delete: 22 * min(1+2, 3) = 66（Pアイテム delete → +2）
      // event_boost: 100% → 20 * 2.0 = 40
      // total = 40 + 65 + 63 + 0 + 66 = 234
      const result = calculateCardParameter(
        hitorigoto, enums.UncapType.Four, merged1, emptyExtra, zeroBonusBase,
        true,
      )
      expect(result.eventBoost).toBe(40)
      const change = result.abilityBoosts.find(b => b.nameKey === enums.AbilityNameKeyType.Change)
      expect(change?.count).toBe(3)
      expect(result.totalIncrease).toBe(234)
    })

    it('ひとりごとです: 自己発火 OFF', () => {
      // change: 21 * min(2, 3) = 42（selfBonus なし）
      // total = 40 + 65 + 42 + 0 + 22 = 169
      const result = calculateCardParameter(
        hitorigoto, enums.UncapType.Four, merged1, emptyExtra, zeroBonusBase,
        false,
      )
      const change = result.abilityBoosts.find(b => b.nameKey === enums.AbilityNameKeyType.Change)
      expect(change?.count).toBe(2)
      expect(result.totalIncrease).toBe(169)
    })
  })

  describe('パターン2: Vi重視（Vi×3 + Da×2 + おでかけ・休み含む）', () => {
    const settings2 = makeSettings(pattern2Selections)
    const merged2 = mergeScheduleCounts(settings2, schedule)
    const bonus2 = calculateParameterBonusFromSchedule(
      pattern2Selections,
      enums.ScenarioType.Hajime,
      enums.DifficultyType.Legend,
    )

    it('スケジュール制御アクションの回数が正しい', () => {
      // Vi×3(w4,7,12) + Da×2(w14,16) → sp_lesson=5
      expect(merged2[enums.ActionIdType.SpLesson]).toBe(5)
      // 属性別レッスン合計: lesson_vo=0, lesson_da=2, lesson_vi=3, lesson=5
      expect(merged2[enums.ActionIdType.LessonVo]).toBe(0)
      expect(merged2[enums.ActionIdType.LessonDa]).toBe(2)
      expect(merged2[enums.ActionIdType.LessonVi]).toBe(3)
      expect(merged2[enums.ActionIdType.Lesson]).toBe(5)
      // 授業3回(w1,2,15)
      expect(merged2[enums.ActionIdType.ClassWork]).toBe(3)
      // おでかけ2回(w3,5)
      expect(merged2[enums.ActionIdType.Outing]).toBe(2)
      // 活動支給2回(w11,13)
      expect(merged2[enums.ActionIdType.ActivitySupplyGift]).toBe(2)
      // 休み1回(w6)
      expect(merged2[enums.ActionIdType.Rest]).toBe(1)
    })

    it('パラメータボーナスが正しい', () => {
      // Vo: 55+60+70+90+115 = 390
      // Da: 55+60+70+370+570 = 1125
      // Vi: 140+180+260+90+115 = 785
      expect(bonus2.vocal).toBe(390)
      expect(bonus2.dance).toBe(1125)
      expect(bonus2.visual).toBe(785)
    })

    it('いめーじとれーにんぐ: Vo以外レッスン中心で sub 値の paramBonus', () => {
      // parameter_bonus: 4.3% → floor(390 * 4.3 / 100) = floor(16.77) = 16
      // lesson_end: 3 * 0 = 0（lesson_vo=0、Pattern2にVoなし）
      // class_work_end: 3 * 3 = 9
      // event_boost: 100% → 10 * 2.0 = 20
      // total = 20 + 0 + 9 + 16 = 45
      const result = calculateCardParameter(
        imageTraining, enums.UncapType.Four, merged2, emptyExtra, bonus2,
      )
      expect(result.parameterBonus).toBe(16)
      expect(result.totalIncrease).toBe(45)
    })

    it('ひたむき居残りレッスン: 活動支給2回のみ', () => {
      // initial_stat: 33, normal_lesson_end: 0
      // activity_supply_gift: 8 * 2 = 16
      // event_boost: 100% → 10 * 2.0 = 20
      // total = 20 + 33 + 0 + 16 = 69
      const result = calculateCardParameter(
        hitamukiLesson, enums.UncapType.Four, merged2, emptyExtra, zeroBonusBase,
      )
      expect(result.totalIncrease).toBe(69)
    })

    it('2名様ご案内: おでかけ2回が反映される', () => {
      // initial_stat: 49, outing: 10*2=20, skill_enhance: 3*11=33
      // class_work_end: 5*3=15, event_boost: 100% → 15*2.0=30
      // p_item: 6*2=12
      // total = 30 + 49 + 20 + 33 + 15 + 12 = 159
      const result = calculateCardParameter(
        niMeiSama, enums.UncapType.Four, merged2, emptyExtra, zeroBonusBase,
      )
      expect(result.totalIncrease).toBe(159)
    })

    it('あたしの勝ち: 活動支給2回 + 自己発火 ON', () => {
      // initial_stat: 65
      // activity_supply_gift: 17 * 2 = 34
      // ssr_card_acquire: 6 * (5+1) = 36
      // event_boost: 100% → 20 * 2.0 = 40
      // total = 40 + 65 + 34 + 36 = 175
      const result = calculateCardParameter(
        atashiNoKachi, enums.UncapType.Four, merged2, emptyExtra, zeroBonusBase,
        true,
      )
      expect(result.totalIncrease).toBe(175)
    })
  })
})

// --- モックカードによるアビリティ網羅テスト ---

/**
 * テスト用モックカードを作成するヘルパー。
 * 未テストの *_card_acquire 系アビリティをカバーするために使用する。
 */
function createMockCard(overrides: Partial<SupportCard>): SupportCard {
  return {
    name: 'mock_card',
    rarity: enums.RarityType.SR,
    plan: enums.PlanType.Free,
    type: enums.CardType.Vocal,
    parameter_type: enums.ParameterType.Vocal,
    source: enums.SourceType.Gacha,
    release_date: '2099/01/01',
    abilities: [],
    events: [],
    p_item: null,
    skill_card: null,
    ...overrides,
  }
}

/** concentration_card_acquire テスト用カード */
const mockConcentrationCard = createMockCard({
  name: 'mock_concentration',
  type: enums.CardType.Dance,
  parameter_type: enums.ParameterType.Dance,
  abilities: [
    {
      name_key: enums.AbilityNameKeyType.InitialStat,
      trigger_key: enums.TriggerKeyType.InitialStat,
      parameter_type: enums.ParameterType.Dance,
      values: { '0': '20', '4': '40' },
      is_initial_stat: true,
    },
    {
      name_key: enums.AbilityNameKeyType.ConcentrationCardAcquire,
      trigger_key: enums.TriggerKeyType.ConcentrationCardAcquire,
      parameter_type: enums.ParameterType.Dance,
      values: { '0': '3', '4': '5' },
    },
    {
      name_key: enums.AbilityNameKeyType.EventBoost,
      trigger_key: enums.TriggerKeyType.EventBoost,
      values: { '0': '', '4': '100' },
      is_percentage: true,
      is_event_boost: true,
    },
  ],
  events: [
    { release: enums.ReleaseConditionType.Initial, effect_type: enums.EventEffectType.ParamBoost, param_type: enums.ParameterType.Dance, param_value: 10, title: 'mock event' },
  ],
})

/** motivation_card_acquire テスト用カード */
const mockMotivationCard = createMockCard({
  name: 'mock_motivation',
  type: enums.CardType.Visual,
  parameter_type: enums.ParameterType.Visual,
  abilities: [
    {
      name_key: enums.AbilityNameKeyType.InitialStat,
      trigger_key: enums.TriggerKeyType.InitialStat,
      parameter_type: enums.ParameterType.Visual,
      values: { '0': '25', '4': '50' },
      is_initial_stat: true,
    },
    {
      name_key: enums.AbilityNameKeyType.MotivationCardAcquire,
      trigger_key: enums.TriggerKeyType.MotivationCardAcquire,
      parameter_type: enums.ParameterType.Visual,
      values: { '0': '4', '4': '7' },
    },
    {
      name_key: enums.AbilityNameKeyType.SpLessonEnd,
      trigger_key: enums.TriggerKeyType.ViSpLessonEnd,
      parameter_type: enums.ParameterType.Visual,
      values: { '0': '8', '4': '15' },
    },
    {
      name_key: enums.AbilityNameKeyType.EventBoost,
      trigger_key: enums.TriggerKeyType.EventBoost,
      values: { '0': '', '4': '100' },
      is_percentage: true,
      is_event_boost: true,
    },
  ],
  events: [
    { release: enums.ReleaseConditionType.Initial, effect_type: enums.EventEffectType.ParamBoost, param_type: enums.ParameterType.Visual, param_value: 15, title: 'mock event' },
  ],
})

/** reserve_card_acquire テスト用カード */
const mockReserveCard = createMockCard({
  name: 'mock_reserve',
  type: enums.CardType.Vocal,
  parameter_type: enums.ParameterType.Vocal,
  abilities: [
    {
      name_key: enums.AbilityNameKeyType.ParameterBonus,
      trigger_key: enums.TriggerKeyType.ParameterBonus,
      parameter_type: enums.ParameterType.Vocal,
      values: { '0': '+3.0%', '4': '+6.0%' },
      is_percentage: true,
      is_parameter_bonus: true,
    },
    {
      name_key: enums.AbilityNameKeyType.ReserveCardAcquire,
      trigger_key: enums.TriggerKeyType.ReserveCardAcquire,
      parameter_type: enums.ParameterType.Vocal,
      values: { '0': '3', '4': '6' },
    },
    {
      name_key: enums.AbilityNameKeyType.EventBoost,
      trigger_key: enums.TriggerKeyType.EventBoost,
      values: { '0': '', '4': '100' },
      is_percentage: true,
      is_event_boost: true,
    },
  ],
  events: [
    { release: enums.ReleaseConditionType.Initial, effect_type: enums.EventEffectType.ParamBoost, param_type: enums.ParameterType.Vocal, param_value: 10, title: 'mock event' },
  ],
})

describe('統合テスト: モックカード（未テストアビリティ網羅）', () => {
  it('concentration_card_acquire: 凸4 集中系カード獲得×4', () => {
    // initial_stat: 40 (fixed 1 count)
    // concentration_card_acquire: 5 * 4 = 20
    // event_boost: 100% → 10 * 2.0 = 20
    // total = 20 + 40 + 20 = 80
    const actions = {
      [enums.ActionIdType.ConcentrationCardAcquire]: 4,
    }
    const result = calculateCardParameter(mockConcentrationCard, enums.UncapType.Four, actions, emptyExtra, zeroBonusBase)

    expect(result.parameterType).toBe(enums.ParameterType.Dance)
    expect(result.eventBoost).toBe(20)
    const concAbility = result.abilityBoosts.find(b => b.nameKey === enums.AbilityNameKeyType.ConcentrationCardAcquire)
    expect(concAbility?.count).toBe(4)
    expect(concAbility?.valuePerTrigger).toBe(5)
    expect(concAbility?.total).toBe(20)
    expect(result.totalIncrease).toBe(80)
  })

  it('concentration_card_acquire: 凸0 集中系カード獲得×2', () => {
    // initial_stat: 20
    // concentration_card_acquire: 3 * 2 = 6
    // event_boost: "" → 0% → 10 * 1.0 = 10
    // total = 10 + 20 + 6 = 36
    const actions = {
      [enums.ActionIdType.ConcentrationCardAcquire]: 2,
    }
    const result = calculateCardParameter(mockConcentrationCard, enums.UncapType.Zero, actions, emptyExtra, zeroBonusBase)

    expect(result.eventBoostPercent).toBe(0)
    expect(result.eventBoost).toBe(10)
    const concAbility = result.abilityBoosts.find(b => b.nameKey === enums.AbilityNameKeyType.ConcentrationCardAcquire)
    expect(concAbility?.count).toBe(2)
    expect(concAbility?.valuePerTrigger).toBe(3)
    expect(concAbility?.total).toBe(6)
    expect(result.totalIncrease).toBe(36)
  })

  it('motivation_card_acquire: 凸4 やる気系カード獲得×4 + SPレッスン×3', () => {
    // initial_stat: 50
    // motivation_card_acquire: 7 * 4 = 28
    // sp_lesson_end: 15 * 3 = 45
    // event_boost: 100% → 15 * 2.0 = 30
    // total = 30 + 50 + 28 + 45 = 153
    const actions = {
      [enums.ActionIdType.MotivationCardAcquire]: 4,
      [enums.ActionIdType.SpLessonVi]: 3,
    }
    const result = calculateCardParameter(mockMotivationCard, enums.UncapType.Four, actions, emptyExtra, zeroBonusBase)

    expect(result.parameterType).toBe(enums.ParameterType.Visual)
    expect(result.eventBoost).toBe(30)
    const motAbility = result.abilityBoosts.find(b => b.nameKey === enums.AbilityNameKeyType.MotivationCardAcquire)
    expect(motAbility?.count).toBe(4)
    expect(motAbility?.valuePerTrigger).toBe(7)
    expect(motAbility?.total).toBe(28)
    const spLesson = result.abilityBoosts.find(b => b.nameKey === enums.AbilityNameKeyType.SpLessonEnd)
    expect(spLesson?.count).toBe(3)
    expect(spLesson?.total).toBe(45)
    expect(result.totalIncrease).toBe(153)
  })

  it('motivation_card_acquire: 凸0 やる気系カード獲得×1', () => {
    // initial_stat: 25
    // motivation_card_acquire: 4 * 1 = 4
    // event_boost: "" → 0% → 15 * 1.0 = 15
    // total = 15 + 25 + 4 = 44
    const actions = {
      [enums.ActionIdType.MotivationCardAcquire]: 1,
    }
    const result = calculateCardParameter(mockMotivationCard, enums.UncapType.Zero, actions, emptyExtra, zeroBonusBase)

    expect(result.eventBoost).toBe(15)
    const motAbility = result.abilityBoosts.find(b => b.nameKey === enums.AbilityNameKeyType.MotivationCardAcquire)
    expect(motAbility?.count).toBe(1)
    expect(motAbility?.total).toBe(4)
    expect(result.totalIncrease).toBe(44)
  })

  it('reserve_card_acquire: 凸4 温存系カード獲得×4 + paramBonus', () => {
    // reserve_card_acquire: 6 * 4 = 24
    // parameter_bonus: 6.0% → floor(300 * 6.0 / 100) = floor(18) = 18
    // event_boost: 100% → 10 * 2.0 = 20
    // total = 20 + 24 + 18 = 62
    const actions = {
      [enums.ActionIdType.ReserveCardAcquire]: 4,
    }
    const bonusBase = { vocal: 300, dance: 0, visual: 0 }
    const result = calculateCardParameter(mockReserveCard, enums.UncapType.Four, actions, emptyExtra, bonusBase)

    expect(result.parameterType).toBe(enums.ParameterType.Vocal)
    expect(result.eventBoost).toBe(20)
    expect(result.parameterBonus).toBe(18)
    expect(result.paramBonusPercent).toBeCloseTo(6.0)
    const resAbility = result.abilityBoosts.find(b => b.nameKey === enums.AbilityNameKeyType.ReserveCardAcquire)
    expect(resAbility?.count).toBe(4)
    expect(resAbility?.valuePerTrigger).toBe(6)
    expect(resAbility?.total).toBe(24)
    expect(result.totalIncrease).toBe(62)
  })

  it('reserve_card_acquire: 凸0 温存系カード獲得×3 + paramBonus', () => {
    // reserve_card_acquire: 3 * 3 = 9
    // parameter_bonus: 3.0% → floor(300 * 3.0 / 100) = floor(9) = 9
    // event_boost: "" → 0% → 10 * 1.0 = 10
    // total = 10 + 9 + 9 = 28
    const actions = {
      [enums.ActionIdType.ReserveCardAcquire]: 3,
    }
    const bonusBase = { vocal: 300, dance: 0, visual: 0 }
    const result = calculateCardParameter(mockReserveCard, enums.UncapType.Zero, actions, emptyExtra, bonusBase)

    expect(result.eventBoost).toBe(10)
    expect(result.parameterBonus).toBe(9)
    const resAbility = result.abilityBoosts.find(b => b.nameKey === enums.AbilityNameKeyType.ReserveCardAcquire)
    expect(resAbility?.count).toBe(3)
    expect(resAbility?.total).toBe(9)
    expect(result.totalIncrease).toBe(28)
  })

  it('concentration_card_acquire: extraEventCounts による追加回数', () => {
    // concentration_card_acquire: 5 * (2+1) = 15
    // initial_stat: 40
    // event_boost: 100% → 10 * 2.0 = 20
    // total = 20 + 40 + 15 = 75
    const actions = {
      [enums.ActionIdType.ConcentrationCardAcquire]: 2,
    }
    const extra = {
      [enums.ActionIdType.ConcentrationCardAcquire]: 1,
    }
    const result = calculateCardParameter(mockConcentrationCard, enums.UncapType.Four, actions, extra, zeroBonusBase)

    const concAbility = result.abilityBoosts.find(b => b.nameKey === enums.AbilityNameKeyType.ConcentrationCardAcquire)
    expect(concAbility?.count).toBe(3)
    expect(concAbility?.total).toBe(15)
    expect(result.totalIncrease).toBe(75)
  })
})
