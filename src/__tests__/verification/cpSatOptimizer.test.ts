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
import type { Ability, ScoreSettings, SupportCard } from '../../types/card'
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
function runVerifier(payload: ReturnType<typeof makePayload>) {
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
