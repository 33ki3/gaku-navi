/**
 * 計算のヘルパー関数・アビリティ解析
 *
 * サポート計算で使う共通ユーティリティ:
 * - サポートのタイプからパラメータ属性を判定する
 * - アビリティの構造化データを解析して計算しやすい形に変換する
 * - イベントの種類を判定する
 */

import type { Ability } from '../../types/card'
import * as enums from '../../types/enums'
import type { UncapType } from '../../types/enums'
import { PERCENT_SIGN, PLUS_SIGN } from '../../constant/common'

/**
 * アビリティの値文字列（例: "+8.5%"）を数値に変換する
 *
 * @param valueStr - 変換元の文字列
 * @returns 数値
 */
function parseNumericValue(valueStr: string): number {
  const cleaned = valueStr.replace(PERCENT_SIGN, '').replace(PLUS_SIGN, '').trim()
  return parseFloat(cleaned)
}

/**
 * 凸数（0〜4）に応じたアビリティの効果量文字列を取得する
 *
 * アビリティは凸数ごとに異なる値を持つ。
 * 指定された凸数の値がなければ凸0の値を、それもなければ "0" を返す。
 * 空文字列はアビリティ未解放を示し、"0" にフォールバックする。
 *
 * @param ability - 対象のアビリティ
 * @param uncap - 凸数
 * @returns 効果量の文字列
 */
function getAbilityValueForUncap(ability: Ability, uncap: UncapType): string {
  return ability.values[String(uncap)] || ability.values['0'] || '0'
}

/**
 * アビリティを解析した結果の型
 *
 * サポート計算で必要な情報を1つにまとめたもの。
 * 元のアビリティデータから「計算に必要な情報だけ」を取り出す。
 */
interface ParsedAbility {
  /** アビリティの名前キー（i18n翻訳に使う） */
  nameKey: enums.AbilityNameKeyType
  /** どのアクション回数カテゴリに紐づくか（レッスン、おでかけ等） */
  triggerKey: enums.TriggerKeyType
  /** 値がパーセンテージかどうか（例: 発生率50%） */
  isPercentage: boolean
  /** イベントパラメータ上昇のブースト倍率か */
  isEventBoost: boolean
  /** パラメータボーナス%か */
  isParameterBonus: boolean
  /** 初期値上昇か（トリガー不要で固定加算される） */
  isInitialStat: boolean
  /** 計算をスキップすべきか（発生率、サポート率など直接パラメータに影響しないもの） */
  skipCalculation: boolean
  /** 凸数に応じた数値 */
  numericValue: number
  /** このアビリティがどのパラメータに効くか（Vo/Da/Vi） */
  parameterType: enums.ParameterType | null
  /** 「プロデュース中N回」の回数上限（なければ null） */
  maxCount: number | null
}

/**
 * アビリティの構造化データを解析して計算しやすい形に変換する
 *
 * @param ability - 元のアビリティデータ
 * @param uncap - 現在の凸数
 * @returns 解析済みアビリティ
 */
export function parseAbility(ability: Ability, uncap: UncapType): ParsedAbility {
  // 凸数に応じた値を取得して数値に変換する
  const valueStr = getAbilityValueForUncap(ability, uncap)
  const numericValue = parseNumericValue(valueStr)
  return {
    nameKey: ability.name_key,
    triggerKey: ability.trigger_key,
    isPercentage: ability.is_percentage ?? false,
    isEventBoost: ability.is_event_boost ?? false,
    isParameterBonus: ability.is_parameter_bonus ?? false,
    isInitialStat: ability.is_initial_stat ?? false,
    skipCalculation: ability.skip_calculation ?? false,
    numericValue,
    parameterType: ability.parameter_type ?? null,
    maxCount: ability.max_count ?? null,
  }
}
