/**
 * スコア計算カスタムフック
 *
 * ユーザーが設定した点数設定（シナリオ・難易度・アクション回数など）を使って、
 * 全カードの「パラメータ上昇量」を計算する。
 * 計算結果はカード一覧の並び替えや、スコア内訳モーダルの表示に使われる。
 */
import { useMemo, useCallback } from 'react'
import type { SupportCard, ScoreSettings, CardCalculationResult } from '../types/card'
import type { UncapType } from '../types/enums'
import { mergeScheduleCounts } from '../utils/scoreSettings'
import { calculateCardParameter } from '../utils/calculator/calculateCard'
import { getPerLessonParameterValues } from '../utils/calculator/parameterBonus'
import * as data from '../data'
import * as constant from '../constant'
import * as enums from '../types/enums'
import type { CardCountOverrides, CardOverrideData } from './useCardCountOverrides'

// AllCards は不変なので、モジュールスコープで1回だけ Map 化する
const cardByName = new Map(data.AllCards.map((c) => [c.name, c]))

/** useCardScores の戻り値 */
interface ScoreCalculationResult {
  /** カード名 → 計算の内訳（アビリティごとのスコア等） */
  cardResults: Map<string, CardCalculationResult>
  /** カード名 → 合計スコア（表示用の数値のみ） */
  cardScores: Map<string, number>
  /** 任意のカード・凸数でスコアを個別計算する関数 */
  calculateForCard: (card: SupportCard, uncap: UncapType, overrides?: CardOverrideData) => CardCalculationResult | undefined
}

/**
 * 全カードのスコアを計算するフック
 *
 * 点数設定や凸数が変わるたびに再計算する。
 * ただし、アクション回数もパラメータボーナスもゼロなら計算をスキップする。
 *
 * @param scoreSettings - ユーザーの点数設定（シナリオ・難易度・アクション回数など）
 * @param cardUncaps - カード名 → 凸数のマップ
 * @param cardCountOverrides - カード名 → アクション回数オーバーライドのマップ
 * @returns 全カードの計算結果と合計スコア
 */
export function useCardScores(
  scoreSettings: ScoreSettings,
  cardUncaps: Record<string, UncapType>,
  cardCountOverrides: CardCountOverrides = {},
): ScoreCalculationResult {
  // スコア設定から共有の計算入力を導出する（scoreSettings のみに依存）
  const calcContext = useMemo(() => {
    const schedule = data.getScheduleData(scoreSettings.scenario, scoreSettings.difficulty)
    const effectiveCounts = mergeScheduleCounts(scoreSettings, schedule)

    // 試験後Pアイテム獲得の回数を通常のPアイテム獲得に合算する
    const examPItemCount = effectiveCounts[enums.ActionIdType.ExamPItemAcquire] ?? 0
    if (examPItemCount > 0) {
      effectiveCounts[enums.ActionIdType.PItemAcquire] = (effectiveCounts[enums.ActionIdType.PItemAcquire] ?? 0) + examPItemCount
    }

    const hasAnyAction = Object.values(effectiveCounts).some((v) => v > 0)
    const hasAnyBonus =
      scoreSettings.parameterBonusBase.vocal > 0 ||
      scoreSettings.parameterBonusBase.dance > 0 ||
      scoreSettings.parameterBonusBase.visual > 0

    const perLessonValues = scoreSettings.useScheduleLimits
      ? getPerLessonParameterValues(scoreSettings.scheduleSelections, scoreSettings.scenario, scoreSettings.difficulty)
      : undefined

    return { effectiveCounts, hasAnyAction, hasAnyBonus, perLessonValues }
  }, [scoreSettings])

  // ベース計算: 全カードをデフォルト凸（4凸）で計算する。
  // scoreSettings が変わったときだけ再計算し、凸数変更では再計算しない。
  const baseResults = useMemo(() => {
    if (!calcContext.hasAnyAction && !calcContext.hasAnyBonus) {
      return new Map<string, CardCalculationResult>()
    }

    const results = new Map<string, CardCalculationResult>()
    for (const card of data.AllCards) {
      results.set(
        card.name,
        calculateCardParameter(
          card,
          constant.DEFAULT_UNCAP,
          calcContext.effectiveCounts,
          {},
          scoreSettings.parameterBonusBase,
          scoreSettings.includeSelfTrigger,
          scoreSettings.includePItem,
          calcContext.perLessonValues,
        ),
      )
    }
    return results
  }, [calcContext, scoreSettings])

  // 凸数・カウントオーバーレイ: デフォルト凸以外のカードやカウントオーバーライドがあるカードだけ再計算して上書きする。
  const cardResults = useMemo(() => {
    if (baseResults.size === 0) return baseResults

    // 4凸固定モードでもカウントオーバーライドは適用する
    const hasCountOverrides = Object.keys(cardCountOverrides).length > 0

    // デフォルト凸以外のエントリを抽出する（未所持は計算をスキップ）
    const uncapOverrides = scoreSettings.useFixedUncap
      ? []
      : Object.entries(cardUncaps).filter(
          ([, uncap]) => uncap !== constant.DEFAULT_UNCAP && uncap !== enums.UncapType.NotOwned,
        )

    // 全カードがデフォルト凸でカウントオーバーライドもなければベース結果をそのまま返す
    const hasNotOwned = !scoreSettings.useFixedUncap && Object.values(cardUncaps).some((u) => u === enums.UncapType.NotOwned)
    if (uncapOverrides.length === 0 && !hasNotOwned && !hasCountOverrides) return baseResults

    // ベースをコピーして、変更カードだけ再計算で差し替える
    const results = new Map(baseResults)

    // 未所持カードの結果を削除する
    if (!scoreSettings.useFixedUncap) {
      for (const [cardName, uncap] of Object.entries(cardUncaps)) {
        if (uncap === enums.UncapType.NotOwned) {
          results.delete(cardName)
        }
      }
    }

    // 凸数変更カードを再計算する（カウントオーバーライドも適用）
    for (const [cardName, uncap] of uncapOverrides) {
      const card = cardByName.get(cardName)
      if (card) {
        const ovr = cardCountOverrides[cardName]
        results.set(
          cardName,
          calculateCardParameter(
            card,
            uncap,
            calcContext.effectiveCounts,
            {},
            scoreSettings.parameterBonusBase,
            scoreSettings.includeSelfTrigger,
            scoreSettings.includePItem,
            calcContext.perLessonValues,
            ovr?.selfTrigger,
            ovr?.pItemCount,
          ),
        )
      }
    }

    // カウントオーバーライドのみのカード（凸数はデフォルト）を再計算する
    const alreadyRecalculated = new Set(uncapOverrides.map(([name]) => name))
    for (const cardName of Object.keys(cardCountOverrides)) {
      if (alreadyRecalculated.has(cardName)) continue
      const card = cardByName.get(cardName)
      if (!card) continue
      // 未所持カードはスキップ
      if (!scoreSettings.useFixedUncap && cardUncaps[cardName] === enums.UncapType.NotOwned) continue
      const ovr = cardCountOverrides[cardName]
      results.set(
        cardName,
        calculateCardParameter(
          card,
          constant.DEFAULT_UNCAP,
          calcContext.effectiveCounts,
          {},
          scoreSettings.parameterBonusBase,
          scoreSettings.includeSelfTrigger,
          scoreSettings.includePItem,
          calcContext.perLessonValues,
          ovr?.selfTrigger,
          ovr?.pItemCount,
        ),
      )
    }

    return results
  }, [baseResults, cardUncaps, cardCountOverrides, calcContext, scoreSettings])

  // cardResults から合計スコアだけ取り出した簡易マップ（表示・ソート用）
  // 未所持カードは 0 点として扱う
  const cardScores = useMemo(() => {
    const scores = new Map<string, number>()
    for (const card of data.AllCards) {
      const result = cardResults.get(card.name)
      scores.set(card.name, result ? result.totalIncrease : 0)
    }
    return scores
  }, [cardResults])

  /**
   * 任意のカード・凸数でスコアを個別計算する
   *
   * カード詳細モーダルで凸数を切り替えたときの再計算に使う。
   * 計算入力（アクション回数等）が無い場合は undefined を返す。
   */
  const calculateForCard = useCallback(
    (card: SupportCard, uncap: UncapType, overrides?: CardOverrideData): CardCalculationResult | undefined => {
      if (!calcContext.hasAnyAction && !calcContext.hasAnyBonus) return undefined
      return calculateCardParameter(
        card,
        uncap,
        calcContext.effectiveCounts,
        {},
        scoreSettings.parameterBonusBase,
        scoreSettings.includeSelfTrigger,
        scoreSettings.includePItem,
        calcContext.perLessonValues,
        overrides?.selfTrigger,
        overrides?.pItemCount,
      )
    },
    [calcContext, scoreSettings],
  )

  return { cardResults, cardScores, calculateForCard }
}
