/**
 * 総当たり最適化のテスト
 * ドリンク設定変更時の局所解問題を再現し、exhaustiveOptimizeAsync で解決されることを検証する。
 */
import { describe, expect, it } from 'vitest'
import { exhaustiveOptimizeAsync, evaluateManualUnit } from '../../utils/unitSimulator'
import * as enums from '../../types/enums'
import { AllCards, CardByName } from '../../data/index'
import type { ScoreSettings } from '../../types/card'
import type { UnitSimulatorSettings } from '../../types/unit'

/** ユーザーの実際の設定（p_drink_acquire 可変） */
function makeUserScoreSettings(pDrinkAcquire = 10): ScoreSettings {
  return {
    name: 'user',
    scenario: enums.ScenarioType.Hajime,
    difficulty: enums.DifficultyType.Legend,
    parameterBonusBase: { vocal: 845, dance: 1065, visual: 390 },
    actionCounts: {
      [enums.ActionIdType.PDrinkAcquire]: pDrinkAcquire,
      [enums.ActionIdType.PDrinkExchange]: 12,
      [enums.ActionIdType.SkillAcquire]: 20,
      [enums.ActionIdType.MSkillAcquire]: 18,
      [enums.ActionIdType.ASkillAcquire]: 2,
      [enums.ActionIdType.SsrCardAcquire]: 10,
      [enums.ActionIdType.GoodConditionCardAcquire]: 10,
      [enums.ActionIdType.ConcentrationCardAcquire]: 10,
      [enums.ActionIdType.GoodImpressionCardAcquire]: 5,
      [enums.ActionIdType.MotivationCardAcquire]: 10,
      [enums.ActionIdType.AggressiveCardAcquire]: 10,
      [enums.ActionIdType.ReserveCardAcquire]: 10,
      [enums.ActionIdType.FullPowerCardAcquire]: 10,
      [enums.ActionIdType.SkillEnhance]: 3,
      [enums.ActionIdType.ASkillEnhance]: 3,
      [enums.ActionIdType.MSkillEnhance]: 5,
      [enums.ActionIdType.Delete]: 3,
      [enums.ActionIdType.ASkillDelete]: 3,
      [enums.ActionIdType.MSkillDelete]: 3,
      [enums.ActionIdType.TroubleDelete]: 3,
      [enums.ActionIdType.Customize]: 5,
      [enums.ActionIdType.PItemAcquire]: 1,
      [enums.ActionIdType.ActivitySupplyGift]: 30,
      [enums.ActionIdType.SpLesson20]: 3,
      [enums.ActionIdType.VitalityCardAcquire]: 10,
    },
    scheduleSelections: {
      1: enums.ActivityIdType.Class,
      2: enums.ActivityIdType.Class,
      3: enums.ActivityIdType.ActivitySupply,
      4: enums.ActivityIdType.DaLesson,
      5: enums.ActivityIdType.ActivitySupply,
      6: enums.ActivityIdType.Class,
      7: enums.ActivityIdType.DaLesson,
      8: enums.ActivityIdType.Consult,
      9: enums.ActivityIdType.SpecialTraining,
      10: enums.ActivityIdType.MidExam,
      11: enums.ActivityIdType.ActivitySupply,
      12: enums.ActivityIdType.DaLesson,
      13: enums.ActivityIdType.ActivitySupply,
      14: enums.ActivityIdType.DaLesson,
      15: enums.ActivityIdType.Class,
      16: enums.ActivityIdType.VoLesson,
      17: enums.ActivityIdType.Consult,
      18: enums.ActivityIdType.FinalExam,
    },
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
/** バックアップから復元したユーザーの凸数設定 */
const fullCardUncaps: Record<string, enums.UncapType> = {
  '手毬のリサイタル、だね': enums.UncapType.Zero,
  '思い出の宝箱だ、ね': enums.UncapType.Zero,
  'みいつけた。': enums.UncapType.Four,
  'これは――お城ッ！！': enums.UncapType.NotOwned,
  '利用し合うのが友達！': enums.UncapType.Zero,
  '新たな挑戦の成功ですわ！': enums.UncapType.Four,
  'おっと、危ないよ': enums.UncapType.NotOwned,
  'レディ・セット、ゴー！': enums.UncapType.NotOwned,
  仲良しの証: enums.UncapType.Four,
  'そろそろ焼けたかな？': enums.UncapType.Zero,
  'いつも頑張ってるね。': enums.UncapType.NotOwned,
  一時休戦です: enums.UncapType.Four,
  '堂々とサボってる！？': enums.UncapType.NotOwned,
  'なぜこんなところにッ！？': enums.UncapType.Zero,
  'メリクリ、おねーちゃん♪': enums.UncapType.Zero,
  'かかってらっしゃい！': enums.UncapType.Zero,
  '合格おめでとう！': enums.UncapType.NotOwned,
  'あたしの勝ち、ですね～！': enums.UncapType.Zero,
  洗濯物のバランスタワー: enums.UncapType.Zero,
  'お近づきの印☆': enums.UncapType.Zero,
  'やっと見つけたぞ！': enums.UncapType.One,
  'クールダウンが大切よ！': enums.UncapType.Zero,
  '月村手毬、興味深いわね': enums.UncapType.Zero,
  'ちょっと詳しいんです！': enums.UncapType.One,
  ｖギャルピーーースッｖ: enums.UncapType.NotOwned,
  'おい、来てやったぞ！': enums.UncapType.NotOwned,
  いつまでも続けばいいのに: enums.UncapType.NotOwned,
  放っておけない気になる子: enums.UncapType.Two,
  'どんな関係なんですか？': enums.UncapType.Zero,
  '推し活なひととき、だね！': enums.UncapType.Zero,
  'みんなの意見を聞かせて♪': enums.UncapType.Four,
  'よくやったな、倉本。': enums.UncapType.One,
  相変わらず不器用ね: enums.UncapType.Two,
  '相手にとって不足なしよ！': enums.UncapType.Zero,
  'ここから始まるんだね！': enums.UncapType.Zero,
  'ひとりで立てますか？': enums.UncapType.One,
  新生活のはじまりだね: enums.UncapType.Four,
  あなたたちのことが好き: enums.UncapType.Zero,
  '絶対にお渡ししますわっ！': enums.UncapType.Zero,
  'バレンタイン♡会議中ーっ！': enums.UncapType.One,
  'はいっ、みんなも一緒に♪': enums.UncapType.Two,
  'これが私達の、3年間': enums.UncapType.One,
  'もう一度、最初から！': enums.UncapType.One,
  '待ちなさーい！': enums.UncapType.Three,
  あったかいね: enums.UncapType.Zero,
  'キラキラして綺麗～っ！': enums.UncapType.Zero,
  'ぜったい追いついてやる！': enums.UncapType.Four,
  食欲の秋なんです: enums.UncapType.Three,
  '会長、準備は万端です': enums.UncapType.Three,
  'すっかり秋色ですわね！': enums.UncapType.Zero,
  '似合うんじゃない？': enums.UncapType.Two,
  ゆっくりと過ごしましょう: enums.UncapType.Zero,
  '夏を満喫するわよ！': enums.UncapType.One,
  'まだ上がりませんように！': enums.UncapType.Four,
  晴れたね: enums.UncapType.Four,
  '花火、やりませんか……？': enums.UncapType.Four,
  'もうっ！　冷たいよ！': enums.UncapType.Zero,
  '「ア」じゃなくて「エ」！': enums.UncapType.Three,
  'まじか。': enums.UncapType.Two,
  '次の桜の季節には。': enums.UncapType.Two,
  師弟の修行: enums.UncapType.Zero,
  頼れる先輩お姉さん: enums.UncapType.Four,
  '佑芽ソリレース、疾走！': enums.UncapType.Four,
  '大運動会、開催っ！': enums.UncapType.Four,
  思惑とガクガク: enums.UncapType.Four,
  '進化したお弁当、気になる': enums.UncapType.Zero,
  騎士とおてんば姫: enums.UncapType.Four,
  ひとりごとです: enums.UncapType.Four,
  自分と向き合う時間だ: enums.UncapType.Four,
  'おいしい顔、いただき～！': enums.UncapType.Three,
  '上かッ！！': enums.UncapType.NotOwned,
  パクパクもぐもぐ: enums.UncapType.NotOwned,
  'はっぴぃはろうぃ～～ん！': enums.UncapType.One,
  'あなたとふたり、電車で': enums.UncapType.NotOwned,
}

/** ユーザーの手動最適解（いつまでも続けばいいのに + ふわふわでワクワク）をスコア計算する */
function getManualScore(pDrinkAcquire = 10): number {
  const manualCards = [
    'ぜったいに取るんだ！',
    'どんな関係なんですか？',
    'おいしい顔、いただき～！',
    'ふわふわでワクワク',
    '思い出の宝箱だ、ね',
    'いつまでも続けばいいのに',
  ]
  const settings: UnitSimulatorSettings = {
    plan: enums.PlanType.Logic,
    allowedTypes: [enums.CardType.Vocal, enums.CardType.Dance, enums.CardType.Visual],
    spConstraint: { vocal: 2, dance: 2, visual: 0 },
    typeCountMin: {
      [enums.ParameterType.Vocal]: 0,
      [enums.ParameterType.Dance]: 0,
      [enums.ParameterType.Visual]: 0,
    },
    typeCountMax: {
      [enums.ParameterType.Vocal]: 3,
      [enums.ParameterType.Dance]: 3,
      [enums.ParameterType.Visual]: 3,
    },
    paramBonusPercent: { vocal: 23, dance: 25.9, visual: 16.5 },
    manualRental: true,
    rentalCardName: 'いつまでも続けばいいのに',
    lockedCards: [],
    manualCards,
    initialParams: { vocal: 125, dance: 169, visual: 210 },
  }
  const result = evaluateManualUnit({
    settings,
    scoreSettings: makeUserScoreSettings(pDrinkAcquire),
    cardUncaps: fullCardUncaps,
    allCards: AllCards,
    cardByName: CardByName,
  })
  return result?.totalScore ?? 0
}

/** 手動編成（Pドリンク獲得=12）をスコア計算する */
function getManualScorePDrink12(): number {
  const manualCards = [
    'ぜったいに取るんだ！',
    'どんな関係なんですか？',
    'あなたたちのことが好き',
    'ふわふわでワクワク',
    'まだ上がりませんように！',
    'いつまでも続けばいいのに',
  ]
  const settings: UnitSimulatorSettings = {
    plan: enums.PlanType.Logic,
    allowedTypes: [enums.CardType.Vocal, enums.CardType.Dance, enums.CardType.Visual],
    spConstraint: { vocal: 2, dance: 2, visual: 0 },
    typeCountMin: {
      [enums.ParameterType.Vocal]: 0,
      [enums.ParameterType.Dance]: 0,
      [enums.ParameterType.Visual]: 0,
    },
    typeCountMax: {
      [enums.ParameterType.Vocal]: 3,
      [enums.ParameterType.Dance]: 3,
      [enums.ParameterType.Visual]: 3,
    },
    paramBonusPercent: { vocal: 23, dance: 25.9, visual: 16.5 },
    manualRental: true,
    rentalCardName: 'いつまでも続けばいいのに',
    lockedCards: [],
    manualCards,
    initialParams: { vocal: 125, dance: 169, visual: 210 },
  }
  const result = evaluateManualUnit({
    settings,
    scoreSettings: makeUserScoreSettings(12),
    cardUncaps: fullCardUncaps,
    allCards: AllCards,
    cardByName: CardByName,
  })
  return result?.totalScore ?? 0
}

describe('総当たり最適化', () => {
  it(
    'manualRental=false で exhaustiveOptimizeAsync がいつまでも続けばいいのに 以上のスコアを発見する',
    { timeout: 120000 },
    async () => {
      const manualScore = getManualScore(10)

      const settings: UnitSimulatorSettings = {
        plan: enums.PlanType.Logic,
        allowedTypes: [enums.CardType.Vocal, enums.CardType.Dance, enums.CardType.Visual],
        spConstraint: { vocal: 2, dance: 2, visual: 0 },
        typeCountMin: {
          [enums.ParameterType.Vocal]: 0,
          [enums.ParameterType.Dance]: 0,
          [enums.ParameterType.Visual]: 0,
        },
        typeCountMax: {
          [enums.ParameterType.Vocal]: 3,
          [enums.ParameterType.Dance]: 3,
          [enums.ParameterType.Visual]: 3,
        },
        paramBonusPercent: { vocal: 23, dance: 25.9, visual: 16.5 },
        manualRental: false,
        rentalCardName: null,
        lockedCards: [],
        manualCards: [],
        initialParams: { vocal: 125, dance: 169, visual: 210 },
      }

      let progressCalls = 0
      const result = await exhaustiveOptimizeAsync(
        {
          settings,
          scoreSettings: makeUserScoreSettings(10),
          cardUncaps: fullCardUncaps,
          allCards: AllCards,
          cardByName: CardByName,
        },
        () => {
          progressCalls++
        },
        () => false,
      )

      expect(result).not.toBeNull()
      if (!result) return

      // 総当たりで得られたスコアが手動最適解（いつまでも続けばいいのに）以上であること
      expect(result.totalScore).toBeGreaterThanOrEqual(manualScore)
      // 進捗コールバックが呼ばれていること
      expect(progressCalls).toBeGreaterThan(0)
    },
  )

  it('Pドリンク獲得=12で手動編成以上を返す', { timeout: 120000 }, async () => {
    const manualScore = getManualScorePDrink12()

    const settings: UnitSimulatorSettings = {
      plan: enums.PlanType.Logic,
      allowedTypes: [enums.CardType.Vocal, enums.CardType.Dance, enums.CardType.Visual],
      spConstraint: { vocal: 2, dance: 2, visual: 0 },
      typeCountMin: {
        [enums.ParameterType.Vocal]: 0,
        [enums.ParameterType.Dance]: 0,
        [enums.ParameterType.Visual]: 0,
      },
      typeCountMax: {
        [enums.ParameterType.Vocal]: 3,
        [enums.ParameterType.Dance]: 3,
        [enums.ParameterType.Visual]: 3,
      },
      paramBonusPercent: { vocal: 23, dance: 25.9, visual: 16.5 },
      manualRental: false,
      rentalCardName: null,
      lockedCards: [],
      manualCards: [],
      initialParams: { vocal: 125, dance: 169, visual: 210 },
      exhaustiveCandidateLimit: 100,
    }

    const result = await exhaustiveOptimizeAsync(
      {
        settings,
        scoreSettings: makeUserScoreSettings(12),
        cardUncaps: fullCardUncaps,
        allCards: AllCards,
        cardByName: CardByName,
      },
      () => {
        // no-op
      },
      () => false,
      undefined,
    )

    expect(result).not.toBeNull()
    if (!result) return
    expect(result.totalScore).toBeGreaterThanOrEqual(manualScore)
  })
})
