/**
 * サポート全体のスコア計算
 *
 * 画面や保存領域を参照せず、受け取った設定とカードデータだけで
 * カード単体・全カードの計算入力を組み立てる
 */
import * as constant from '../../constant'
import * as data from '../../data'
import type {
  CardCalculationResult,
  CardCountCustom,
  CardCustomData,
  PerLessonParameterValues,
  ScoreSettings,
  SupportCard,
} from '../../types/card'
import type { UncapType } from '../../types/enums'
import * as enums from '../../types/enums'
import { customRowsToPerLessonValues, mergeScheduleCounts, resolveScoreSettingsDifficulty } from '../scoreSettings'
import { calculateCardParameter } from './calculateCard'
import { getPerLessonParameterValues } from './parameterBonus'

/** カードスコア計算へ渡す、設定から導出した共有入力 */
interface CardScoreCalculationContext {
  /** 自己発火・Pアイテム計算に使う有効なアクション回数 */
  effectiveCounts: Partial<Record<enums.ActionIdType, number>>
  /** アクション回数が1つ以上設定されているか */
  hasAnyAction: boolean
  /** パラメータボーナス対象値が1つ以上設定されているか */
  hasAnyBonus: boolean
  /** レッスンごとのパラメータ値。不要な場合は undefined */
  perLessonValues: PerLessonParameterValues | undefined
}

/** 全カードのスコア計算へ渡す入力 */
interface CardScoreCalculationInput {
  /** ユーザー追加分を含む全サポート */
  allCards: readonly SupportCard[]
  /** サポート名からカードを探す表 */
  cardByName: ReadonlyMap<string, SupportCard>
  /** 現在の点数設定 */
  scoreSettings: ScoreSettings
  /** サポート名 → 凸数 */
  cardUncaps: Readonly<Record<string, UncapType>>
  /** サポート名 → 回数調整 */
  cardCountCustom?: CardCountCustom
  /** 点数設定から導出済みの共有入力。省略時は点数設定から作る */
  calculationContext?: CardScoreCalculationContext
  /** 点数設定が同じ間は再利用する既定凸の計算結果 */
  baseResults?: ReadonlyMap<string, CardCalculationResult>
}

/** 全カードのスコア計算結果 */
interface CardScoreCalculationOutput {
  /** サポート名 → 計算の内訳 */
  cardResults: Map<string, CardCalculationResult>
  /** サポート名 → 合計スコア */
  cardScores: Map<string, number>
}

/**
 * 点数設定から、カード計算で共有する入力を導出する
 *
 * スケジュールの解決や試験後Pアイテムの合算をここへ集め、
 * 画面の計算と単体・全カード計算で同じ入力を使えるようにする
 *
 * @param scoreSettings - 現在の点数設定
 * @returns カード計算で共有する導出値
 */
export function createCardScoreCalculationContext(scoreSettings: ScoreSettings): CardScoreCalculationContext {
  // 固定難易度シナリオ（HIF/Custom）では difficulty=None を使う
  const resolvedDifficulty = resolveScoreSettingsDifficulty(scoreSettings.scenario, scoreSettings.difficulty)
  const schedule = data.getScheduleData(scoreSettings.scenario, resolvedDifficulty)
  // カスタムモード時はスケジュール自動計算を無効にして手動入力値だけを使う
  const settingsForCount = scoreSettings.useCustomMode ? { ...scoreSettings, useScheduleLimits: false } : scoreSettings
  const mergedCounts = mergeScheduleCounts(settingsForCount, schedule)

  // 試験後Pアイテム獲得の回数を通常のPアイテム獲得へ合算する
  const examPItemCount = mergedCounts[enums.ActionIdType.ExamPItemAcquire] ?? 0
  const effectiveCounts =
    examPItemCount > 0
      ? {
          ...mergedCounts,
          [enums.ActionIdType.PItemAcquire]: (mergedCounts[enums.ActionIdType.PItemAcquire] ?? 0) + examPItemCount,
        }
      : { ...mergedCounts }

  const hasAnyAction = Object.values(effectiveCounts).some((value) => value > 0)
  const hasAnyBonus =
    scoreSettings.parameterBonusBase.vocal > 0 ||
    scoreSettings.parameterBonusBase.dance > 0 ||
    scoreSettings.parameterBonusBase.visual > 0

  const perLessonValues = scoreSettings.useCustomMode
    ? customRowsToPerLessonValues(scoreSettings.customParamBonusRows)
    : scoreSettings.useScheduleLimits
      ? getPerLessonParameterValues(
          scoreSettings.scheduleSelections,
          scoreSettings.scenario,
          resolvedDifficulty,
          scoreSettings.hifLessonSplitSub,
          scoreSettings.hifExamRatios,
        )
      : undefined

  return { effectiveCounts, hasAnyAction, hasAnyBonus, perLessonValues }
}

/**
 * 明示された設定でサポート1枚のスコアを計算する
 *
 * @param card - 計算対象のサポート
 * @param uncap - 凸数
 * @param scoreSettings - 点数設定
 * @param custom - サポート別の回数調整
 * @param context - 共有計算入力。省略時は点数設定から導出する
 * @returns 計算結果。計算対象がない場合は undefined
 */
export function calculateCardWithSettings(
  card: SupportCard,
  uncap: UncapType,
  scoreSettings: ScoreSettings,
  custom?: CardCustomData,
  context: CardScoreCalculationContext = createCardScoreCalculationContext(scoreSettings),
): CardCalculationResult | undefined {
  if (!context.hasAnyAction && !context.hasAnyBonus) return undefined

  return calculateCardParameter(
    card,
    uncap,
    context.effectiveCounts,
    {},
    scoreSettings.parameterBonusBase,
    scoreSettings.includeSelfTrigger,
    scoreSettings.includePItem,
    context.perLessonValues,
    custom?.selfTrigger,
    custom?.pItemCount,
  )
}

/**
 * 設定とカード一覧が変わらない間に再利用する既定凸の計算結果を作る
 *
 * @param allCards - ユーザー追加分を含む全サポート
 * @param scoreSettings - 現在の点数設定
 * @param context - 点数設定から導出済みの共有入力
 * @returns サポート名から既定凸の計算結果を探す表
 */
export function calculateBaseCardResults(
  allCards: readonly SupportCard[],
  scoreSettings: ScoreSettings,
  context: CardScoreCalculationContext = createCardScoreCalculationContext(scoreSettings),
): Map<string, CardCalculationResult> {
  const results = new Map<string, CardCalculationResult>()
  if (!context.hasAnyAction && !context.hasAnyBonus) return results

  for (const card of allCards) {
    const result = calculateCardWithSettings(card, constant.DEFAULT_UNCAP, scoreSettings, undefined, context)
    if (result) results.set(card.name, result)
  }
  return results
}

/**
 * 全サポートのスコアを計算する
 *
 * まず共通の条件で全カードを計算し、凸数や回数調整が指定されたカードだけを
 * その条件で計算し直す。指定がないカードも一覧では0点として扱う
 *
 * @param input - カード、設定、凸数、回数調整
 * @returns カードごとの計算結果と合計スコア
 */
export function calculateCardScores({
  allCards,
  cardByName,
  scoreSettings,
  cardUncaps,
  cardCountCustom = {},
  calculationContext,
  baseResults: suppliedBaseResults,
}: CardScoreCalculationInput): CardScoreCalculationOutput {
  const context = calculationContext ?? createCardScoreCalculationContext(scoreSettings)
  if (!context.hasAnyAction && !context.hasAnyBonus) {
    return { cardResults: new Map(), cardScores: new Map(allCards.map((card) => [card.name, 0])) }
  }

  const baseResults = suppliedBaseResults
    ? new Map(suppliedBaseResults)
    : calculateBaseCardResults(allCards, scoreSettings, context)

  // 4凸固定モードでは凸数を見ず、回数調整だけを適用する
  const fixedUncapEntries = scoreSettings.useFixedUncap
    ? []
    : Object.entries(cardUncaps).filter(
        ([, uncap]) => uncap !== constant.DEFAULT_UNCAP && uncap !== enums.UncapType.NotOwned,
      )
  const hasNotOwned =
    !scoreSettings.useFixedUncap && Object.values(cardUncaps).some((u) => u === enums.UncapType.NotOwned)
  const hasCountCustom = Object.keys(cardCountCustom).length > 0

  // 特別な凸数・未所持・回数調整がなければ、基準結果をそのまま一覧へ返す
  if (fixedUncapEntries.length === 0 && !hasNotOwned && !hasCountCustom) {
    return { cardResults: baseResults, cardScores: createCardScores(allCards, baseResults) }
  }

  // 指定があるカードだけを再計算し、不要な計算を増やさない
  const cardResults = new Map(baseResults)

  // 未所持サポートは結果から除外する
  if (!scoreSettings.useFixedUncap) {
    for (const [cardName, uncap] of Object.entries(cardUncaps)) {
      if (uncap === enums.UncapType.NotOwned) cardResults.delete(cardName)
    }
  }

  // 凸数変更サポートを再計算する
  for (const [cardName, uncap] of fixedUncapEntries) {
    const card = cardByName.get(cardName)
    if (!card) continue
    const result = calculateCardWithSettings(card, uncap, scoreSettings, cardCountCustom[cardName], context)
    if (result) cardResults.set(cardName, result)
  }

  // 回数調整だけのサポート（凸数は既定値）を再計算する
  const alreadyRecalculated = new Set(fixedUncapEntries.map(([name]) => name))
  for (const cardName of Object.keys(cardCountCustom)) {
    if (alreadyRecalculated.has(cardName)) continue
    const card = cardByName.get(cardName)
    if (!card) continue
    if (!scoreSettings.useFixedUncap && cardUncaps[cardName] === enums.UncapType.NotOwned) continue
    const result = calculateCardWithSettings(
      card,
      constant.DEFAULT_UNCAP,
      scoreSettings,
      cardCountCustom[cardName],
      context,
    )
    if (result) cardResults.set(cardName, result)
  }

  return { cardResults, cardScores: createCardScores(allCards, cardResults) }
}

/**
 * 全カードの計算結果から、一覧表示・並び替え用の合計スコアを作る
 *
 * 計算結果がないカードも0点として一覧へ含め、カード一覧で全カードを
 * 同じように扱えるようにする
 *
 * @param allCards - 表示対象の全サポート
 * @param cardResults - サポート名から計算結果を探す表
 * @returns サポート名から合計スコアを探す表
 */
function createCardScores(allCards: readonly SupportCard[], cardResults: ReadonlyMap<string, CardCalculationResult>) {
  const cardScores = new Map<string, number>()
  for (const card of allCards) {
    const result = cardResults.get(card.name)
    cardScores.set(card.name, result ? result.totalIncrease : 0)
  }
  return cardScores
}
