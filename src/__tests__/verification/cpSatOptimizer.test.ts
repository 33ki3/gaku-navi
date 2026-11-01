/**
 * 小さなテスト用編成でTypeScriptの最適化結果をCP-SATへ渡して照合する
 *
 * 通常のVitest全体ではスキップし、専用コマンドからだけPythonを起動する
 */
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import * as constant from '../../constant'
import type { Ability, ParameterValues, ScoreSettings, SupportCard } from '../../types/card'
import * as enums from '../../types/enums'
import type { UnitResult, UnitSimulatorSettings } from '../../types/unit'
import type { OptimizeInput } from '../../types/unitOptimizer'
import { createCardScoreCalculationContext } from '../../utils/calculator/calculateCardScores'
import { createDefaultSettings } from '../../utils/scoreSettings'
import { createRentalPool, prepareCandidates } from '../../utils/unitOptimizer/candidatePreparation'
import { evaluateManualUnit, exhaustiveOptimizeAsync } from '../../utils/unitSimulator'

const describeCpSat = process.env.RUN_CP_SAT_VERIFICATION === '1' ? describe : describe.skip
const verifierPath = resolve(process.cwd(), 'verification/cp_sat/verify_optimizer.py')
const localPython = resolve(
  process.cwd(),
  process.platform === 'win32' ? '.venv/Scripts/python.exe' : '.venv/bin/python',
)
const python = process.env.PYTHON_BIN ?? (existsSync(localPython) ? localPython : 'python3')
const actionIds = Object.values(enums.ActionIdType)

/** スキルカード獲得イベントでアクションを1回提供するテスト用スキルカード */
const testSkillCard = {
  name: 'CP-SAT検証用スキル',
  rarity: enums.SkillCardRarityType.SR,
  type: enums.SkillCardType.Mental,
  lesson_limit: 0,
  no_duplicate: false,
  effects: [
    {
      level: enums.SkillCardLevelType.Base,
      cost_type: enums.CostType.None,
      cost_value: 0,
    },
  ],
  custom_cap: 0,
  custom_slot: [],
}

interface TestCardOptions {
  baseScore?: number
  parameterBonus?: number
  spCategory?: enums.ParameterType
  providesSkillCard?: boolean
  skillAcquireSynergy?: number
}

/** CP-SAT連携fixture用のサポートカードを作る */
function makeCard(
  name: string,
  type: enums.CardType,
  parameterType: enums.ParameterType,
  options: TestCardOptions = {},
): SupportCard {
  const abilities: Ability[] = []
  if (options.baseScore) {
    abilities.push({
      name_key: enums.AbilityNameKeyType.InitialStat,
      trigger_key: enums.TriggerKeyType.LessonEnd,
      parameter_type: parameterType,
      values: { [String(enums.UncapType.Four)]: String(options.baseScore) },
      is_initial_stat: true,
    })
  }
  if (options.parameterBonus !== undefined) {
    abilities.push({
      name_key: enums.AbilityNameKeyType.ParameterBonus,
      trigger_key: enums.TriggerKeyType.LessonEnd,
      parameter_type: parameterType,
      values: { [String(enums.UncapType.Four)]: String(options.parameterBonus) },
      is_parameter_bonus: true,
    })
  }
  if (options.spCategory) {
    const spTrigger = {
      [enums.ParameterType.Vocal]: enums.TriggerKeyType.VoSpLessonRate,
      [enums.ParameterType.Dance]: enums.TriggerKeyType.DaSpLessonRate,
      [enums.ParameterType.Visual]: enums.TriggerKeyType.ViSpLessonRate,
    }[options.spCategory]
    abilities.push({
      name_key: enums.AbilityNameKeyType.SpLessonRate,
      trigger_key: spTrigger,
      values: { [String(enums.UncapType.Four)]: '50' },
      is_percentage: true,
    })
  }
  if (options.skillAcquireSynergy !== undefined) {
    abilities.push({
      name_key: enums.AbilityNameKeyType.SkillAcquire,
      trigger_key: enums.TriggerKeyType.SkillAcquire,
      parameter_type: parameterType,
      values: { [String(enums.UncapType.Four)]: String(options.skillAcquireSynergy) },
      max_count: 1,
    })
  }

  return {
    name,
    rarity: enums.RarityType.SSR,
    plan: enums.PlanType.Sense,
    type,
    parameter_type: parameterType,
    source: enums.SourceType.Gacha,
    release_date: '2026/01/01',
    abilities,
    events: options.providesSkillCard
      ? [{ release: enums.ReleaseConditionType.Initial, effect_type: enums.EventEffectType.SkillCard, title: name }]
      : [],
    p_item: null,
    skill_card: options.providesSkillCard ? testSkillCard : null,
  }
}

/** 6枚編成を計算する、8枚の小さな所有カードfixture */
function makeInput(): OptimizeInput {
  const rentalName = 'rental-assist'
  const cards: SupportCard[] = [
    makeCard(rentalName, enums.CardType.Assist, enums.ParameterType.Vocal, { baseScore: 5 }),
    makeCard('vocal-strong', enums.CardType.Vocal, enums.ParameterType.Vocal, {
      baseScore: 100,
      parameterBonus: 5.5,
      spCategory: enums.ParameterType.Vocal,
    }),
    makeCard('vocal-extra-a', enums.CardType.Vocal, enums.ParameterType.Vocal, { baseScore: 50 }),
    makeCard('vocal-extra-b', enums.CardType.Vocal, enums.ParameterType.Vocal, { baseScore: 50 }),
    makeCard('dance-provider', enums.CardType.Dance, enums.ParameterType.Dance, {
      baseScore: 20,
      spCategory: enums.ParameterType.Dance,
      providesSkillCard: true,
    }),
    makeCard('dance-extra', enums.CardType.Dance, enums.ParameterType.Dance, { baseScore: 60 }),
    makeCard('visual-receiver', enums.CardType.Visual, enums.ParameterType.Visual, {
      skillAcquireSynergy: 40.75,
    }),
    makeCard('visual-extra', enums.CardType.Visual, enums.ParameterType.Visual, { baseScore: 20 }),
  ]
  const settings: UnitSimulatorSettings = {
    plan: enums.PlanType.Sense,
    allowedTypes: [enums.CardType.Vocal, enums.CardType.Dance, enums.CardType.Visual],
    spConstraint: {
      [enums.ParameterType.Vocal]: 1,
      [enums.ParameterType.Dance]: 1,
      [enums.ParameterType.Visual]: 0,
    },
    typeCountMin: {
      [enums.ParameterType.Vocal]: 1,
      [enums.ParameterType.Dance]: 1,
      [enums.ParameterType.Visual]: 1,
    },
    typeCountMax: {
      [enums.ParameterType.Vocal]: 2,
      [enums.ParameterType.Dance]: 2,
      [enums.ParameterType.Visual]: 2,
    },
    paramBonusPercent: {
      [enums.ParameterType.Vocal]: 2.5,
      [enums.ParameterType.Dance]: 0,
      [enums.ParameterType.Visual]: 0,
    },
    rentalCardName: rentalName,
    lockedCards: [rentalName],
    selectedCards: [],
    excludedCardNames: [],
    initialParams: {
      [enums.ParameterType.Vocal]: 0,
      [enums.ParameterType.Dance]: 0,
      [enums.ParameterType.Visual]: 0,
    },
    paramCapOverride: 10_000,
    excludeContestSkillCards: false,
    excludeContestPItems: false,
    exhaustiveCandidateLimit: 20,
  }
  const scoreSettings: ScoreSettings = {
    ...createDefaultSettings(enums.ScenarioType.Custom),
    useCustomMode: true,
    customParamBonusRows: [
      {
        [enums.ParameterType.Vocal]: 100,
        [enums.ParameterType.Dance]: 100,
        [enums.ParameterType.Visual]: 100,
      },
      {
        [enums.ParameterType.Vocal]: 100,
        [enums.ParameterType.Dance]: 100,
        [enums.ParameterType.Visual]: 100,
      },
    ],
  }
  // 所持カードは4凸、未所持のレンタル候補はレンタル用プール側で4凸相当にする
  const cardUncaps = cards.reduce<Record<string, enums.UncapType>>((uncaps, card) => {
    uncaps[card.name] = card.name === rentalName ? enums.UncapType.NotOwned : enums.UncapType.Four
    return uncaps
  }, {})

  return {
    settings,
    scoreSettings,
    cardUncaps,
    cardCountCustom: {},
    allCards: cards,
    cardByName: new Map(cards.map((card) => [card.name, card])),
    excludedCardNames: [],
  }
}

/** 事前計算済みカード情報をスコア式用のJSONへ変換する */
function toModelCard(candidate: ReturnType<typeof prepareCandidates>[number], isRental: boolean) {
  const providedActions = Object.fromEntries(
    candidate.providedActionEntries.map(({ actionIdx, count }) => [actionIds[actionIdx], count]),
  )
  const synergyAbilities = candidate.synergyAbilities.map((ability) => ({
    actionId: actionIds[ability.actionIdx],
    parsedValue: ability.parsedValue,
    maxCount: ability.maxCount ?? null,
    usedCount: ability.usedCount,
  }))
  return {
    id: candidate.card.name,
    name: candidate.card.name,
    type: candidate.card.type,
    parameterType: candidate.card.parameter_type,
    spCategory: candidate.spCategory,
    isRental,
    baseScoreWithoutParamBonus: candidate.baseScoreWithoutParamBonus,
    paramBonusPercent: candidate.paramBonusPercent,
    providedActions,
    synergyAbilities,
  }
}

/** TS Optimizerの結果と、条件内で選べるカード全体をVerifier入力へまとめる */
function makePayload(input: OptimizeInput, result: UnitResult, candidate?: { cardIds: string[]; score: number }) {
  const schedule = createCardScoreCalculationContext(input.scoreSettings)
  const normalCandidates = prepareCandidates(input, schedule)
  const rentalCandidates = createRentalPool(input, schedule, new Set(), 20, normalCandidates)
  const rentalName = input.settings.rentalCardName
  const rentalCandidate = rentalCandidates.find((card) => card.card.name === rentalName)
  if (!rentalCandidate) throw new Error('Fixed rental candidate was not prepared')

  const cards = [
    ...normalCandidates.filter((card) => card.card.name !== rentalName).map((card) => toModelCard(card, false)),
    toModelCard(rentalCandidate, true),
  ]
  const candidateData = candidate ?? {
    cardIds: result.members.map((member) => member.card.name),
    score: result.totalScore,
  }

  return {
    payloadVersion: 1,
    problem: {
      unitSize: constant.UNIT_SIZE,
      typeCountMin: input.settings.typeCountMin,
      typeCountMax: input.settings.typeCountMax,
      spConstraint: input.settings.spConstraint,
      outsideParamBonusPercent: input.settings.paramBonusPercent,
      parameterBonusRows: schedule.parameterBonusRows,
      nonSupportParams: {
        [enums.ParameterType.Vocal]: 0,
        [enums.ParameterType.Dance]: 0,
        [enums.ParameterType.Visual]: 0,
      },
      paramCap: input.settings.paramCapOverride,
      fixedCardIds: [rentalName],
    },
    cards,
    candidate: candidateData,
    timeoutMs: 10_000,
  }
}

/** Python verifierを同期実行し、終了コードとJSON判定を返す */
function runVerifier(payload: object) {
  // 小規模fixtureでは並列起動の負荷を避け、3回の判定を安定して終えるため1 workerにする
  const result = spawnSync(python, [verifierPath], {
    input: JSON.stringify(payload),
    encoding: 'utf8',
    timeout: 30_000,
    env: {
      ...process.env,
      GAKU_NAVI_CP_SAT_SEARCH_WORKERS: process.env.GAKU_NAVI_CP_SAT_SEARCH_WORKERS ?? '1',
    },
  })
  if (result.error) throw result.error
  if (!result.stdout.trim()) throw new Error(result.stderr || 'CP-SAT verifier produced no output')
  return { exitCode: result.status, output: JSON.parse(result.stdout) as Record<string, unknown> }
}

/** CP-SATへ渡す1枚分のカード情報。通常枠とレンタル枠への配置可否を別々に持つ */
interface IndependentVerifierCard {
  id: string
  name: string
  type: string
  parameterType: string
  spCategory: string
  baseScoreWithoutParamBonus: number
  paramBonusPercent: ParameterValues
  providedActions: Record<string, number>
  synergyAbilities: never[]
  normalAllowed: boolean
  rentalAllowed: boolean
}

/** 候補生成を通さずVerifierへ渡す、制約・カード一覧・比較用候補のfixture */
interface IndependentVerifierPayload {
  payloadVersion: number
  problem: {
    unitSize: number
    typeCountMin: ParameterValues
    typeCountMax: ParameterValues
    spConstraint: ParameterValues
    outsideParamBonusPercent: ParameterValues
    parameterBonusRows: ParameterValues[]
    nonSupportParams: ParameterValues
    paramCap: null
    fixedCardIds: string[]
    fixedCardNames: string[]
    fixedRentalCardIds: string[]
  }
  cards: IndependentVerifierCard[]
  candidate: { cardIds: string[]; rentalCardId: string; score: number }
  timeoutMs: number
}

/** アプリ候補生成を通さず、CP-SATへ渡す固定・タイプ・SP条件を作る */
function makeIndependentLockPayload(): IndependentVerifierPayload {
  const makeModelCard = (
    id: string,
    name: string,
    type: string,
    spCategory: string,
    baseScoreWithoutParamBonus: number,
    normalAllowed = true,
    rentalAllowed = false,
  ): IndependentVerifierCard => ({
    id,
    name,
    type,
    parameterType: type === enums.CardType.Assist ? enums.ParameterType.Vocal : type,
    spCategory,
    baseScoreWithoutParamBonus,
    paramBonusPercent: { vocal: 0, dance: 0, visual: 0 },
    providedActions: {},
    synergyAbilities: [],
    normalAllowed,
    rentalAllowed,
  })

  const excludedNames = new Set(['除外カード'])
  const eligibleCards = [
    makeModelCard('locked-vocal', '固定Vo', enums.CardType.Vocal, enums.SpCategoryType.None, 3),
    makeModelCard('all-normal', '同名AllSP', enums.CardType.Assist, enums.SpCategoryType.All, 10, true, true),
    makeModelCard('all-rental', '同名AllSP', enums.CardType.Assist, enums.SpCategoryType.All, 10, false, true),
    makeModelCard('dance-high', 'Da高得点', enums.CardType.Dance, enums.SpCategoryType.None, 20),
    makeModelCard('dance-extra', 'Da補助', enums.CardType.Dance, enums.SpCategoryType.None, 6),
    makeModelCard('visual-high', 'Vi高得点', enums.CardType.Visual, enums.SpCategoryType.None, 8),
    makeModelCard('visual-extra', 'Vi補助', enums.CardType.Visual, enums.SpCategoryType.None, 2),
    makeModelCard('assist-extra', 'Assist候補', enums.CardType.Assist, enums.SpCategoryType.None, 7),
    makeModelCard('vocal-extra', 'Vo候補', enums.CardType.Vocal, enums.SpCategoryType.None, 4),
    makeModelCard('excluded-high', '除外カード', enums.CardType.Dance, enums.SpCategoryType.None, 1_000),
  ].filter((card) => !excludedNames.has(card.name))

  return {
    payloadVersion: 1,
    problem: {
      unitSize: 6,
      typeCountMin: { vocal: 1, dance: 1, visual: 1 },
      typeCountMax: { vocal: 2, dance: 2, visual: 2 },
      spConstraint: { vocal: 1, dance: 1, visual: 1 },
      outsideParamBonusPercent: { vocal: 0, dance: 0, visual: 0 },
      parameterBonusRows: [{ vocal: 0, dance: 0, visual: 0 }],
      nonSupportParams: { vocal: 0, dance: 0, visual: 0 },
      paramCap: null,
      fixedCardIds: ['locked-vocal'],
      fixedCardNames: [],
      fixedRentalCardIds: ['all-rental'],
    },
    cards: eligibleCards,
    candidate: {
      cardIds: ['locked-vocal', 'all-rental', 'dance-high', 'dance-extra', 'visual-high', 'assist-extra'],
      rentalCardId: 'all-rental',
      score: 54,
    },
    timeoutMs: 10_000,
  }
}

/** 固定カード名は保ったまま、通常・レンタル配置をCP-SATへ選ばせるfixture */
function makeFlexibleLockPayload(): IndependentVerifierPayload {
  const makeModelCard = (
    id: string,
    name: string,
    type: string,
    spCategory: string,
    baseScoreWithoutParamBonus: number,
    normalAllowed: boolean,
    rentalAllowed: boolean,
  ): IndependentVerifierCard => ({
    id,
    name,
    type,
    parameterType: type === enums.CardType.Assist ? enums.ParameterType.Vocal : type,
    spCategory,
    baseScoreWithoutParamBonus,
    paramBonusPercent: { vocal: 0, dance: 0, visual: 0 },
    providedActions: {},
    synergyAbilities: [],
    normalAllowed,
    rentalAllowed,
  })

  return {
    payloadVersion: 1,
    problem: {
      unitSize: 2,
      typeCountMin: { vocal: 1, dance: 1, visual: 0 },
      typeCountMax: { vocal: 1, dance: 1, visual: 2 },
      spConstraint: { vocal: 1, dance: 1, visual: 0 },
      outsideParamBonusPercent: { vocal: 0, dance: 0, visual: 0 },
      parameterBonusRows: [{ vocal: 0, dance: 0, visual: 0 }],
      nonSupportParams: { vocal: 0, dance: 0, visual: 0 },
      paramCap: null,
      fixedCardIds: [],
      fixedCardNames: ['固定カード', 'もう1枚の固定カード'],
      fixedRentalCardIds: [],
    },
    cards: [
      makeModelCard('locked-normal', '固定カード', enums.CardType.Vocal, enums.SpCategoryType.All, 5, true, false),
      makeModelCard('locked-rental', '固定カード', enums.CardType.Vocal, enums.SpCategoryType.All, 100, false, true),
      makeModelCard(
        'other-normal',
        'もう1枚の固定カード',
        enums.CardType.Dance,
        enums.SpCategoryType.None,
        1,
        true,
        false,
      ),
      makeModelCard(
        'other-rental',
        'もう1枚の固定カード',
        enums.CardType.Dance,
        enums.SpCategoryType.None,
        10,
        false,
        true,
      ),
    ],
    candidate: {
      cardIds: ['locked-rental', 'other-normal'],
      rentalCardId: 'locked-rental',
      score: 101,
    },
    timeoutMs: 10_000,
  }
}

/** 小規模の生カードfixtureを全組み合わせ列挙し、Verifierの最適点を独立に求める */
function findIndependentVerifierOptimum(payload: IndependentVerifierPayload): {
  ids: string[]
  rentalId: string
  score: number
} {
  const { problem, cards } = payload
  let best: { ids: string[]; rentalId: string; score: number } | null = null
  const selected: IndependentVerifierCard[] = []

  function enumerate(start: number): void {
    if (selected.length === problem.unitSize) {
      const ids = new Set(selected.map((card) => card.id))
      const names = new Set(selected.map((card) => card.name))
      if (names.size !== problem.unitSize) return
      if (problem.fixedCardIds.some((id) => !ids.has(id))) return
      if (problem.fixedCardNames.some((name) => !names.has(name))) return

      for (const rental of selected.filter((card) => card.rentalAllowed)) {
        if (problem.fixedRentalCardIds.some((id) => id !== rental.id)) continue
        if (selected.some((card) => !card.normalAllowed && card.id !== rental.id)) continue

        let satisfiesConstraints = true
        for (const parameter of Object.values(enums.ParameterType)) {
          const typeCount = selected.filter((card) => card.type === parameter).length
          const spCount = selected.filter(
            (card) => card.spCategory === parameter || card.spCategory === enums.SpCategoryType.All,
          ).length
          if (typeCount < problem.typeCountMin[parameter] || typeCount > problem.typeCountMax[parameter]) {
            satisfiesConstraints = false
            break
          }
          if (spCount < problem.spConstraint[parameter]) {
            satisfiesConstraints = false
            break
          }
        }
        if (!satisfiesConstraints) continue

        const score = selected.reduce((sum, card) => sum + card.baseScoreWithoutParamBonus, 0)
        if (!best || score > best.score) best = { ids: [...ids].sort(), rentalId: rental.id, score }
      }
      return
    }

    const remaining = problem.unitSize - selected.length
    for (let index = start; index <= cards.length - remaining; index++) {
      selected.push(cards[index])
      enumerate(index + 1)
      selected.pop()
    }
  }

  enumerate(0)
  if (!best) throw new Error('Independent CP-SAT fixture has no legal lineup')
  return best
}

/** 手動編成評価で指定した名前順のカードを採点する */
function scoreManualDeck(input: OptimizeInput, cardIds: string[]): UnitResult {
  const result = evaluateManualUnit({
    ...input,
    settings: { ...input.settings, selectedCards: cardIds },
  })
  if (!result) throw new Error('Could not evaluate the manual test deck')
  return result
}

describeCpSat('CP-SATによる最適編成検証', () => {
  it('アプリ候補生成から独立した固定・レンタル・SP All fixtureを全列挙oracleと照合する', () => {
    const payload = makeIndependentLockPayload()
    const oracle = findIndependentVerifierOptimum(payload)

    expect(oracle.score).toBe(54)
    expect(oracle.ids).toEqual(payload.candidate.cardIds.slice().sort())

    const result = runVerifier(payload)

    expect(result.exitCode).toBe(0)
    expect(result.output.status).toBe('optimal')
    expect(result.output.optimalScore).toBe(oracle.score)
    expect(result.output.bestRentalCardId).toBe(oracle.rentalId)
    const bestCardIds = result.output.bestCardIds
    if (!Array.isArray(bestCardIds) || bestCardIds.some((id) => typeof id !== 'string')) {
      throw new Error('CP-SAT verifier returned invalid best card IDs')
    }
    expect([...bestCardIds].sort()).toEqual(oracle.ids)
  }, 30_000)

  it('ロック位置を固定名だけで表し、通常・レンタル候補配置を全列挙oracleと照合する', () => {
    const payload = makeFlexibleLockPayload()
    const oracle = findIndependentVerifierOptimum(payload)
    expect(oracle.score).toBe(101)
    expect(oracle.ids).toEqual(['locked-rental', 'other-normal'])
    expect(oracle.rentalId).toBe('locked-rental')

    const result = runVerifier(payload)

    expect(result.exitCode).toBe(0)
    expect(result.output.status).toBe('optimal')
    expect(result.output.optimalScore).toBe(oracle.score)
    expect(result.output.bestRentalCardId).toBe(oracle.rentalId)
    const bestCardIds = result.output.bestCardIds
    if (!Array.isArray(bestCardIds) || bestCardIds.some((id) => typeof id !== 'string')) {
      throw new Error('CP-SAT verifier returned invalid best card IDs')
    }
    expect([...bestCardIds].sort()).toEqual(oracle.ids)
  }, 30_000)

  it('同点編成を受け入れ、低スコア候補と点数不一致を検出する', async () => {
    // 指定した小規模条件をTypeScript Optimizerで解き、6枚編成の最良候補を作る
    const input = makeInput()
    const optimizerResult = await exhaustiveOptimizeAsync(
      input,
      () => {},
      () => false,
    )
    expect(optimizerResult).not.toBeNull()
    if (!optimizerResult) return

    // TypeScriptの最良候補を基準に、CP-SATが同じ最高点を証明できるか確認する
    const optimal = runVerifier(makePayload(input, optimizerResult))
    expect(optimal.exitCode).toBe(0)
    expect(optimal.output.status).toBe('optimal')
    expect(optimal.output.candidateScore).toBe(optimizerResult.totalScore)

    const selectedIds = optimizerResult.members.map((member) => member.card.name)
    const tiedCards = ['vocal-extra-a', 'vocal-extra-b']
    const selectedTie = tiedCards.find((cardId) => selectedIds.includes(cardId))
    const alternateTie = tiedCards.find((cardId) => cardId !== selectedTie)
    expect(selectedTie).toBeDefined()
    expect(alternateTie).toBeDefined()
    if (!selectedTie || !alternateTie) return
    const tiedIds = selectedIds.map((cardId) => (cardId === selectedTie ? alternateTie : cardId))
    const tiedResult = scoreManualDeck(input, tiedIds)
    expect(tiedResult.totalScore).toBe(optimizerResult.totalScore)
    // 同じ点の別編成でも、カード名の一致を要求せず最適として扱うことを確認する
    const tied = runVerifier(makePayload(input, optimizerResult, { cardIds: tiedIds, score: tiedResult.totalScore }))
    expect(tied.exitCode).toBe(0)
    expect(tied.output.status).toBe('optimal')

    const weakerIds = [
      'rental-assist',
      'vocal-strong',
      'vocal-extra-a',
      'dance-provider',
      'dance-extra',
      'visual-extra',
    ]
    const weakerResult = scoreManualDeck(input, weakerIds)
    // 低い点数の編成を基準にすると、より高い候補と点数が返ることを確認する
    const weaker = runVerifier(
      makePayload(input, optimizerResult, { cardIds: weakerIds, score: weakerResult.totalScore }),
    )
    expect(weaker.exitCode).toBe(1)
    expect(weaker.output.status).toBe('non_optimal')
    expect(weaker.output.bestKnownScore).toBeGreaterThan(weakerResult.totalScore)

    // 入力点とカードから再計算した点が違う場合、探索前に不一致を返すことを確認する
    const mismatched = runVerifier(
      makePayload(input, optimizerResult, {
        cardIds: selectedIds,
        score: optimizerResult.totalScore + 1,
      }),
    )
    expect(mismatched.exitCode).toBe(1)
    expect(mismatched.output.status).toBe('score_mismatch')
    expect(mismatched.output.modeledCandidateScore).toBe(optimizerResult.totalScore)
  }, 60_000)
})
