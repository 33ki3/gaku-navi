/** 保存済み達成記録を現在のマスタへ揃え、commandとインポートが共有する入力検証を提供する */
import * as constant from '../constant'
import * as data from '../data'
import type { AchievementCalculatorProgress, StoredAchievementCalculatorProgress } from '../types/achievementCalculator'
import type { PIdolCardAchievementId, ProductionRunRewardAdjustmentId } from '../types/enums'
import * as enums from '../types/enums'
import { getIdolAchievementMilestones } from './achievementCalculator'
import {
  isNonNegativeIntegerRecord,
  isNonNegativeSafeInteger,
  isRecord,
  normalizeInteger,
  normalizeNonNegativeInteger,
} from './valueValidation'

/**
 * 初期値と保存済み入力を合わせ、現在の項目を復元する
 * @param savedValue 未達成値を省略できる保存記録。省略時は初期状態を作る
 * @returns 現在のマスタ全項目を持つ入力状態。不正な保存値は項目ごとに既定値へ復元する
 */
export function createAchievementCalculatorProgress(savedValue?: unknown): AchievementCalculatorProgress {
  // localStorageは外部入力として扱い、カテゴリ単位で形を確認してから値を読む
  const saved = isRecord(savedValue) ? savedValue : {}
  const savedProduction = isRecord(saved.production) ? saved.production : {}
  const savedIdols = isRecord(saved.idols) ? saved.idols : {}
  const savedRoad = isRecord(saved.idolRoad) ? saved.idolRoad : {}
  const savedPIdolCards = isRecord(saved.pIdolCards) ? saved.pIdolCards : {}
  const savedOtherTasks = isRecord(saved.otherTasks) ? saved.otherTasks : {}
  const savedProductionRewardAdjustments = isRecord(saved.productionRewardAdjustments)
    ? saved.productionRewardAdjustments
    : {}
  const targetLevel = Math.max(
    1,
    normalizeNonNegativeInteger(saved.producerLevel, constant.PRODUCER_LEVEL_CAP) ??
      constant.PRODUCER_LEVEL_DEFAULT_TARGET,
  )
  const otherExp = normalizeInteger(saved.otherExp) ?? 0
  const production: Record<string, number> = {}
  const idols: Record<string, Record<string, number>> = {}
  const idolRoad: Record<string, Record<string, boolean[]>> = {}
  const pIdolCards: Record<string, Record<PIdolCardAchievementId, boolean>> = {}
  const otherTasks: Record<string, number> = {}
  const productionRewardAdjustments: Record<ProductionRunRewardAdjustmentId, number> = {
    [enums.ProductionRunRewardAdjustmentId.RegularMidtermFailed]: 0,
    [enums.ProductionRunRewardAdjustmentId.RegularFinalExam]: 0,
    [enums.ProductionRunRewardAdjustmentId.ProMasterFailed]: 0,
  }
  // 現在のマスタを起点に復元し、追加項目は未達成、削除項目は保存対象外にする
  for (const tracker of data.PRODUCTION_ACHIEVEMENTS) {
    const maxValue = tracker.milestones.at(-1)?.threshold
    production[tracker.id] = normalizeNonNegativeInteger(savedProduction[tracker.id], maxValue) ?? 0
  }

  for (const tracker of data.OTHER_EXPERIENCE_TRACKERS) {
    const maxValue = tracker.milestones.at(-1)?.threshold
    otherTasks[tracker.id] = normalizeNonNegativeInteger(savedOtherTasks[tracker.id], maxValue) ?? 0
  }

  for (const adjustment of data.PRODUCTION_RUN_REWARD_ADJUSTMENTS) {
    productionRewardAdjustments[adjustment.id] =
      normalizeNonNegativeInteger(savedProductionRewardAdjustments[adjustment.id]) ?? 0
  }

  // ランクや特訓の項目は独立して復元し、上位段階から下位段階を推測しない
  for (const idol of data.IDOL_ACHIEVEMENTS) {
    const savedIdolValue = savedIdols[idol.id]
    const savedIdol = isRecord(savedIdolValue) ? savedIdolValue : {}
    const progress: Record<string, number> = {}
    for (const tracker of idol.trackers) {
      const maxValue = getIdolAchievementMilestones(tracker).at(-1)?.threshold
      progress[tracker.metric] = normalizeNonNegativeInteger(savedIdol[tracker.metric], maxValue) ?? 0
    }
    idols[idol.id] = progress

    // 星ごとの達成状態を復元する。既に入力された星数は左から順に達成済みとして引き継ぐ
    const savedIdolRoad = savedRoad[idol.id]
    idolRoad[idol.id] = Object.fromEntries(
      Array.from({ length: constant.ROAD_STAGE_COUNT_PER_IDOL }, (_, index) => {
        const stage = Array.isArray(savedIdolRoad)
          ? savedIdolRoad[index]
          : isRecord(savedIdolRoad)
            ? savedIdolRoad[String(index)]
            : undefined
        const count = normalizeNonNegativeInteger(stage, constant.ROAD_STARS_PER_STAGE) ?? 0
        return [
          String(index),
          Array.from({ length: constant.ROAD_STARS_PER_STAGE }, (_, starIndex) =>
            Array.isArray(stage) ? stage[starIndex] === true : starIndex < count,
          ),
        ]
      }),
    )
  }

  // カード名から作られたIDを保存キーにし、6つの単発条件を個別に復元する
  for (const card of data.P_IDOLS) {
    const savedCardValue = savedPIdolCards[card.id]
    const savedCard = isRecord(savedCardValue) ? savedCardValue : {}
    const achievements: Record<PIdolCardAchievementId, boolean> = {
      [enums.PIdolCardAchievementId.FinalExamPassed]: false,
      [enums.PIdolCardAchievementId.SpecialTraining3]: false,
      [enums.PIdolCardAchievementId.EvaluationAPlus]: false,
      [enums.PIdolCardAchievementId.SpecialTraining4]: false,
      [enums.PIdolCardAchievementId.SpecialTraining5]: false,
      [enums.PIdolCardAchievementId.SpecialTraining6]: false,
    }

    for (const achievement of data.P_IDOL_CARD_ACHIEVEMENTS) {
      const savedCompleted = savedCard[achievement.id]
      achievements[achievement.id] = typeof savedCompleted === 'boolean' ? savedCompleted : false
    }

    pIdolCards[card.id] = achievements
  }

  return {
    production,
    idols,
    idolRoad,
    pIdolCards,
    otherTasks,
    productionRewardAdjustments,
    otherExp,
    producerLevel: targetLevel,
  }
}

/**
 * 外部操作やインポートの達成記録を検証し、不正値を未達成として保存しない
 * @param value JSONや外部操作から渡された達成記録
 * @returns カテゴリごとの構造と値が正しい場合はtrue
 */
export function isAchievementCalculatorProgress(value: unknown): value is AchievementCalculatorProgress {
  return (
    isRecord(value) &&
    isNonNegativeIntegerRecord(value.production) &&
    isRecord(value.idols) &&
    Object.values(value.idols).every(isNonNegativeIntegerRecord) &&
    isRecord(value.otherTasks) &&
    Object.values(value.otherTasks).every(isNonNegativeSafeInteger) &&
    isRecord(value.idolRoad) &&
    Object.values(value.idolRoad).every(isIdolRoadStageRecord) &&
    isRecord(value.pIdolCards) &&
    Object.values(value.pIdolCards).every(
      (card) => isRecord(card) && Object.values(card).every((completed) => typeof completed === 'boolean'),
    ) &&
    isRecord(value.productionRewardAdjustments) &&
    Object.values(value.productionRewardAdjustments).every(isNonNegativeSafeInteger) &&
    typeof value.otherExp === 'number' &&
    Number.isSafeInteger(value.otherExp) &&
    isNonNegativeSafeInteger(value.producerLevel) &&
    value.producerLevel >= 1 &&
    value.producerLevel <= constant.PRODUCER_LEVEL_CAP
  )
}

/**
 * 保存対象の数値から、復元時に補える0を除く
 * @param values 項目IDごとの数値記録
 * @returns 0以外の数値だけを持つ新しい記録
 */
function omitZeroValues(values: Record<string, number>): Record<string, number> {
  return Object.fromEntries(Object.entries(values).filter(([, value]) => value !== 0))
}

/**
 * 表示・計算用の全項目から未達成値だけを省き、独立した記録とステージ番号は維持する
 * @param progress 復元済みの達成状況
 * @returns localStorageとエクスポートが共有する省略形式
 */
export function compactAchievementCalculatorProgress(
  progress: AchievementCalculatorProgress,
): StoredAchievementCalculatorProgress {
  const stored: StoredAchievementCalculatorProgress = {
    production: omitZeroValues(progress.production),
    idols: {},
    idolRoad: {},
    pIdolCards: {},
    otherTasks: omitZeroValues(progress.otherTasks),
    productionRewardAdjustments: omitZeroValues(progress.productionRewardAdjustments),
    otherExp: progress.otherExp,
    producerLevel: progress.producerLevel,
  }
  const { idols, idolRoad, pIdolCards } = stored
  for (const [id, values] of Object.entries(progress.idols)) {
    const recorded = omitZeroValues(values)
    if (Object.keys(recorded).length > 0) idols[id] = recorded
  }
  // 画面側と同じステージ番号を維持し、未達成ステージのキーだけを省く
  // 例: { "0": [false, false, false], "1": [true, false, true] } → { "1": [true, false, true] }
  for (const [id, stages] of Object.entries(progress.idolRoad)) {
    const recorded = Object.fromEntries(Object.entries(stages).filter(([, stars]) => stars.some(Boolean)))
    if (Object.keys(recorded).length > 0) idolRoad[id] = recorded
  }
  for (const [id, values] of Object.entries(progress.pIdolCards)) {
    const recorded: Partial<Record<PIdolCardAchievementId, boolean>> = {}
    for (const achievement of data.P_IDOL_CARD_ACHIEVEMENTS) {
      if (values[achievement.id]) recorded[achievement.id] = true
    }
    if (Object.keys(recorded).length > 0) pIdolCards[id] = recorded
  }
  return stored
}

/**
 * 保存・バックアップの省略形式と全項目形式を検証する
 * 不正時はfalseを返すだけで値は変更せず、インポート側が警告を出してアチーブ記録の取り込みを見送る
 * @param value 保存・バックアップから受け取るJSON値
 * @returns 数値・条件・ステージ番号が正しい場合はtrue
 */
export function isStoredAchievementCalculatorProgress(value: unknown): boolean {
  if (!isRecord(value) || !isRecord(value.idolRoad)) return false
  // 星以外は同じ契約を使い、ステージの表現だけを保存形式に合わせて検証する
  if (!isAchievementCalculatorProgress({ ...value, idolRoad: {} })) return false
  return Object.values(value.idolRoad).every((stages) => {
    // 配列で保存済みの記録も取り込めるよう、検証後の復元で番号付きの記録へ揃える
    if (Array.isArray(stages))
      return stages.length <= constant.ROAD_STAGE_COUNT_PER_IDOL && stages.every(isRoadStageStars)
    return isIdolRoadStageRecord(stages)
  })
}

/**
 * 星の順序と独立した真偽値を検証する
 * @param stars 外部入力から受け取った1ステージ分の星
 * @returns 規定の星数とboolean要素を持つ場合はtrue
 */
function isRoadStageStars(stars: unknown): stars is boolean[] {
  return (
    Array.isArray(stars) &&
    stars.length === constant.ROAD_STARS_PER_STAGE &&
    stars.every((completed) => typeof completed === 'boolean')
  )
}

/**
 * 未記録ステージの省略は許可し、記録されたステージ番号と星は検証する
 * @param stages ステージ番号をキーにした保存記録
 * @returns 収録範囲内のステージと有効な星の配列だけを持つ場合はtrue
 */
function isIdolRoadStageRecord(stages: unknown): boolean {
  return (
    isRecord(stages) &&
    Object.entries(stages).every(
      ([index, stars]) =>
        /^(0|[1-9]\d*)$/.test(index) && Number(index) < constant.ROAD_STAGE_COUNT_PER_IDOL && isRoadStageStars(stars),
    )
  )
}
