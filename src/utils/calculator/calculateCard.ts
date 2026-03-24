/**
 * メインのカード計算ロジック
 *
 * サポートカード1枚の「パラメータ上昇の合計値」を計算する。
 * アビリティ・イベント・Pアイテム・パラメータボーナスの各要素を
 * 個別に積み上げて合計する。
 */

import type { SupportCard, CardCalculationResult, PerLessonParameterValues, ParameterValues } from '../../types/card'
import type { UncapType, TriggerKeyType, ActionIdType } from '../../types/enums'
import * as constant from '../../constant'
import { TriggerActionMap } from '../../data/score'
import { parseAbility } from './helpers'
import { parseEventParameterBoost, parsePItemParameterBoost, getSelfAcquisitionBonus } from './events'

/**
 * trigger_key からアクション回数の参照キーに変換する。
 *
 * アビリティの trigger_key（例: 'vo_lesson_end'）を
 * actionCounts のキー（例: 'lesson_vo'）にマッピングする。
 */
function resolveActionId(triggerKey: TriggerKeyType): ActionIdType {
  return TriggerActionMap[triggerKey]
}

/**
 * サポートカードの総パラメータ上昇量を計算する
 *
 * 計算の流れ:
 * 1. カードのイベントによるパラメータ上昇を読み取る
 * 2. イベントブースト倍率（「イベント効果+50%」等）を適用する
 * 3. 各アビリティの上昇量を「トリガー回数 × 1回あたりの値」で計算する
 * 4. Pアイテムの効果による上昇量を計算する
 * 5. パラメータボーナス（「Voパラメータ+8.5%」等）を計算する
 * 6. すべてを合計して返す
 *
 * @param card - 計算対象のサポートカード
 * @param uncap - 凸数（0〜4、凸数でアビリティの値が変わる）
 * @param actionCounts - 各アクションの実行回数（スケジュール or 手動入力）
 * @param extraEventCounts - 他カードのイベントによる追加回数（スキルカード獲得等）
 * @param parameterBonusBase - パラメータボーナスの対象値（数値 or Vo/Da/Vi別）
 * @param includeSelfTrigger - 自カードのイベントによる自己発火を含めるか
 * @param includePItem - Pアイテムの効果を含めるか
 * @param parameterBonusPerLesson - レッスンごとの Vo/Da/Vi 上昇量（指定時はレッスンごとに切り捨て計算する）
 * @returns 各アビリティの寄与度を含む計算結果
 */
export function calculateCardParameter(
  card: SupportCard,
  uncap: UncapType,
  actionCounts: Partial<Record<ActionIdType, number>>,
  extraEventCounts: Partial<Record<ActionIdType, number>>,
  parameterBonusBase: number | ParameterValues,
  includeSelfTrigger = true,
  includePItem = true,
  parameterBonusPerLesson?: PerLessonParameterValues,
): CardCalculationResult {
  // カードのタイプからパラメータ属性（Vo/Da/Vi）を特定する
  const paramType = card.parameter_type

  // パラメータボーナスの対象値を取得する
  // Vo/Da/Vi別の場合はカードのタイプに応じた値を選ぶ
  const bonusBase = typeof parameterBonusBase === 'number' ? parameterBonusBase : parameterBonusBase[paramType]

  // カードがイベントでスキルカードやPアイテムを提供する場合、
  // 対応する獲得系トリガーに +1 される（自分自身のイベントも発動回数に含む）
  const selfBonus = includeSelfTrigger ? getSelfAcquisitionBonus(card) : {}

  const parsedAbilities = card.abilities.map((a) => parseAbility(a, uncap))

  // 「イベントによるパラメータ上昇を+50%増加」のようなアビリティ
  const eventBoostAbility = parsedAbilities.find((a) => a.isEventBoost)
  const eventBoostPercent = eventBoostAbility ? eventBoostAbility.numericValue : 0
  const eventBoostMultiplier = 1 + eventBoostPercent / constant.PERCENT_DIVISOR

  // 「ボーカルパラメータボーナス+8.5%」のようなアビリティ
  const paramBonusAbility = parsedAbilities.find((a) => a.isParameterBonus)
  const paramBonusPercent = paramBonusAbility ? paramBonusAbility.numericValue : 0

  // カードのイベントから直接のパラメータ上昇値を読み取り、ブースト倍率をかける
  const eventParamBase = parseEventParameterBoost(card)
  const eventBoost = Math.floor(eventParamBase * eventBoostMultiplier)

  const abilityBoosts: CardCalculationResult['abilityBoosts'] = []
  const allAbilityDetails: CardCalculationResult['allAbilityDetails'] = []

  for (const parsed of parsedAbilities) {
    // イベント倍率・パラメータボーナス%・スキップ対象はここでは計算しない
    if (parsed.isEventBoost || parsed.isParameterBonus || parsed.skipCalculation) {
      continue
    }

    // 初期値上昇: 固定で1回だけ加算される（トリガー不要）
    if (parsed.isInitialStat) {
      const value = parsed.numericValue
      abilityBoosts.push({
        nameKey: parsed.nameKey,
        parameterType: parsed.parameterType ?? undefined,
        maxCount: parsed.maxCount ?? undefined,
        trigger: parsed.triggerKey,
        count: 1,
        valuePerTrigger: value,
        total: Math.floor(value),
      })
      allAbilityDetails.push({
        nameKey: parsed.nameKey,
        parameterType: parsed.parameterType ?? undefined,
        maxCount: parsed.maxCount ?? undefined,
        count: 1,
        valuePerTrigger: value,
        total: Math.floor(value),
      })
      continue
    }

    // ベース回数 + 他カード由来の追加回数 + 自己保有ボーナス
    const actionId = resolveActionId(parsed.triggerKey)
    const baseCount = actionCounts[actionId] ?? 0
    const extraCount = extraEventCounts[actionId] ?? 0
    const selfBonusCount = selfBonus[actionId] ?? 0
    let totalCount = baseCount + extraCount + selfBonusCount

    // 「プロデュース中N回」の上限があれば、回数を制限する
    if (parsed.maxCount !== null && totalCount > parsed.maxCount) {
      totalCount = parsed.maxCount
    }

    // パーセンテージ値（発生率等）はパラメータ上昇に直接寄与しないのでスキップする
    if (!parsed.isPercentage) {
      // 上昇量 = 1回あたりの値 × 回数（小数切り捨て）
      const total = totalCount > 0 ? Math.floor(parsed.numericValue * totalCount) : 0

      // 全アビリティ詳細: 0点のものも含めて記録（内訳表示用）
      allAbilityDetails.push({
        nameKey: parsed.nameKey,
        parameterType: parsed.parameterType ?? undefined,
        maxCount: parsed.maxCount ?? undefined,
        count: totalCount,
        valuePerTrigger: parsed.numericValue,
        total,
      })

      // 寄与ありのアビリティだけスコア内訳に追加
      if (totalCount > 0) {
        abilityBoosts.push({
          nameKey: parsed.nameKey,
          parameterType: parsed.parameterType ?? undefined,
          maxCount: parsed.maxCount ?? undefined,
          trigger: parsed.triggerKey,
          count: totalCount,
          valuePerTrigger: parsed.numericValue,
          total: Math.floor(parsed.numericValue * totalCount),
        })
      }
    }
  }

  // Pアイテムによるパラメータ上昇を処理する
  const pItemBoosts = includePItem ? parsePItemParameterBoost(card) : []
  for (const boost of pItemBoosts) {
    // ベース回数 + 他カード追加 + 自己保有ボーナス
    const boostActionId = resolveActionId(boost.triggerKey)
    const baseCount = actionCounts[boostActionId] ?? 0
    const extraCount = extraEventCounts[boostActionId] ?? 0
    const selfBonusCount = selfBonus[boostActionId] ?? 0
    let totalCount = baseCount + extraCount + selfBonusCount

    // 回数上限があれば制限する
    if (boost.maxCount !== null && totalCount > boost.maxCount) {
      totalCount = boost.maxCount
    }

    // Pアイテムの上昇量 = 1回あたりの値 × トリガー回数（小数切り捨て）
    const total = totalCount > 0 ? Math.floor(boost.value * totalCount) : 0
    allAbilityDetails.push({
      displayName: boost.description,
      triggerKey: boost.triggerKey,
      effectData: boost.effectData ?? undefined,
      parameterType: boost.parameterType,
      maxCount: boost.maxCount ?? undefined,
      count: totalCount,
      valuePerTrigger: boost.value,
      total,
    })
    // 寄与があるPアイテム効果だけスコア内訳に追加
    if (total > 0) {
      abilityBoosts.push({
        displayName: boost.description,
        trigger: boost.triggerKey,
        count: totalCount,
        valuePerTrigger: boost.value,
        total,
      })
    }
  }

  // レッスンごとのデータがある場合: 各レッスンの上昇量に対して個別に%適用→切り捨て→合算
  // ない場合（手動入力）: 合計値 × パーセント / 100（小数切り捨て）
  let parameterBonus: number
  if (parameterBonusPerLesson && paramBonusPercent > 0) {
    const perLessonValues = parameterBonusPerLesson[paramType]
    parameterBonus = perLessonValues.reduce(
      (sum, v) => sum + Math.floor((v * paramBonusPercent) / constant.PERCENT_DIVISOR),
      0,
    )
  } else {
    parameterBonus = Math.floor((bonusBase * paramBonusPercent) / constant.PERCENT_DIVISOR)
  }

  const totalIncrease = eventBoost + abilityBoosts.reduce((sum, b) => sum + b.total, 0) + parameterBonus

  return {
    cardName: card.name,
    parameterType: paramType,
    eventBoost,
    abilityBoosts,
    allAbilityDetails,
    parameterBonus,
    paramBonusPercent,
    paramBonusBase: bonusBase,
    eventBoostBase: eventParamBase,
    eventBoostPercent,
    totalIncrease,
  }
}
