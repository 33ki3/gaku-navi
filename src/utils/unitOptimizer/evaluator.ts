/**
 * 総当たり最適化の評価関数
 *
 * 編成評価ホットパスを独立モジュール化し、
 * 探索ロジック本体から責務を分離する。
 */
import type { ParameterValues } from '../../types/card'
import { calculateParameterBonus } from '../calculator/parameterBonus'
import type { SynergyAbility } from './synergyScore'
import { calculateSynergyScore } from './synergyScore'

/** 評価対象メンバーの最小情報 */
interface EvaluatorMember {
  baseScoreWithoutParamBonus: number
  paramIndex: number
  paramBonusPercent: ParameterValues
  providedActionsVec: Float64Array
  providedActionEntries: { actionIdx: number; count: number }[]
  synergyAbilities: SynergyAbility[]
}

/** 評価時の固定コンテキスト */
interface EvaluatorContext {
  nonSupportParams: ParameterValues
  paramCap: number | null
}

/** 固定メンバー再利用用の評価シード */
interface EvaluatorSeed {
  fixedMembers: EvaluatorMember[]
  fixedTotalProvided: Float64Array
  fixedSupportScore: Float64Array
  fixedSupportPercent: Float64Array
}

/** 提供アクション合計バッファ（サイズは必要時に拡張） */
let totalProvidedBuffer = new Float64Array(0)
/** サポートスコア集計バッファ [vocal, dance, visual] */
const supportScoreBuffer = new Float64Array(3)
/** サポートパラボ%集計バッファ [vocal, dance, visual] */
const supportPercentBuffer = new Float64Array(3)

/**
 * 提供アクション合計バッファを必要サイズへ拡張する
 *
 * @param requiredSize - 必要なバッファサイズ
 */
function ensureProvidedBuffer(requiredSize: number): void {
  // ホットパスで毎回再確保しないよう、必要になった時だけ拡張する
  if (totalProvidedBuffer.length >= requiredSize) return
  totalProvidedBuffer = new Float64Array(requiredSize)
}

/**
 * 固定メンバーから評価シードを作成する
 *
 * @param fixedMembers - 分岐内で固定されるメンバー
 * @returns 固定部分の集計済みシード
 */
export function createEvaluatorSeed(fixedMembers: EvaluatorMember[]): EvaluatorSeed {
  // 固定メンバーだけで必要な配列サイズを決める
  const actionBufferSize = fixedMembers[0]?.providedActionsVec.length ?? 0
  const fixedTotalProvided = new Float64Array(actionBufferSize)
  const fixedSupportScore = new Float64Array(3)
  const fixedSupportPercent = new Float64Array(3)

  // 固定メンバー分の提供回数・基礎スコア・パラボ%を先に集計しておく
  for (const m of fixedMembers) {
    for (const entry of m.providedActionEntries) {
      fixedTotalProvided[entry.actionIdx] += entry.count
    }
    fixedSupportPercent[0] += m.paramBonusPercent.vocal
    fixedSupportPercent[1] += m.paramBonusPercent.dance
    fixedSupportPercent[2] += m.paramBonusPercent.visual

    const pi = m.paramIndex
    if (pi < 0) continue
    fixedSupportScore[pi] += m.baseScoreWithoutParamBonus
  }

  return {
    fixedMembers,
    fixedTotalProvided,
    fixedSupportScore,
    fixedSupportPercent,
  }
}

/**
 * 固定メンバーシードを使ってユニット合計スコアを計算する
 *
 * @param seed - 固定メンバーの事前集計シード
 * @param variableMembers - 可変メンバー
 * @param parameterBonusRows - 上昇機会ごとのVo/Da/Vi値
 * @param outsideParamBonusPercent - サポート外パラメータボーナス%
 * @param ctx - パラメータキャップ含む評価コンテキスト
 * @returns キャップ適用済みユニット合計スコア
 */
export function evaluateUnitScoreWithSeed(
  seed: EvaluatorSeed,
  variableMembers: EvaluatorMember[],
  parameterBonusRows: ParameterValues[],
  outsideParamBonusPercent: ParameterValues,
  ctx: EvaluatorContext,
): number {
  // 可変メンバーを含めた必要サイズへ共有バッファを合わせる
  const actionBufferSize = Math.max(seed.fixedTotalProvided.length, variableMembers[0]?.providedActionsVec.length ?? 0)
  ensureProvidedBuffer(actionBufferSize)

  // 提供回数バッファを固定メンバー分で初期化し、可変メンバー分を加算する
  totalProvidedBuffer.fill(0, 0, actionBufferSize)
  totalProvidedBuffer.set(seed.fixedTotalProvided)
  for (const m of variableMembers) {
    for (const entry of m.providedActionEntries) {
      totalProvidedBuffer[entry.actionIdx] += entry.count
    }
  }

  // スコア集計バッファを固定メンバー分で初期化する
  supportScoreBuffer[0] = seed.fixedSupportScore[0]
  supportScoreBuffer[1] = seed.fixedSupportScore[1]
  supportScoreBuffer[2] = seed.fixedSupportScore[2]
  supportPercentBuffer[0] = seed.fixedSupportPercent[0]
  supportPercentBuffer[1] = seed.fixedSupportPercent[1]
  supportPercentBuffer[2] = seed.fixedSupportPercent[2]

  // 可変メンバーの基礎値とシナジー加点を集計する
  for (const m of variableMembers) {
    supportPercentBuffer[0] += m.paramBonusPercent.vocal
    supportPercentBuffer[1] += m.paramBonusPercent.dance
    supportPercentBuffer[2] += m.paramBonusPercent.visual

    const pi = m.paramIndex
    if (pi < 0) continue
    supportScoreBuffer[pi] += m.baseScoreWithoutParamBonus

    // 自身が提供した回数は除外し、他メンバー提供分のみをシナジーとして加算する
    supportScoreBuffer[pi] += calculateSynergyScore(m.synergyAbilities, totalProvidedBuffer, m.providedActionsVec)
  }

  // 固定メンバー側も同様にシナジー加点のみ再計算して足し込む
  for (const m of seed.fixedMembers) {
    const pi = m.paramIndex
    if (pi < 0) continue

    supportScoreBuffer[pi] += calculateSynergyScore(m.synergyAbilities, totalProvidedBuffer, m.providedActionsVec)
  }

  // 上昇機会ごとに編成全体のボーナス率を適用し、結果表示と同じ丸め規則で集計する
  const parameterBonus = calculateParameterBonus(parameterBonusRows, {
    vocal: supportPercentBuffer[0] + outsideParamBonusPercent.vocal,
    dance: supportPercentBuffer[1] + outsideParamBonusPercent.dance,
    visual: supportPercentBuffer[2] + outsideParamBonusPercent.visual,
  })
  supportScoreBuffer[0] += parameterBonus.vocal
  supportScoreBuffer[1] += parameterBonus.dance
  supportScoreBuffer[2] += parameterBonus.visual

  // 最後にパラメータ上限を適用して合計スコアを返す
  const cap = ctx.paramCap
  const np = ctx.nonSupportParams
  if (cap !== null) {
    return (
      Math.min(np.vocal + supportScoreBuffer[0], cap) +
      Math.min(np.dance + supportScoreBuffer[1], cap) +
      Math.min(np.visual + supportScoreBuffer[2], cap)
    )
  }

  return np.vocal + supportScoreBuffer[0] + np.dance + supportScoreBuffer[1] + np.visual + supportScoreBuffer[2]
}
