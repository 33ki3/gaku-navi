/**
 * ユニット最適化アルゴリズム
 *
 * 貪欲法（Greedy）+ 局所探索（Swap Optimization）で
 * 最もスコアの高い6枚編成を近似的に求める。
 */
import type {
  SupportCard,
  ScoreSettings,
  CardCalculationResult,
  ParameterValues,
  PerLessonParameterValues,
} from '../types/card'
import type { UncapType } from '../types/enums'
import * as enums from '../types/enums'
import type { UnitSimulatorSettings, UnitMember, UnitResult, SpRateConstraint, TypeCountValues } from '../types/unit'
import type { CardCountCustom } from '../hooks/useCardCountCustom'
import { calculateCardParameter } from './calculator/calculateCard'
import { mergeScheduleCounts } from './scoreSettings'
import { getPerLessonParameterValues } from './calculator/parameterBonus'
import { computeUnitSupportSynergy } from './supportSynergy'
import { parseAbility } from './calculator/helpers'
import { getParamCap } from '../data/score/paramCap'
import { getSpLessonTotal } from '../data/score/lesson'
import { getExamData } from '../data/score/exam'
import * as data from '../data'
import * as constant from '../constant'

/** ParameterType の値配列（ホットパスで Object.values() の再生成を避ける） */
const PARAMETER_TYPES = Object.values(enums.ParameterType)

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
}

/** 最適化の入力パラメータ */
interface OptimizeInput {
  settings: UnitSimulatorSettings
  scoreSettings: ScoreSettings
  cardUncaps: Record<string, UncapType>
  cardCountCustom?: CardCountCustom
}

/** resolveSchedule の戻り値型 */
interface ResolvedSchedule {
  effectiveCounts: Partial<Record<enums.ActionIdType, number>>
  perLessonValues: PerLessonParameterValues | undefined
}

/** パラメータキャップ最適化用の事前計算済み値 */
interface ParameterContext {
  /** サポート以外のパラメータ上昇量（初期パラ + SPレッスン + 試験） */
  nonSupportParams: ParameterValues
  /** パラメータ上限（null = 上限なし） */
  paramCap: number | null
}

/**
 * パラメータキャップ最適化コンテキストを構築する
 *
 * 初期パラメータ・SPレッスン・試験などサポート以外のパラメータ上昇量を
 * 事前計算し、パラメータ上限と合わせてコンテキストにまとめる。
 *
 * @param input - 最適化入力
 * @returns パラメータキャップ最適化コンテキスト
 */
function buildParameterContext(input: OptimizeInput): ParameterContext {
  const { settings, scoreSettings } = input
  const { scenario, difficulty, scheduleSelections } = scoreSettings

  // SPレッスン上昇量
  const spLesson = getSpLessonTotal(scenario, difficulty, scheduleSelections)

  // 試験上昇量（中間 + 最終）
  const examData = getExamData(scenario, difficulty)

  // サポート以外のパラメータ上昇量を合算する
  const nonSupportParams: ParameterValues = { vocal: 0, dance: 0, visual: 0 }
  for (const key of PARAMETER_TYPES) {
    nonSupportParams[key] = settings.initialParams[key] + spLesson[key] + examData.mid[key] + examData.final[key]
  }

  return {
    nonSupportParams,
    paramCap: getParamCap(scenario, difficulty),
  }
}

/**
 * スケジュールからアクション回数とレッスン別パラメータを導出する
 *
 * 複数の関数で共通して行うスケジュール解析処理を共通化したヘルパー。
 * 試験中Pアイテム取得回数をPアイテム取得回数に合算する処理も含む。
 *
 * @param scoreSettings - 点数設定
 * @returns スケジュール解析結果（アクション別発動回数マップ + レッスン別パラメータ値）
 */
function resolveSchedule(scoreSettings: ScoreSettings): ResolvedSchedule {
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
 * @param schedule - スケジュール解析結果（resolveSchedule の戻り値）
 * @returns 候補サポート配列
 */
function prepareCandidates(input: OptimizeInput, schedule: ResolvedSchedule): CandidateCard[] {
  const { settings, scoreSettings, cardUncaps, cardCountCustom } = input

  const { effectiveCounts, perLessonValues } = schedule

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
    // 固定サポートが未所持の場合はレンタル枠として4凸で扱う
    let uncap = scoreSettings.useFixedUncap ? enums.UncapType.Four : (cardUncaps[card.name] ?? constant.DEFAULT_UNCAP)
    if (effectiveLocked && uncap === enums.UncapType.NotOwned) {
      uncap = enums.UncapType.Four
    }

    // 未所持サポートはスキップする（4凸固定モード・固定サポートは除く）
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
 * タイプ別編成枚数制約を満たすかチェックする
 *
 * @param members - ユニットメンバー
 * @param constraint - タイプ別編成枚数制約
 * @returns 制約を満たしていれば true
 */
function meetsTypeConstraint(
  members: CandidateCard[],
  typeCountMin: TypeCountValues,
  typeCountMax: TypeCountValues,
): boolean {
  let vocal = 0
  let dance = 0
  let visual = 0
  for (const m of members) {
    switch (m.card.type) {
      case enums.ParameterType.Vocal:
        vocal++
        break
      case enums.ParameterType.Dance:
        dance++
        break
      case enums.ParameterType.Visual:
        visual++
        break
    }
  }
  if (vocal < typeCountMin.vocal || vocal > typeCountMax.vocal) return false
  if (dance < typeCountMin.dance || dance > typeCountMax.dance) return false
  if (visual < typeCountMin.visual || visual > typeCountMax.visual) return false
  return true
}

/**
 * ユニットの合計パラメータを計算する（サポート間連携・パラメータキャップ込み）
 *
 * サポート点数をパラメータタイプ別に集計し、サポート外パラメータと合算した上で
 * パラメータ上限（2800等）を適用した合計値を返す。
 *
 * @param members - ユニットメンバー
 * @param input - 最適化入力
 * @param effectiveCounts - スケジュールから導出されたアクション別発動回数マップ
 * @param paramCtx - パラメータキャップ最適化コンテキスト
 * @returns 合計パラメータ値（キャップ適用済み）
 */
function evaluateUnit(
  members: CandidateCard[],
  input: OptimizeInput,
  effectiveCounts: Partial<Record<enums.ActionIdType, number>>,
  paramCtx: ParameterContext,
): number {
  const cards = members.map((m) => m.card)
  const { bonusMap: synergyMap } = computeUnitSupportSynergy(cards, input.cardCountCustom, {
    includeSelfTrigger: input.scoreSettings.includeSelfTrigger,
    includePItem: input.scoreSettings.includePItem,
    actionCounts: effectiveCounts,
  })

  // サポート点数をパラメータタイプ別に集計する
  const supportScore: ParameterValues = { vocal: 0, dance: 0, visual: 0 }
  for (const m of members) {
    // 個別パラボを含むベーススコアをそのまま parameter_type に集計する（パラボは後で再計算）
    const paramKey = m.card.parameter_type as keyof ParameterValues
    if (!(paramKey in supportScore)) continue
    supportScore[paramKey] += m.baseScore - m.baseResult.parameterBonus

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
            supportScore[paramKey] += Math.floor(parsed.numericValue * extraCount)
          }
        }
      }
    }
  }

  // ユニット全体のパラメータボーナスを加算する
  const supportPercent: ParameterValues = { vocal: 0, dance: 0, visual: 0 }
  for (const m of members) {
    for (const key of PARAMETER_TYPES) {
      supportPercent[key] += m.paramBonusPercent[key]
    }
  }
  const base = input.scoreSettings.parameterBonusBase
  for (const key of PARAMETER_TYPES) {
    const totalPercent = supportPercent[key] + input.settings.paramBonusPercent[key]
    supportScore[key] += Math.floor((base[key] * totalPercent) / constant.PERCENT_DIVISOR)
  }

  // サポート外パラメータと合算してキャップを適用する
  let total = 0
  for (const key of PARAMETER_TYPES) {
    const raw = paramCtx.nonSupportParams[key] + supportScore[key]
    total += paramCtx.paramCap !== null ? Math.min(raw, paramCtx.paramCap) : raw
  }

  return total
}

/**
 * 貪欲法で初期解を構築する
 *
 * SP制約・タイプ別枚数制約を優先しつつ、ベーススコアの高いサポートから選ぶ。
 * 制約を完全に満たせない場合でも、可能な限りサポートを選択して返す。
 *
 * @param candidates - 候補サポート（スコア降順）
 * @param constraint - SP制約
 * @param typeCountMin - タイプ別最小枚数
 * @param typeCountMax - タイプ別最大枚数
 * @param lockedCards - 固定サポートの名前セット
 * @param rentalCard - レンタル枠のサポート名（null = 自動）
 * @returns 初期ユニット（最大6枚、候補不足時は6未満）
 */
function greedyInitial(
  candidates: CandidateCard[],
  constraint: SpRateConstraint,
  typeCountMin: TypeCountValues,
  typeCountMax: TypeCountValues,
  lockedCards: Set<string>,
  rentalCard: CandidateCard | null,
): CandidateCard[] {
  const selected: CandidateCard[] = []
  const usedNames = new Set<string>()

  // タイプ別枚数カウンター（全フェーズで共通管理する。Assistは制約対象外）
  const typeCounts: Record<enums.ParameterType, number> = {
    [enums.ParameterType.Vocal]: 0,
    [enums.ParameterType.Dance]: 0,
    [enums.ParameterType.Visual]: 0,
  }

  // 固定サポートとレンタル枠を先に追加する
  if (rentalCard) {
    selected.push(rentalCard)
    usedNames.add(rentalCard.card.name)
    if (rentalCard.card.type in typeCounts) typeCounts[rentalCard.card.type as enums.ParameterType]++
  }
  for (const name of lockedCards) {
    const c = candidates.find((c) => c.card.name === name)
    if (c && !usedNames.has(name)) {
      selected.push(c)
      usedNames.add(name)
      if (c.card.type in typeCounts) typeCounts[c.card.type as enums.ParameterType]++
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

  // SP制約を満たすサポートを優先的に追加する（タイプ最大枚数も考慮）
  const spCategories = [enums.SpCategoryType.Vocal, enums.SpCategoryType.Dance, enums.SpCategoryType.Visual] as const
  for (const category of spCategories) {
    while (spNeeded[category] > 0 && selected.length < constant.UNIT_SIZE) {
      const best = candidates.find(
        (c) =>
          !usedNames.has(c.card.name) &&
          c.spCategory === category &&
          (!(c.card.type in typeCounts) ||
            typeCounts[c.card.type as enums.ParameterType] < typeCountMax[c.card.type as enums.ParameterType]),
      )
      if (!best) break // 該当するSPサポートがなくても他のサポートで埋める
      selected.push(best)
      usedNames.add(best.card.name)
      if (best.card.type in typeCounts) typeCounts[best.card.type as enums.ParameterType]++
      spNeeded[category]--
    }
  }

  // タイプ別最小枚数制約を満たすサポートを優先的に追加する
  for (const type of PARAMETER_TYPES) {
    while (typeCounts[type] < typeCountMin[type] && selected.length < constant.UNIT_SIZE) {
      const best = candidates.find((c) => !usedNames.has(c.card.name) && c.card.type === type)
      if (!best) break
      selected.push(best)
      usedNames.add(best.card.name)
      typeCounts[type]++
    }
  }

  // 残り枠をベーススコア上位で埋める（タイプ最大枚数制約を考慮）
  for (const c of candidates) {
    if (selected.length >= constant.UNIT_SIZE) break
    if (usedNames.has(c.card.name)) continue
    // タイプ最大枚数を超えるサポートはスキップする（Assistは制約なし）
    if (
      c.card.type in typeCounts &&
      typeCounts[c.card.type as enums.ParameterType] >= typeCountMax[c.card.type as enums.ParameterType]
    )
      continue
    selected.push(c)
    usedNames.add(c.card.name)
    if (c.card.type in typeCounts) typeCounts[c.card.type as enums.ParameterType]++
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
 * @param effectiveCounts - スケジュールから導出されたアクション別発動回数マップ
 * @param paramCtx - パラメータキャップ最適化コンテキスト
 * @returns 改善後のユニット
 */
function localSearch(
  unit: CandidateCard[],
  candidates: CandidateCard[],
  input: OptimizeInput,
  lockedNames: Set<string>,
  effectiveCounts: Partial<Record<enums.ActionIdType, number>>,
  paramCtx: ParameterContext,
): CandidateCard[] {
  let current = [...unit]
  let currentScore = evaluateUnit(current, input, effectiveCounts, paramCtx)

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
        // タイプ別枚数制約チェック
        if (!meetsTypeConstraint(trial, input.settings.typeCountMin, input.settings.typeCountMax)) continue

        const trialScore = evaluateUnit(trial, input, effectiveCounts, paramCtx)
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
 * @param schedule - スケジュール解析結果（resolveSchedule の戻り値）
 * @param paramCtx - パラメータキャップ最適化コンテキスト
 * @param unownedAt4 - 未所持サポートの4凸候補（レンタル枠検討用）
 * @returns レンタル指定済みサポート配列とレンタルサポート名
 */
function autoDesignateRental(
  members: CandidateCard[],
  input: OptimizeInput,
  schedule: ResolvedSchedule,
  paramCtx: ParameterContext,
  unownedAt4: CandidateCard[] = [],
): { members: CandidateCard[]; rentalName: string | null } {
  if (members.length === 0) return { members, rentalName: null }

  // 現在のユニットスコア（シナジー込み）をベースラインとする
  const currentScore = evaluateUnit(members, input, schedule.effectiveCounts, paramCtx)

  // 4凸でないサポートを仮に4凸で再計算し、最もスコア向上が大きいサポートをレンタルに指定
  const { scoreSettings } = input
  const { effectiveCounts, perLessonValues } = schedule

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
    const trialScore = evaluateUnit(trial, input, effectiveCounts, paramCtx)
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
      if (!meetsTypeConstraint(trial, input.settings.typeCountMin, input.settings.typeCountMax)) continue
      const trialScore = evaluateUnit(trial, input, effectiveCounts, paramCtx)
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

  // タイプ別枚数制約バリデーション
  const typeMinTotal = PARAMETER_TYPES.reduce((s, t) => s + settings.typeCountMin[t], 0)
  const typeMaxTotal = PARAMETER_TYPES.reduce((s, t) => s + settings.typeCountMax[t], 0)
  if (typeMinTotal > constant.UNIT_SIZE) return null
  if (typeMaxTotal < constant.UNIT_SIZE) return null

  // スケジュール解析（1回だけ実行してキャッシュする）
  const schedule = resolveSchedule(scoreSettings)

  // パラメータキャップ最適化コンテキストを構築する
  const paramCtx = buildParameterContext(input)

  // 候補サポートの準備
  const candidates = prepareCandidates(input, schedule)
  if (candidates.length === 0) return null

  // レンタル枠のサポート（manualRental は現在常に false だが、将来のUI追加に備えて残す）
  let rentalCandidate: CandidateCard | null = null
  if (settings.manualRental && settings.rentalCardName) {
    const found = candidates.find((c) => c.card.name === settings.rentalCardName)
    if (found) {
      // レンタル枠は4凸で再計算する
      const result = calculateCardParameter(
        found.card,
        enums.UncapType.Four,
        schedule.effectiveCounts,
        {},
        scoreSettings.parameterBonusBase,
        scoreSettings.includeSelfTrigger,
        scoreSettings.includePItem,
        schedule.perLessonValues,
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
  const initial = greedyInitial(
    candidates,
    settings.spConstraint,
    settings.typeCountMin,
    settings.typeCountMax,
    lockedNames,
    rentalCandidate,
  )
  if (initial.length === 0) return null

  // Phase 2: 局所探索（6枚揃っている場合のみ実行）
  const optimized =
    initial.length === constant.UNIT_SIZE
      ? localSearch(initial, candidates, input, lockedNames, schedule.effectiveCounts, paramCtx)
      : initial

  // Phase 3: レンタル枠の自動選出（手動指定でない場合）
  if (!settings.manualRental) {
    // 未所持サポートの4凸候補を準備する（レンタル枠検討用）
    const unownedAt4: CandidateCard[] = []
    if (!scoreSettings.useFixedUncap) {
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
          schedule.effectiveCounts,
          {},
          scoreSettings.parameterBonusBase,
          scoreSettings.includeSelfTrigger,
          scoreSettings.includePItem,
          schedule.perLessonValues,
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
        })
      }
      // ベーススコア上位のみをレンタル候補として残す
      unownedAt4.sort((a, b) => b.baseScore - a.baseScore)
      unownedAt4.length = Math.min(unownedAt4.length, constant.UNIT_SIZE * 2)
    }
    const { members: rentalMembers, rentalName } = autoDesignateRental(optimized, input, schedule, paramCtx, unownedAt4)

    // Phase 4: レンタルスワップ後の局所探索
    // autoDesignateRental が未所持サポートをスワップインした場合、ユニット構成が変わるため
    // 再度局所探索を実行してシナジー最適化の機会を拾う
    // レンタル枠は固定して探索空間を削減する
    const rentalChanged = rentalMembers.some((m, i) => m.card.name !== optimized[i]?.card.name)
    let postRental = rentalMembers
    if (rentalChanged && rentalMembers.length === constant.UNIT_SIZE) {
      const phase4Locked = rentalName ? new Set([...lockedNames, rentalName]) : lockedNames
      postRental = localSearch(rentalMembers, candidates, input, phase4Locked, schedule.effectiveCounts, paramCtx)
    }

    // レンタルスワップ後の局所探索でレンタル対象が入れ替わった場合はレンタル名を維持する
    const finalRentalName = postRental.some((m) => m.card.name === rentalName) ? rentalName : null

    return buildResult(postRental, input, schedule.effectiveCounts, finalRentalName ?? undefined)
  }

  // 結果をまとめる
  return buildResult(optimized, input, schedule.effectiveCounts)
}

/**
 * 最適化結果から UnitResult を構築する
 *
 * @param members - 最適化されたサポート配列
 * @param input - 最適化入力
 * @param effectiveCounts - スケジュールから導出されたアクション別発動回数マップ
 * @param autoRentalName - 自動選出されたレンタルサポート名
 * @returns UnitResult
 */
function buildResult(
  members: CandidateCard[],
  input: OptimizeInput,
  effectiveCounts: Partial<Record<enums.ActionIdType, number>>,
  autoRentalName?: string,
): UnitResult {
  const { settings, scoreSettings } = input
  const cards = members.map((m) => m.card)
  const { bonusMap: synergyMap, providerMap: synergyProviderMap } = computeUnitSupportSynergy(
    cards,
    input.cardCountCustom,
    {
      includeSelfTrigger: scoreSettings.includeSelfTrigger,
      includePItem: scoreSettings.includePItem,
      actionCounts: effectiveCounts,
    },
  )

  // サポートカードのパラボ%を合計する
  const supportPercent: ParameterValues = { vocal: 0, dance: 0, visual: 0 }
  for (const m of members) {
    for (const key of PARAMETER_TYPES) {
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
  for (const key of PARAMETER_TYPES) {
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

  // サポート点数合計をパラメータタイプ別に集計する（キャップ適用のため）
  // 個別パラボは除外し、ユニット全体のパラボはparameterBonusで別途加算する
  const supportScore: ParameterValues = { vocal: 0, dance: 0, visual: 0 }
  for (const m of unitMembers) {
    const paramKey = m.card.parameter_type as keyof ParameterValues
    if (paramKey in supportScore) {
      supportScore[paramKey] += m.result.totalIncrease - m.result.parameterBonus + m.supportSynergy
    }
  }

  // パラメータキャップを適用した合計パラメータを算出する
  const paramCtx = buildParameterContext(input)
  let totalScore = 0
  for (const key of PARAMETER_TYPES) {
    const raw = paramCtx.nonSupportParams[key] + supportScore[key] + parameterBonus[key]
    totalScore += paramCtx.paramCap !== null ? Math.min(raw, paramCtx.paramCap) : raw
  }

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

  // レンタル枠は末尾スロット（6枠目）のカードから導出する
  const padded = [...settings.manualCards]
  while (padded.length < constant.UNIT_SIZE) padded.push(null)
  const derivedRentalName = settings.manualRental ? padded[constant.UNIT_SIZE - 1] : null

  // スケジュールからアクション回数を導出する
  const schedule = resolveSchedule(scoreSettings)
  const { effectiveCounts, perLessonValues } = schedule

  // レンタル名を導出値で上書きした入力を作成する
  const evalInput: OptimizeInput = {
    ...input,
    settings: { ...settings, rentalCardName: derivedRentalName },
  }

  // サポート名からサポートを検索して計算する
  const candidates: CandidateCard[] = []
  for (const cardName of cardNames) {
    const card = data.CardByName.get(cardName)
    if (!card) continue

    // 凸数: 4凸固定モード or レンタル枠なら4凸、それ以外は設定された凸数
    const isRental = settings.manualRental && derivedRentalName === cardName
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
    })
  }

  if (candidates.length === 0) return null

  return buildResult(candidates, evalInput, effectiveCounts)
}
