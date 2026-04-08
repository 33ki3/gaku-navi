/**
 * ユニット最適化アルゴリズム
 *
 * 貪欲法（Greedy）+ 局所探索（Swap Optimization）で
 * 最もスコアの高い6枚編成を近似的に求める。
 */
import type { SupportCard, ScoreSettings, CardCalculationResult, ParameterValues } from '../types/card'
import type { UncapType, ActionIdType } from '../types/enums'
import * as enums from '../types/enums'
import type { UnitSimulatorSettings, UnitMember, UnitResult, SpRateConstraint } from '../types/unit'
import type { CardCountCustom } from '../hooks/useCardCountCustom'
import { calculateCardParameter } from './calculator/calculateCard'
import { mergeScheduleCounts } from './scoreSettings'
import { getPerLessonParameterValues } from './calculator/parameterBonus'
import { getProvidedActions, computeUnitSupportSynergy } from './supportSynergy'
import { parseAbility } from './calculator/helpers'
import * as data from '../data'
import * as constant from '../constant'

/**
 * サポートのSP種別を判定する
 *
 * VoSP / DaSP / ViSP / 汎用SP / AllSP / なし を分類する。
 * 汎用SP (sp_lesson_rate) はいずれかのカテゴリに加算。AllSP は対象外。
 *
 * @param card - 対象のサポート
 * @returns SP種別（vocal / dance / visual / none）
 */
function getSpCategory(card: SupportCard): enums.SpCategoryType {
  for (const ability of card.abilities) {
    if (ability.trigger_key === enums.TriggerKeyType.VoSpLessonRate) return enums.SpCategoryType.Vocal
    if (ability.trigger_key === enums.TriggerKeyType.DaSpLessonRate) return enums.SpCategoryType.Dance
    if (ability.trigger_key === enums.TriggerKeyType.ViSpLessonRate) return enums.SpCategoryType.Visual
  }
  return enums.SpCategoryType.None
}

/**
 * サポートのパラメータボーナス%をタイプ別に取得する
 *
 * @param card - 対象のサポート
 * @param uncap - 凸数
 * @returns VoDaVi別のパラメータボーナス%値
 */
function getParamBonusPercent(card: SupportCard, uncap: UncapType): ParameterValues {
  const result: ParameterValues = { vocal: 0, dance: 0, visual: 0 }
  for (const ability of card.abilities) {
    if (ability.is_parameter_bonus) {
      const parsed = parseAbility(ability, uncap)
      const key = parsed.parameterType
      if (key && key in result) {
        result[key as keyof ParameterValues] = parsed.numericValue
      }
    }
  }
  return result
}

/** 候補サポート情報（事前計算済み） */
interface CandidateCard {
  card: SupportCard
  uncap: UncapType
  baseScore: number
  baseResult: CardCalculationResult
  spCategory: enums.SpCategoryType
  paramBonusPercent: ParameterValues
  providedActions: Partial<Record<ActionIdType, number>>
}

/** 最適化の入力パラメータ */
interface OptimizeInput {
  settings: UnitSimulatorSettings
  scoreSettings: ScoreSettings
  cardUncaps: Record<string, UncapType>
  cardCountCustom?: CardCountCustom
}

/**
 * スケジュールからアクション回数とレッスン別パラメータを導出する
 *
 * 複数の関数で共通して行うスケジュール解析処理を共通化したヘルパー。
 * 試験中Pアイテム取得回数をPアイテム取得回数に合算する処理も含む。
 *
 * @param scoreSettings - 点数設定
 * @returns effectiveCounts（アクション回数マップ）と perLessonValues（レッスン別パラメータ）
 */
function resolveSchedule(scoreSettings: ScoreSettings) {
  // シナリオ・難易度からスケジュールデータを取得する
  const schedule = data.getScheduleData(scoreSettings.scenario, scoreSettings.difficulty)
  // スケジュールからアクション別の発動回数マップを構築する
  const effectiveCounts = mergeScheduleCounts(scoreSettings, schedule)
  // 試験中Pアイテム取得回数を通常のPアイテム取得回数に合算する
  const examPItemCount = effectiveCounts[enums.ActionIdType.ExamPItemAcquire] ?? 0
  if (examPItemCount > 0) {
    effectiveCounts[enums.ActionIdType.PItemAcquire] =
      (effectiveCounts[enums.ActionIdType.PItemAcquire] ?? 0) + examPItemCount
  }
  // スケジュール上限あり設定の場合はレッスン別パラメータ値を取得する
  const perLessonValues = scoreSettings.useScheduleLimits
    ? getPerLessonParameterValues(scoreSettings.scheduleSelections, scoreSettings.scenario, scoreSettings.difficulty)
    : undefined
  return { effectiveCounts, perLessonValues }
}

/**
 * 候補サポートをフィルタリング・事前計算する
 *
 * @param input - 最適化入力
 * @returns 候補サポート配列
 */
function prepareCandidates(input: OptimizeInput): CandidateCard[] {
  const { settings, scoreSettings, cardUncaps, cardCountCustom } = input

  // スケジュールからアクション回数を導出する
  const { effectiveCounts, perLessonValues } = resolveSchedule(scoreSettings)

  const candidates: CandidateCard[] = []

  const lockedNameSet = new Set(settings.lockedCards)

  for (const card of data.AllCards) {
    const isLocked = lockedNameSet.has(card.name)

    // プラン不一致の固定サポートは自動解除する（例: アノマリーサポートを固定してセンスで最適化した場合）
    const effectiveLocked = isLocked && (card.plan === settings.plan || card.plan === enums.PlanType.Free)

    // プラン制限: 選択プラン or Free のみ
    if (!effectiveLocked && card.plan !== settings.plan && card.plan !== enums.PlanType.Free) continue

    // タイプ制限
    if (!effectiveLocked && settings.allowedTypes.length > 0 && !settings.allowedTypes.includes(card.type)) continue

    // 凸数（4凸固定モードでは全カード4凸、通常は実際の凸数を使用）
    const uncap = scoreSettings.useFixedUncap ? enums.UncapType.Four : (cardUncaps[card.name] ?? constant.DEFAULT_UNCAP)

    // 未所持サポートはスキップする（4凸固定モードでは全カードが候補）
    if (!scoreSettings.useFixedUncap && uncap === enums.UncapType.NotOwned) continue

    // ベーススコアを計算する
    const customData = cardCountCustom?.[card.name]
    const baseResult = calculateCardParameter(
      card,
      uncap,
      effectiveCounts,
      {},
      scoreSettings.parameterBonusBase,
      scoreSettings.includeSelfTrigger,
      scoreSettings.includePItem,
      perLessonValues,
      customData?.selfTrigger,
      customData?.pItemCount,
    )

    candidates.push({
      card,
      uncap,
      baseScore: baseResult.totalIncrease,
      baseResult,
      spCategory: getSpCategory(card),
      paramBonusPercent: getParamBonusPercent(card, uncap),
      providedActions: getProvidedActions(card, {
        includeSelfTrigger: scoreSettings.includeSelfTrigger,
        includePItem: scoreSettings.includePItem,
      }),
    })
  }

  // ベーススコア降順でソートする（greedy初期解の優先度を決める）
  candidates.sort((a, b) => b.baseScore - a.baseScore)

  return candidates
}

/**
 * SP制約を満たすかチェックする
 *
 * @param members - ユニットメンバー
 * @param constraint - SP制約
 * @returns 制約を満たしていれば true
 */
function meetsSpConstraint(members: CandidateCard[], constraint: SpRateConstraint): boolean {
  let vo = 0
  let da = 0
  let vi = 0
  for (const m of members) {
    if (m.spCategory === enums.SpCategoryType.Vocal) vo++
    else if (m.spCategory === enums.SpCategoryType.Dance) da++
    else if (m.spCategory === enums.SpCategoryType.Visual) vi++
  }
  return vo >= constraint.vocal && da >= constraint.dance && vi >= constraint.visual
}

/**
 * ユニットの合計スコアを計算する（サポート間連携込み）
 *
 * @param members - ユニットメンバー
 * @param input - 最適化入力
 * @returns 合計スコア
 */
function evaluateUnit(members: CandidateCard[], input: OptimizeInput): number {
  const cards = members.map((m) => m.card)
  const { bonusMap: synergyMap } = computeUnitSupportSynergy(cards, input.cardCountCustom, {
    includeSelfTrigger: input.scoreSettings.includeSelfTrigger,
    includePItem: input.scoreSettings.includePItem,
  })

  // ベーススコア合算 + サポート間連携による追加スコア概算
  // 個別パラボは差し引き、ユニット全体のパラメータボーナスを後から加算する（buildResult と同一ロジック）
  let total = 0
  for (const m of members) {
    total += m.baseScore - m.baseResult.parameterBonus

    // サポート間連携による追加回数でスコアを概算する（max_count を考慮）
    const synergyExtra = synergyMap.get(m.card.name)
    if (synergyExtra) {
      for (const ability of m.card.abilities) {
        if (
          ability.skip_calculation ||
          ability.is_percentage ||
          ability.is_event_boost ||
          ability.is_parameter_bonus ||
          ability.is_initial_stat
        )
          continue
        if (!ability.trigger_key) continue
        const actionId = data.TriggerActionMap[ability.trigger_key]
        let extraCount = synergyExtra[actionId] ?? 0
        if (extraCount > 0) {
          // max_count がある場合、baseResult で使用済みの回数を差し引く
          if (ability.max_count !== undefined) {
            const usedDetail = m.baseResult.allAbilityDetails.find((d) => d.nameKey === ability.name_key)
            const usedCount = usedDetail?.count ?? 0
            extraCount = Math.max(0, Math.min(extraCount, ability.max_count - usedCount))
          }
          if (extraCount > 0) {
            const parsed = parseAbility(ability, m.uncap)
            total += Math.floor(parsed.numericValue * extraCount)
          }
        }
      }
    }
  }

  // ユニット全体のパラメータボーナスを加算する（入力値はサポート外なので加算のみ）
  const supportPercent: ParameterValues = { vocal: 0, dance: 0, visual: 0 }
  for (const m of members) {
    for (const key of Object.values(enums.ParameterType)) {
      supportPercent[key] += m.paramBonusPercent[key]
    }
  }
  const base = input.scoreSettings.parameterBonusBase
  for (const key of Object.values(enums.ParameterType)) {
    const totalPercent = supportPercent[key] + input.settings.paramBonusPercent[key]
    total += Math.floor((base[key] * totalPercent) / constant.PERCENT_DIVISOR)
  }

  return total
}

/**
 * 貪欲法で初期解を構築する
 *
 * SP制約を優先しつつ、ベーススコアの高いサポートから選ぶ。
 * SP制約を完全に満たせない場合でも、可能な限りサポートを選択して返す。
 *
 * @param candidates - 候補サポート（スコア降順）
 * @param constraint - SP制約
 * @param lockedCards - 固定サポートの名前セット
 * @param rentalCard - レンタル枠のサポート名（null = 自動）
 * @returns 初期ユニット（最大6枚、候補不足時は6未満）
 */
function greedyInitial(
  candidates: CandidateCard[],
  constraint: SpRateConstraint,
  lockedCards: Set<string>,
  rentalCard: CandidateCard | null,
): CandidateCard[] {
  const selected: CandidateCard[] = []
  const usedNames = new Set<string>()

  // 固定サポートとレンタル枠を先に追加する
  if (rentalCard) {
    selected.push(rentalCard)
    usedNames.add(rentalCard.card.name)
  }
  for (const name of lockedCards) {
    const c = candidates.find((c) => c.card.name === name)
    if (c && !usedNames.has(name)) {
      selected.push(c)
      usedNames.add(name)
    }
  }

  // SP制約を満たすために必要な枚数を確認する
  const spNeeded: Record<enums.SpCategoryType, number> = {
    [enums.SpCategoryType.Vocal]: constraint.vocal,
    [enums.SpCategoryType.Dance]: constraint.dance,
    [enums.SpCategoryType.Visual]: constraint.visual,
    [enums.SpCategoryType.None]: 0,
  }

  // 既にSP枠を埋めている分を差し引く
  for (const m of selected) {
    if (m.spCategory !== enums.SpCategoryType.None && spNeeded[m.spCategory] > 0) {
      spNeeded[m.spCategory]--
    }
  }

  // SP制約を満たすサポートを優先的に追加する（見つからない場合はスキップ）
  const spCategories = [enums.SpCategoryType.Vocal, enums.SpCategoryType.Dance, enums.SpCategoryType.Visual] as const
  for (const category of spCategories) {
    while (spNeeded[category] > 0 && selected.length < constant.UNIT_SIZE) {
      const best = candidates.find((c) => !usedNames.has(c.card.name) && c.spCategory === category)
      if (!best) break // 該当するSPサポートがなくても他のサポートで埋める
      selected.push(best)
      usedNames.add(best.card.name)
      spNeeded[category]--
    }
  }

  // 残り枠をベーススコア上位で埋める
  for (const c of candidates) {
    if (selected.length >= constant.UNIT_SIZE) break
    if (usedNames.has(c.card.name)) continue
    selected.push(c)
    usedNames.add(c.card.name)
  }

  return selected
}

/**
 * 局所探索（Swap）でユニットを改善する
 *
 * ユニット内の非固定サポートを候補サポートと入れ替え、
 * スコアが改善する場合にSwapを実行する。
 *
 * @param unit - 現在のユニット
 * @param candidates - 候補サポート
 * @param input - 最適化入力
 * @param lockedNames - 固定サポート名のセット
 * @returns 改善後のユニット
 */
function localSearch(
  unit: CandidateCard[],
  candidates: CandidateCard[],
  input: OptimizeInput,
  lockedNames: Set<string>,
): CandidateCard[] {
  let current = [...unit]
  let currentScore = evaluateUnit(current, input)

  for (let iter = 0; iter < constant.MAX_SWAP_ITERATIONS; iter++) {
    let improved = false

    for (let i = 0; i < current.length; i++) {
      // 固定サポートはSwapしない
      if (lockedNames.has(current[i].card.name)) continue

      const usedNames = new Set(current.map((c) => c.card.name))

      for (const candidate of candidates) {
        if (usedNames.has(candidate.card.name)) continue

        // Swap を試行する
        const trial = [...current]
        trial[i] = candidate

        // SP制約チェック
        if (!meetsSpConstraint(trial, input.settings.spConstraint)) continue

        const trialScore = evaluateUnit(trial, input)
        if (trialScore > currentScore) {
          current = trial
          currentScore = trialScore
          improved = true
          break // このスロットでの改善が見つかったら次のスロットへ
        }
      }
    }

    if (!improved) break
  }

  return current
}

/**
 * レンタル枠を自動選出する
 *
 * 4凸での再計算でスコアが最も向上するサポートをレンタルとして指定する。
 * 未所持サポートも4凸でのスワップ候補として検討する。
 * 全サポートが4凸の場合はスコアが最も低いサポートをレンタルとする。
 *
 * @param members - 最適化されたサポート配列
 * @param input - 最適化入力
 * @param unownedAt4 - 未所持サポートの4凸候補（レンタル枠検討用）
 * @returns レンタル指定済みサポート配列とレンタルサポート名
 */
function autoDesignateRental(
  members: CandidateCard[],
  input: OptimizeInput,
  unownedAt4: CandidateCard[] = [],
): { members: CandidateCard[]; rentalName: string | null } {
  if (members.length === 0) return { members, rentalName: null }

  // 現在のユニットスコア（シナジー込み）をベースラインとする
  const currentScore = evaluateUnit(members, input)

  // 4凸でないサポートを仮に4凸で再計算し、最もスコア向上が大きいサポートをレンタルに指定
  const { scoreSettings } = input
  const { effectiveCounts, perLessonValues } = resolveSchedule(scoreSettings)

  // 4凸でないサポートの中から最も恩恵の大きいサポートを選ぶ（シナジー込みで評価）
  let bestUpgradeScore = -Infinity
  let bestUpgradeIdx = -1
  let bestUpgradeResult: CardCalculationResult | null = null

  for (let i = 0; i < members.length; i++) {
    const m = members[i]
    if (m.uncap === enums.UncapType.Four) continue
    const customData = input.cardCountCustom?.[m.card.name]
    const result4 = calculateCardParameter(
      m.card,
      enums.UncapType.Four,
      effectiveCounts,
      {},
      scoreSettings.parameterBonusBase,
      scoreSettings.includeSelfTrigger,
      scoreSettings.includePItem,
      perLessonValues,
      customData?.selfTrigger,
      customData?.pItemCount,
    )
    // シナジーを含むユニット全体スコアで評価する
    const trial = [...members]
    trial[i] = {
      ...m,
      uncap: enums.UncapType.Four,
      baseScore: result4.totalIncrease,
      baseResult: result4,
      paramBonusPercent: getParamBonusPercent(m.card, enums.UncapType.Four),
    }
    const trialScore = evaluateUnit(trial, input)
    if (trialScore > bestUpgradeScore) {
      bestUpgradeScore = trialScore
      bestUpgradeIdx = i
      bestUpgradeResult = result4
    }
  }

  // 未所持サポートの4凸スワップを検討する（シナジー込みで評価）
  const lockedNames = new Set(input.settings.lockedCards)
  const memberNames = new Set(members.map((m) => m.card.name))
  let bestSwapScore = -Infinity
  let bestSwapMemberIdx = -1
  let bestSwapCandidate: CandidateCard | null = null

  for (const unowned of unownedAt4) {
    if (memberNames.has(unowned.card.name)) continue
    for (let i = 0; i < members.length; i++) {
      if (lockedNames.has(members[i].card.name)) continue
      const trial = [...members]
      trial[i] = unowned
      if (!meetsSpConstraint(trial, input.settings.spConstraint)) continue
      const trialScore = evaluateUnit(trial, input)
      if (trialScore > bestSwapScore) {
        bestSwapScore = trialScore
        bestSwapMemberIdx = i
        bestSwapCandidate = unowned
      }
    }
  }

  // 4凸でないサポートがあれば4凸昇格と未所持スワップのうちスコアが高い方を選ぶ
  if (bestUpgradeIdx >= 0 && bestUpgradeResult) {
    if (bestSwapScore > bestUpgradeScore && bestSwapCandidate && bestSwapMemberIdx >= 0) {
      // 未所持サポートのスワップの方がユニットスコアが高い
      const updated = [...members]
      updated[bestSwapMemberIdx] = bestSwapCandidate
      return { members: updated, rentalName: bestSwapCandidate.card.name }
    }
    // 既存メンバーを4凸に昇格
    const updated = [...members]
    updated[bestUpgradeIdx] = {
      ...members[bestUpgradeIdx],
      uncap: enums.UncapType.Four,
      baseScore: bestUpgradeResult.totalIncrease,
      baseResult: bestUpgradeResult,
      paramBonusPercent: getParamBonusPercent(members[bestUpgradeIdx].card, enums.UncapType.Four),
    }
    return { members: updated, rentalName: members[bestUpgradeIdx].card.name }
  }

  // 全員4凸の場合: 未所持スワップを検討する
  if (bestSwapScore > currentScore && bestSwapCandidate && bestSwapMemberIdx >= 0) {
    const updated = [...members]
    updated[bestSwapMemberIdx] = bestSwapCandidate
    return { members: updated, rentalName: bestSwapCandidate.card.name }
  }

  // 全員4凸かつ未所持スワップなし: スコアが最も低いサポートをレンタルとする
  const lowestIdx = members.reduce((minIdx, m, i) => (m.baseScore < members[minIdx].baseScore ? i : minIdx), 0)
  return { members, rentalName: members[lowestIdx].card.name }
}

/**
 * ユニット最適化を実行する
 *
 * 設定に基づいて最適な6枚編成を求める。
 *
 * @param input - 最適化入力
 * @returns 最適化結果（候補が不足する場合は null）
 */
export function optimizeUnit(input: OptimizeInput): UnitResult | null {
  const { settings, scoreSettings } = input

  // SP制約バリデーション
  const spTotal = settings.spConstraint.vocal + settings.spConstraint.dance + settings.spConstraint.visual
  if (spTotal > constant.SP_TOTAL_MAX) return null

  // 候補サポートの準備
  const candidates = prepareCandidates(input)
  if (candidates.length === 0) return null

  // レンタル枠のサポート（manualRental は現在常に false だが、将来のUI追加に備えて残す）
  let rentalCandidate: CandidateCard | null = null
  if (settings.manualRental && settings.rentalCardName) {
    const found = candidates.find((c) => c.card.name === settings.rentalCardName)
    if (found) {
      // レンタル枠は4凸で再計算する
      const { effectiveCounts, perLessonValues } = resolveSchedule(scoreSettings)
      const result = calculateCardParameter(
        found.card,
        enums.UncapType.Four,
        effectiveCounts,
        {},
        scoreSettings.parameterBonusBase,
        scoreSettings.includeSelfTrigger,
        scoreSettings.includePItem,
        perLessonValues,
      )
      rentalCandidate = {
        ...found,
        uncap: enums.UncapType.Four,
        baseScore: result.totalIncrease,
        baseResult: result,
        paramBonusPercent: getParamBonusPercent(found.card, enums.UncapType.Four),
      }
    }
  }

  const lockedNames = new Set(settings.lockedCards)

  // Phase 1: 貪欲初期解（候補不足時は6枚未満でも返す）
  const initial = greedyInitial(candidates, settings.spConstraint, lockedNames, rentalCandidate)
  if (initial.length === 0) return null

  // Phase 2: 局所探索（6枚揃っている場合のみ実行）
  const optimized =
    initial.length === constant.UNIT_SIZE ? localSearch(initial, candidates, input, lockedNames) : initial

  // Phase 3: レンタル枠の自動選出（手動指定でない場合）
  if (!settings.manualRental) {
    // 未所持サポートの4凸候補を準備する（レンタル枠検討用）
    const unownedAt4: CandidateCard[] = []
    if (!scoreSettings.useFixedUncap) {
      const { effectiveCounts: uc, perLessonValues: upv } = resolveSchedule(scoreSettings)
      const candidateNames = new Set(candidates.map((c) => c.card.name))
      for (const card of data.AllCards) {
        if (card.plan !== settings.plan && card.plan !== enums.PlanType.Free) continue
        if (settings.allowedTypes.length > 0 && !settings.allowedTypes.includes(card.type)) continue
        const uncap = input.cardUncaps[card.name] ?? constant.DEFAULT_UNCAP
        if (uncap !== enums.UncapType.NotOwned) continue
        if (candidateNames.has(card.name)) continue
        const customData = input.cardCountCustom?.[card.name]
        const baseResult = calculateCardParameter(
          card,
          enums.UncapType.Four,
          uc,
          {},
          scoreSettings.parameterBonusBase,
          scoreSettings.includeSelfTrigger,
          scoreSettings.includePItem,
          upv,
          customData?.selfTrigger,
          customData?.pItemCount,
        )
        unownedAt4.push({
          card,
          uncap: enums.UncapType.Four,
          baseScore: baseResult.totalIncrease,
          baseResult,
          spCategory: getSpCategory(card),
          paramBonusPercent: getParamBonusPercent(card, enums.UncapType.Four),
          providedActions: getProvidedActions(card, {
            includeSelfTrigger: scoreSettings.includeSelfTrigger,
            includePItem: scoreSettings.includePItem,
          }),
        })
      }
    }
    const { members: rentalMembers, rentalName } = autoDesignateRental(optimized, input, unownedAt4)
    return buildResult(rentalMembers, input, rentalName ?? undefined)
  }

  // 結果をまとめる
  return buildResult(optimized, input)
}

/**
 * 最適化結果から UnitResult を構築する
 *
 * @param members - 最適化されたサポート配列
 * @param input - 最適化入力
 * @param autoRentalName - 自動選出されたレンタルサポート名
 * @returns UnitResult
 */
function buildResult(members: CandidateCard[], input: OptimizeInput, autoRentalName?: string): UnitResult {
  const { settings, scoreSettings } = input
  const cards = members.map((m) => m.card)
  const { bonusMap: synergyMap, providerMap: synergyProviderMap } = computeUnitSupportSynergy(
    cards,
    input.cardCountCustom,
    {
      includeSelfTrigger: scoreSettings.includeSelfTrigger,
      includePItem: scoreSettings.includePItem,
    },
  )

  // サポートカードのパラボ%を合計する
  const supportPercent: ParameterValues = { vocal: 0, dance: 0, visual: 0 }
  for (const m of members) {
    for (const key of Object.values(enums.ParameterType)) {
      supportPercent[key] += m.paramBonusPercent[key]
    }
  }

  // 入力値はサポート外パラボ%なのでそのまま使用する
  const outsidePercent: ParameterValues = { ...settings.paramBonusPercent }

  // パラメータボーナス%: サポートのパラボ% + サポート外のパラボ%
  const totalParamBonusPercent: ParameterValues = {
    vocal: supportPercent.vocal + outsidePercent.vocal,
    dance: supportPercent.dance + outsidePercent.dance,
    visual: supportPercent.visual + outsidePercent.visual,
  }

  // パラメータボーナスの実数値を計算する
  const parameterBonus: ParameterValues = { vocal: 0, dance: 0, visual: 0 }
  const base = scoreSettings.parameterBonusBase
  for (const key of Object.values(enums.ParameterType)) {
    parameterBonus[key] = Math.floor((base[key] * totalParamBonusPercent[key]) / constant.PERCENT_DIVISOR)
  }

  // 各メンバーの結果を構築する
  const unitMembers: UnitMember[] = members.map((m) => {
    const synergyExtra = synergyMap.get(m.card.name) ?? {}
    let supportSynergy = 0
    const supportSynergyDetail: Record<string, number> = {}

    // baseResult から各アクションIDの使用済み回数を取得する（max_count 制限をサポート間連携にも適用するため）
    const usedCounts = new Map<string, number>()
    for (const detail of m.baseResult.allAbilityDetails) {
      if (detail.nameKey) {
        // trigger_key → actionId の対応を探す
        const ability = m.card.abilities.find((a) => a.name_key === detail.nameKey && a.trigger_key)
        if (ability?.trigger_key) {
          usedCounts.set(`${ability.trigger_key}`, detail.count)
        }
      }
    }

    for (const ability of m.card.abilities) {
      if (
        ability.skip_calculation ||
        ability.is_percentage ||
        ability.is_event_boost ||
        ability.is_parameter_bonus ||
        ability.is_initial_stat
      )
        continue
      if (!ability.trigger_key) continue
      const actionId = data.TriggerActionMap[ability.trigger_key]
      let extraCount = synergyExtra[actionId] ?? 0
      if (extraCount > 0) {
        // max_count がある場合、baseResult で使用済みの回数との合計が上限を超えないよう制限する
        if (ability.max_count !== undefined) {
          const usedCount = usedCounts.get(ability.trigger_key) ?? 0
          extraCount = Math.max(0, Math.min(extraCount, ability.max_count - usedCount))
        }
        const parsed = parseAbility(ability, m.uncap)
        supportSynergy += Math.floor(parsed.numericValue * extraCount)
        supportSynergyDetail[ability.trigger_key] = (supportSynergyDetail[ability.trigger_key] ?? 0) + extraCount
      }
    }

    const isRental =
      (settings.manualRental && settings.rentalCardName === m.card.name) ||
      (!settings.manualRental && autoRentalName === m.card.name)

    return {
      card: m.card,
      uncap: m.uncap,
      isRental,
      result: m.baseResult,
      supportSynergy,
      supportSynergyDetail,
      synergyProviders: synergyProviderMap.get(m.card.name) ?? [],
      paramBonusPercent: m.paramBonusPercent,
    }
  })

  // totalIncrease にはサポート個別のパラボが含まれているので差し引き、ユニット全体のパラボを加算する
  const totalScore =
    unitMembers.reduce((sum, m) => sum + (m.result.totalIncrease - m.result.parameterBonus) + m.supportSynergy, 0) +
    parameterBonus.vocal +
    parameterBonus.dance +
    parameterBonus.visual

  return {
    members: unitMembers,
    totalScore,
    totalParamBonusPercent,
    parameterBonus,
    parameterBonusBase: { ...base },
    outsideParamBonusPercent: outsidePercent,
  }
}

/**
 * 手動選択ユニットを評価する
 *
 * 指定されたサポート名リストからユニットの合計スコアを計算する。
 * 6枚未満でも計算可能（部分ユニット）。
 *
 * @param input - 最適化入力（settings.manualCards を使用）
 * @returns 計算結果（サポートが0枚の場合は null）
 */
export function evaluateManualUnit(input: OptimizeInput): UnitResult | null {
  const { settings, scoreSettings, cardUncaps } = input

  if (settings.manualCards.length === 0) return null

  // null スロットを除外してサポート名リストを取得する
  const cardNames = settings.manualCards.filter((n): n is string => n !== null)
  if (cardNames.length === 0) return null

  // スケジュールからアクション回数を導出する
  const { effectiveCounts, perLessonValues } = resolveSchedule(scoreSettings)

  // サポート名からサポートを検索して計算する
  const candidates: CandidateCard[] = []
  for (const cardName of cardNames) {
    const card = data.CardByName.get(cardName)
    if (!card) continue

    // 凸数: 4凸固定モード or レンタル枠なら4凸、それ以外は設定された凸数
    const isRental = settings.manualRental && settings.rentalCardName === cardName
    const uncap =
      scoreSettings.useFixedUncap || isRental ? enums.UncapType.Four : (cardUncaps[card.name] ?? constant.DEFAULT_UNCAP)
    const customData = input.cardCountCustom?.[card.name]
    const baseResult = calculateCardParameter(
      card,
      uncap,
      effectiveCounts,
      {},
      scoreSettings.parameterBonusBase,
      scoreSettings.includeSelfTrigger,
      scoreSettings.includePItem,
      perLessonValues,
      customData?.selfTrigger,
      customData?.pItemCount,
    )

    candidates.push({
      card,
      uncap,
      baseScore: baseResult.totalIncrease,
      baseResult,
      spCategory: getSpCategory(card),
      paramBonusPercent: getParamBonusPercent(card, uncap),
      providedActions: getProvidedActions(card, {
        includeSelfTrigger: scoreSettings.includeSelfTrigger,
        includePItem: scoreSettings.includePItem,
      }),
    })
  }

  if (candidates.length === 0) return null

  // レンタル枠の自動選出（手動指定でない場合）
  if (!settings.manualRental) {
    const { members: rentalMembers, rentalName } = autoDesignateRental(candidates, input)
    return buildResult(rentalMembers, input, rentalName ?? undefined)
  }

  return buildResult(candidates, input)
}
