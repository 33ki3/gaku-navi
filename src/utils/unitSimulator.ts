/**
 * 編成最適化アルゴリズム
 *
 * 総当たり探索でSP・タイプ条件を満たす組み合わせを評価し、
 * 最もスコアの高い6枚編成を求める
 */
import * as constant from '../constant'
import * as data from '../data'
import * as scoreData from '../data/score'
import * as paramCapData from '../data/score/paramCap'
import type { CardScoreCalculationContext } from '../types/calculation'
import type { ParameterValues } from '../types/card'
import * as enums from '../types/enums'
import type { SupportSynergyDetail, TypeCountValues, UnitMember, UnitResult } from '../types/unit'
import type { OptimizeInput } from '../types/unitOptimizer'
import { createCardScoreCalculationContext } from './calculator/calculateCardScores'
import { calculateParameterBonus } from './calculator/parameterBonus'
import { computeUnitSupportSynergy } from './supportSynergy'
import { getLockedRentalCardName } from './unitCardSelection'
import type { CandidateCard, SearchBranch } from './unitOptimizer/candidatePreparation'
import {
  createCandidateCard,
  createFixedCandidates,
  createRentalPool,
  createSearchBranches,
  prepareCandidates,
} from './unitOptimizer/candidatePreparation'
import { spTypeConstrainedCombos } from './unitOptimizer/combinatorics'
import { createEvaluatorSeed, evaluateUnitScoreWithSeed } from './unitOptimizer/evaluator'
import { getSynergyExtraCount } from './unitOptimizer/synergyScore'
import { selectSynergyCandidates } from './unitOptimizer/synergySelection'

/** 3種類のパラメータを繰り返し使うため、アプリ起動時に一度だけ作る一覧 */
const PARAMETER_TYPES = Object.values(enums.ParameterType)

export type { OptimizeInput } from '../types/unitOptimizer'

/** 総当たり最適化オプション */
interface ExhaustiveOptimizeOptions {
  onStats?: (stats: ExhaustiveOptimizeStats) => void
}

/** 総当たり最適化の統計 */
interface ExhaustiveOptimizeStats {
  /** 実際に点数を比較した組み合わせ数 */
  evaluatedCombos: number
  /** レンタル枝として訪問した件数 */
  rentalBranchesVisited: number
}

/** パラメータ上限を考慮するための事前計算値 */
interface ParameterContext {
  /** サポート以外のパラメータ上昇量（初期値・SPレッスン・試験など） */
  nonSupportParams: ParameterValues
  /** パラメータ上限（null = 上限なし） */
  paramCap: number | null
}

/** 手動・自動レンタルの最適化結果 */
interface OptimizeBranchResult {
  /** 最高スコア */
  bestScore: number
  /** 最高スコアを達成したメンバー配列 */
  bestMembers: CandidateCard[] | null
  /** 計算結果として選ばれたレンタル名（手動指定時は指定名） */
  bestRentalName: string | null
  /** 実際に点数を比較した組み合わせ数 */
  evaluatedCombos: number
  /** 自動レンタルで確認した候補数 */
  rentalBranchesVisited: number
}

/**
 * 総組み合わせ数に応じた進捗のまとめ方を計算する
 *
 * 画面更新回数をおおむね一定に保ちながら、
 * 小規模探索では更新を細かく、大規模探索では更新オーバーヘッドを抑える
 *
 * @param totalCombos - 総組み合わせ数
 * @returns バッチサイズ
 */
function resolveExhaustiveBatchSize(totalCombos: number): number {
  // 少ない組み合わせでも進捗を細かく知らせられるよう、切り上げて間隔を決める
  const estimated = Math.ceil(totalCombos / constant.EXHAUSTIVE_PROGRESS_TARGET_UPDATES)
  return Math.max(
    constant.EXHAUSTIVE_PROGRESS_MIN_BATCH_SIZE,
    Math.min(constant.EXHAUSTIVE_PROGRESS_MAX_BATCH_SIZE, estimated),
  )
}

/**
 * パラメータ上限を考慮するための計算条件を作る
 *
 * 初期パラメータ・SPレッスン・試験などサポート以外のパラメータ上昇量を
 * 事前計算し、パラメータ上限と合わせてまとめる
 *
 * @param input - 最適化入力
 * @returns パラメータキャップ最適化コンテキスト
 */
function buildParameterContext(input: OptimizeInput): ParameterContext {
  const { settings, scoreSettings } = input
  const { scenario, scheduleSelections } = scoreSettings

  // SPレッスンによる上昇量を求める
  // HIFの表示設定も渡し、点数設定画面と最適編成結果で同じ週条件を使う
  const spLesson = scoreData.getSpLessonTotal(
    scenario,
    scoreSettings.difficulty,
    scheduleSelections,
    scoreSettings.hifLessonSplitSub,
  )

  // 授業上昇量（通常モードのみ）
  const classTotalGain = scoreSettings.useCustomMode
    ? { vocal: 0, dance: 0, visual: 0 }
    : scoreData.getClassParameterTotal(scenario, scoreSettings.difficulty, scheduleSelections)

  // 試験上昇量
  const examTotalGain = scoreSettings.useCustomMode
    ? { vocal: 0, dance: 0, visual: 0 }
    : scoreSettings.scenario === enums.ScenarioType.Hif
      ? scoreData.getHifExamTotalData(scoreSettings.hifExamRatios)
      : scoreData.getExamTotalData(scoreSettings.scenario, scoreSettings.difficulty)

  const customTargetGain = scoreSettings.useCustomMode
    ? scoreSettings.parameterBonusBase
    : { vocal: 0, dance: 0, visual: 0 }

  // カスタムモードでは、授業や試験などパラメータボーナス対象外の入力値も合計する
  const customNonBonusGain = scoreSettings.useCustomMode
    ? {
        vocal: scoreSettings.customClassBonus.vocal + scoreSettings.customNonBonusGain.vocal,
        dance: scoreSettings.customClassBonus.dance + scoreSettings.customNonBonusGain.dance,
        visual: scoreSettings.customClassBonus.visual + scoreSettings.customNonBonusGain.visual,
      }
    : { vocal: 0, dance: 0, visual: 0 }

  // サポート以外のパラメータ上昇量を合算する
  const nonSupportParams: ParameterValues = { vocal: 0, dance: 0, visual: 0 }
  for (const key of PARAMETER_TYPES) {
    nonSupportParams[key] =
      settings.initialParams[key] +
      spLesson[key] +
      classTotalGain[key] +
      customTargetGain[key] +
      examTotalGain[key] +
      customNonBonusGain[key]
  }

  return {
    nonSupportParams,
    paramCap: paramCapData.resolveParamCap(scenario, scoreSettings.difficulty, settings.paramCapOverride),
  }
}

/**
 * 最適化結果から編成結果を作る
 *
 * @param members - 最適化されたサポート配列
 * @param input - 最適化入力
 * @param schedule - アクション回数とボーナス対象の上昇機会
 * @param rentalName - この編成でレンタルとして採用したサポート名
 * @returns 編成結果
 */
function buildResult(
  members: CandidateCard[],
  input: OptimizeInput,
  schedule: CardScoreCalculationContext,
  rentalName?: string,
): UnitResult {
  const { settings, scoreSettings } = input
  const { effectiveCounts, parameterBonusRows } = schedule
  const cards = members.map((m) => m.card)
  // 選ばれたサポートが互いに提供する効果を、同じ回数条件で算出する
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

  // 入力値はサポート外パラボ%なので、そのまま合計へ加える
  const outsidePercent: ParameterValues = { ...settings.paramBonusPercent }

  // パラメータボーナス%: サポートのパラボ% + サポート外のパラボ%
  const totalParamBonusPercent: ParameterValues = {
    vocal: supportPercent.vocal + outsidePercent.vocal,
    dance: supportPercent.dance + outsidePercent.dance,
    visual: supportPercent.visual + outsidePercent.visual,
  }

  // パラメータボーナスの実数値を計算する
  const parameterBonus = calculateParameterBonus(parameterBonusRows, totalParamBonusPercent)
  const base = scoreSettings.parameterBonusBase

  // 各メンバーの結果を構築する
  const unitMembers: UnitMember[] = members.map((m) => {
    const synergyExtra = synergyMap.get(m.card.name) ?? {}
    let supportSynergy = 0
    const supportSynergyDetail: SupportSynergyDetail = {}

    // 候補準備で解析済みの発動値・使用回数を使い、本探索と同じ上限で表示点を計算する
    for (const ability of m.synergyAbilities) {
      const actionId = data.TriggerActionMap[ability.triggerKey]
      const providedCount = synergyExtra[actionId] ?? 0
      if (providedCount <= 0) continue
      const count = getSynergyExtraCount(ability, providedCount)
      supportSynergy += Math.floor(ability.parsedValue * count)
      supportSynergyDetail[ability.triggerKey] = (supportSynergyDetail[ability.triggerKey] ?? 0) + count
    }

    // 採用されたレンタル名と一致するメンバーにレンタル表示を付ける
    const isRental = rentalName === m.card.name

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

  // 結果表示・手動編成も本探索の評価器を使い、連携・パラボ・上限の計算を揃える
  const totalScore = evaluateUnitScoreWithSeed(
    createEvaluatorSeed([]),
    members,
    parameterBonusRows,
    outsidePercent,
    buildParameterContext(input),
  )

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
 * レンタル枠を確定した探索枝を共通の列挙・評価・進捗処理で探索する
 *
 * @param branches - 固定メンバーと事前計算済みの件数・列挙条件
 * @param input - カード評価に使う共通入力
 * @param schedule - 解決済みの回数とボーナス対象の上昇機会
 * @param onProgress - 評価済み数と総件数の通知
 * @param isCancelled - 中断の判定
 * @param onBetterResult - より高い編成の通知
 * @returns 全探索枝で最も点数の高い編成と探索統計
 */
async function optimizeSearchBranches(
  branches: SearchBranch[],
  input: OptimizeInput,
  schedule: CardScoreCalculationContext,
  onProgress: (done: number, total: number) => void,
  isCancelled: () => boolean,
  onBetterResult?: (result: UnitResult) => void,
): Promise<OptimizeBranchResult> {
  const paramCtx = buildParameterContext(input)
  // 固定レンタルの1枝も自動レンタルの複数枝も、同じ条件から総件数を求める
  const total = branches.reduce((sum, branch) => sum + branch.totalCombos, 0)
  const rentalBranchesVisited = getLockedRentalCardName(input.settings) ? 0 : branches.length
  let bestScore = -Infinity
  let bestMembers: CandidateCard[] | null = null
  let bestRentalName: string | null = null
  let done = 0
  const result = (): OptimizeBranchResult => ({
    bestScore,
    bestMembers,
    bestRentalName,
    evaluatedCombos: done,
    rentalBranchesVisited,
  })
  // 条件を満たす組み合わせがなければ、評価ループと進捗通知を開始しない
  if (total === 0) return result()

  onProgress(0, total)
  const batchSize = resolveExhaustiveBatchSize(total)
  for (const branch of branches) {
    // 枝内で変わらないカードを事前集計し、自由枠の組み合わせだけを入れ替える
    const seed = createEvaluatorSeed(branch.fixedCandidates)
    for (const combo of spTypeConstrainedCombos(branch.enumeration)) {
      // 一定件数ごとに中断を確認し、描画と進捗通知のために制御を戻す
      if (done % batchSize === 0 && done > 0) {
        if (isCancelled()) return result()
        onProgress(done, total)
        await new Promise<void>((resolve) => setTimeout(resolve, 0))
      }
      done++
      // 固定メンバーの集計へ可変メンバーを加え、実際の編成で発生する点数を評価する
      const score = evaluateUnitScoreWithSeed(
        seed,
        combo,
        schedule.parameterBonusRows,
        input.settings.paramBonusPercent,
        paramCtx,
      )
      if (score > bestScore) {
        // 同点は先に見つけた編成を保ち、改善した場合だけ結果と表示を更新する
        bestScore = score
        bestMembers = [...branch.fixedCandidates, ...combo]
        bestRentalName = branch.rentalName
        if (onBetterResult) onBetterResult(buildResult(bestMembers, input, schedule, bestRentalName))
      }
    }
  }
  if (!isCancelled()) onProgress(total, total)
  return result()
}

/**
 * 組み合わせ数の見積もりと本探索で共用する候補・残り枠・編成制約を準備する
 *
 * @param input - 最適化入力
 * @param allCandidates - 通常枠の事前計算済み候補
 * @param schedule - カードの評価に使うアクション回数とレッスン情報
 * @returns 固定枠を反映した自由枠候補と探索条件
 */
function prepareExhaustiveCandidates(
  input: OptimizeInput,
  allCandidates: CandidateCard[],
  schedule: CardScoreCalculationContext,
) {
  const { settings } = input

  const fixedRentalName = getLockedRentalCardName(settings)
  const lockedNames = new Set(settings.lockedCards)
  const fixedNormalCandidates = allCandidates.filter(
    (candidate) => lockedNames.has(candidate.card.name) && candidate.card.name !== fixedRentalName,
  )
  const fixedRentalCard = fixedRentalName ? input.cardByName.get(fixedRentalName) : undefined

  // 固定カードの枚数を下回らないよう、タイプごとの上限を調整する
  const forcedTypeCount: Record<enums.ParameterType, number> = {
    [enums.ParameterType.Vocal]: 0,
    [enums.ParameterType.Dance]: 0,
    [enums.ParameterType.Visual]: 0,
  }
  for (const type of PARAMETER_TYPES) {
    forcedTypeCount[type] =
      fixedNormalCandidates.filter((candidate) => candidate.card.type === type).length +
      (fixedRentalCard?.type === type ? 1 : 0)
  }
  const adjustedTypeCountMax: TypeCountValues = {
    [enums.ParameterType.Vocal]: Math.max(
      settings.typeCountMax[enums.ParameterType.Vocal],
      forcedTypeCount[enums.ParameterType.Vocal],
    ),
    [enums.ParameterType.Dance]: Math.max(
      settings.typeCountMax[enums.ParameterType.Dance],
      forcedTypeCount[enums.ParameterType.Dance],
    ),
    [enums.ParameterType.Visual]: Math.max(
      settings.typeCountMax[enums.ParameterType.Visual],
      forcedTypeCount[enums.ParameterType.Visual],
    ),
  }
  const adjustedInput: OptimizeInput = { ...input, settings: { ...settings, typeCountMax: adjustedTypeCountMax } }

  // 所持凸数の通常固定だけを候補選定から除外し、レンタルは固定の有無によらず同じ入口で評価する
  const fixedNormalNames = new Set(fixedNormalCandidates.map((candidate) => candidate.card.name))
  const candidateLimit = Math.max(10, settings.exhaustiveCandidateLimit ?? constant.EXHAUSTIVE_CANDIDATE_LIMIT)
  const rentalPool = createRentalPool(adjustedInput, schedule, fixedNormalNames, candidateLimit, allCandidates)
  const fixedCandidates = createFixedCandidates(input, allCandidates, rentalPool)

  // 通常枠の自由候補から、固定レンタルを含む全固定カードを外す
  const fixedNames = new Set(fixedCandidates.map((candidate) => candidate.card.name))
  const scoredFree = allCandidates.filter((candidate) => !fixedNames.has(candidate.card.name))

  // タイプ別・SP条件の候補を上限内に残し、共通評価点で自由枠候補を選ぶ
  const freePool = selectSynergyCandidates(scoredFree, candidateLimit, {
    settings: adjustedInput.settings,
    fixedCandidates,
    normalCandidates: scoredFree,
    rentalCandidates: rentalPool,
  })

  // 固定カードから残りの制約を導出し、件数の見積もりと本探索へ同じ探索枝を渡す
  const branches =
    fixedCandidates.length > constant.UNIT_SIZE
      ? []
      : createSearchBranches(fixedCandidates, freePool, rentalPool, adjustedInput.settings)
  return { adjustedInput, branches }
}

/**
 * 組み合わせ数を事前計算する
 *
 * @param input - 最適編成の条件
 * @param allCandidates - 条件に合うサポート候補一覧
 * @param schedule - 計算に使うスケジュール情報
 * @returns 組み合わせ数
 */
function calculateTotalCombos(
  input: OptimizeInput,
  allCandidates: CandidateCard[],
  schedule: CardScoreCalculationContext,
): number {
  // 本探索と同じ探索枝の件数を合計し、進捗の総件数と評価対象を一致させる
  const { branches } = prepareExhaustiveCandidates(input, allCandidates, schedule)
  return branches.reduce((sum, branch) => sum + branch.totalCombos, 0)
}

/**
 * レンタル枠の固定方法をそろえる設定が有効なとき、比較する探索経路を作る
 *
 * @param input - 最適化入力パラメータ
 * @returns 比較する最適編成条件（現状維持を含む）
 */
function buildUnifyRentalPathConfigs(input: OptimizeInput): OptimizeInput[] {
  const { settings, scoreSettings } = input
  const origRental = getLockedRentalCardName(settings)

  // レンタル枠・通常枠の固定がなければ、比較する固定方法はない
  if (!origRental && settings.lockedCards.length === 0) return []

  // ロックを統合する場合は、現状維持・通常ロックのレンタル昇格・完全自動レンタルを比較する
  // 通常ロックのレンタル昇格は、所持済みカードだけを対象にする
  const configs: OptimizeInput[] = [
    {
      ...input,
      settings: { ...settings, unifyRentalLock: false },
    },
  ]

  for (const lockedName of settings.lockedCards) {
    // 固定レンタルの現状維持はすでに比較するため、同じ探索経路を増やさない
    if (lockedName === origRental) continue
    const isOwned =
      !!scoreSettings.useFixedUncap ||
      (input.cardUncaps[lockedName] !== undefined && input.cardUncaps[lockedName] !== enums.UncapType.NotOwned)
    if (!isOwned) continue

    // 通常枠の固定カードをレンタル枠へ移し、元のレンタルカードがあれば通常枠へ入れ替える
    const lockedCards = settings.lockedCards

    configs.push({
      ...input,
      settings: {
        ...settings,
        rentalCardName: lockedName,
        lockedCards,
        unifyRentalLock: false,
      },
    })
  }

  if (origRental) {
    configs.push({
      ...input,
      settings: {
        ...settings,
        rentalCardName: null,
        lockedCards: settings.lockedCards,
        unifyRentalLock: false,
      },
    })
  }

  return configs
}

/**
 * 総当たり最適化を非同期で実行する
 *
 * 実際のアクション回数で点数が高い候補と、SP条件を満たすための補充候補を対象に、
 * SP条件とタイプ条件を満たす組み合わせを全探索する
 * 候補を絞って計算量を抑えながら、通常の探索で取りこぼした組み合わせを確認する
 *
 * @param input - 最適化入力
 * @param onProgress - 進捗を受け取る操作（done: 評価済み数、total: 総組み合わせ数）
 * @param isCancelled - 中断を確認する関数（trueなら中断）
 * @param onBetterResult - より高い結果を受け取る操作
 * @param options - 探索統計を受け取るオプション
 * @returns 最適ユニット結果、候補不足時は null
 */
export async function exhaustiveOptimizeAsync(
  input: OptimizeInput,
  onProgress: (done: number, total: number) => void,
  isCancelled: () => boolean,
  onBetterResult?: (result: UnitResult) => void,
  options?: ExhaustiveOptimizeOptions,
): Promise<UnitResult | null> {
  const { settings, scoreSettings } = input

  // 探索を始める前に、編成枚数とSP条件が成立する設定か確認する
  const spTotal = settings.spConstraint.vocal + settings.spConstraint.dance + settings.spConstraint.visual
  if (spTotal > constant.SP_TOTAL_MAX) return null
  const typeMinTotal = PARAMETER_TYPES.reduce((s, t) => s + settings.typeCountMin[t], 0)
  const typeMaxTotal = PARAMETER_TYPES.reduce((s, t) => s + settings.typeCountMax[t], 0)
  if (typeMinTotal > constant.UNIT_SIZE) return null
  if (typeMaxTotal < constant.UNIT_SIZE) return null

  const schedule = createCardScoreCalculationContext(scoreSettings)

  // 固定カードを含む候補一覧を作る
  const allCandidates = prepareCandidates(input, schedule)

  // ロック統合が有効で、所持済みの固定対象がある場合だけ別の固定方法も比較する
  // レンタルロックが所持済みカードかを確認する（未所持カードは昇格対象外）
  const lockedRentalName = getLockedRentalCardName(settings)
  const isRentalLockOwned =
    lockedRentalName !== null &&
    (!!scoreSettings.useFixedUncap ||
      (input.cardUncaps[lockedRentalName] !== undefined &&
        input.cardUncaps[lockedRentalName] !== enums.UncapType.NotOwned))
  // 通常ロックの中に所持済みカードが1枚でもあるかを確認する
  const hasOwnedLockedCard = settings.lockedCards.some(
    (n) =>
      !!scoreSettings.useFixedUncap ||
      (input.cardUncaps[n] !== undefined && input.cardUncaps[n] !== enums.UncapType.NotOwned),
  )
  // どちらかの条件を満たす場合に限り、複数の固定方法を比較する
  const shouldTryUnifyPaths = !!settings.unifyRentalLock && (isRentalLockOwned || hasOwnedLockedCard)

  if (shouldTryUnifyPaths) {
    // 現状維持・昇格・降格などの固定方法を作る
    const configs = buildUnifyRentalPathConfigs(input)

    // 各固定方法の組み合わせ数を事前に計算し、進捗表示へ配分する
    const comboCounts: number[] = []
    let grandTotal = 0
    for (const config of configs) {
      const candidates = prepareCandidates(config, schedule)
      const total = calculateTotalCombos(config, candidates, schedule)
      comboCounts.push(total)
      grandTotal += total
    }

    // すべての固定方法で組み合わせが0件なら、編成なしで終了する
    if (grandTotal === 0) return null

    // すべての固定方法を通じた最高結果と累積統計を初期化する
    let bestResult: UnitResult | null = null
    let bestTotalScore = -Infinity

    let totalEvaluated = 0
    let totalBranches = 0
    let doneAccumulated = 0

    // 各固定方法を順番に評価し、最も点数の高い結果を更新する
    for (let i = 0; i < configs.length; i++) {
      if (isCancelled()) return bestResult
      const config = configs[i]
      const totalForThis = comboCounts[i]

      // この固定方法の進捗を、全体の進捗へ換算して報告する
      const onProgressThis = (done: number) => {
        onProgress(doneAccumulated + done, grandTotal)
      }

      // この固定方法で暫定ベストを上回る結果が出たら、全体の結果をすぐに更新する
      const onBetterResultWrapper = (res: UnitResult) => {
        if (res.totalScore > bestTotalScore) {
          bestTotalScore = res.totalScore
          bestResult = res
          if (onBetterResult) onBetterResult(res)
        }
      }

      // 各固定方法の統計を合算し、呼び出し元へ報告する
      const optionsThis: ExhaustiveOptimizeOptions = {
        ...options,
        onStats: (st) => {
          totalEvaluated += st.evaluatedCombos
          totalBranches += st.rentalBranchesVisited
          options?.onStats?.({
            evaluatedCombos: totalEvaluated,
            rentalBranchesVisited: totalBranches,
          })
        },
      }

      // この固定方法で最適編成を計算する
      const res = await exhaustiveOptimizeAsync(config, onProgressThis, isCancelled, onBetterResultWrapper, optionsThis)

      // この固定方法の最終結果を確認して、全体の結果を更新する
      if (res && res.totalScore > bestTotalScore) {
        bestTotalScore = res.totalScore
        bestResult = res
      }

      doneAccumulated += totalForThis
    }

    return bestResult
  }

  // レンタルの固定有無は探索枝の作成時に解決し、列挙・評価は同じ処理を使う
  const { adjustedInput, branches } = prepareExhaustiveCandidates(input, allCandidates, schedule)
  const branchResult = await optimizeSearchBranches(
    branches,
    adjustedInput,
    schedule,
    onProgress,
    isCancelled,
    onBetterResult,
  )

  // 探索した組み合わせ数を呼び出し元へ報告する
  const stats: ExhaustiveOptimizeStats = {
    evaluatedCombos: branchResult.evaluatedCombos,
    rentalBranchesVisited: branchResult.rentalBranchesVisited,
  }
  options?.onStats?.(stats)

  // 最も点数の高かった編成を返す
  if (!branchResult.bestMembers) return null
  return buildResult(branchResult.bestMembers, adjustedInput, schedule, branchResult.bestRentalName ?? undefined)
}

/**
 * 手動選択ユニットを評価する
 *
 * 指定されたサポート名リストからユニットの合計スコアを計算する
 * 6枚未満でも計算可能（部分ユニット）
 *
 * @param input - 手動編成に指定したカード名を含む最適化入力
 * @returns 計算結果（サポートが0枚の場合は null）
 */
export function evaluateManualUnit(input: OptimizeInput): UnitResult | null {
  const { settings, scoreSettings, cardUncaps } = input

  const { selectedCards, rentalCardName } = settings
  if (selectedCards.length === 0) return null

  // 空き枠を除外して、手動編成に指定したサポート名を取得する
  const cardNames = selectedCards.filter((n): n is string => n !== null)
  if (cardNames.length === 0) return null
  // 完成編成は通常5枚とレンタル1枚で構成する。選択途中の部分編成は評価できる
  if (cardNames.length === constant.UNIT_SIZE && !cardNames.includes(rentalCardName ?? '')) return null

  // 通常枠の順番にかかわらず、選択中のレンタル名だけを4凸の対象にする
  const derivedRentalName = rentalCardName && cardNames.includes(rentalCardName) ? rentalCardName : null

  // スケジュールからアクション回数を導出する
  const schedule = createCardScoreCalculationContext(scoreSettings)
  const { effectiveCounts, parameterBonusRows } = schedule

  // レンタル名を導出値で上書きした入力を作成する
  const evalInput: OptimizeInput = {
    ...input,
    settings: { ...settings, rentalCardName: derivedRentalName },
  }

  // サポート名からサポートを検索して計算する
  const candidates: CandidateCard[] = []
  for (const cardName of cardNames) {
    const card = input.cardByName.get(cardName)
    if (!card) continue

    // 4凸固定モードまたはレンタル枠は4凸で計算する
    // それ以外はカードごとに設定された凸数を使う
    const isRentalSlot = derivedRentalName === cardName
    const uncap =
      scoreSettings.useFixedUncap || isRentalSlot
        ? enums.UncapType.Four
        : (cardUncaps[card.name] ?? constant.DEFAULT_UNCAP)
    candidates.push(
      createCandidateCard({
        card,
        uncap,
        scoreSettings,
        effectiveCounts,
        parameterBonusRows,
        customData: input.cardCountCustom?.[card.name],
      }),
    )
  }

  // 指定名のカードを1枚も見つけられなければ、評価結果を作れない
  if (candidates.length === 0) return null

  // レンタルの採用方法は明示した名前で結果へ渡す
  return buildResult(candidates, evalInput, schedule, derivedRentalName ?? undefined)
}
