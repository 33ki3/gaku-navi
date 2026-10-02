/**
 * アビリティ自動導出ユーティリティ
 *
 * アビリティ種別とパラメータ型からトリガーキーとフラグを導出する
 * データ定義（ABILITY_CONFIG / PARAM_TRIGGER_MAP）はdata/card/abilityConfig.tsに置く
 */
import { ABILITY_CONFIG, PARAM_TRIGGER_MAP } from '../data/card/abilityConfig'
import { AbilityNameKeyType, ParameterType, TriggerKeyType } from '../types/enums'

/** deriveAbilityConfig の戻り値型 */
interface DeriveAbilityResult {
  /** 解決済みトリガーキー */
  triggerKey: TriggerKeyType
  /** パーセンテージ表記か */
  isPercentage?: boolean
  /** パラメータボーナスか */
  isParameterBonus?: boolean
  /** 初期ステータスか */
  isInitialStat?: boolean
  /** イベントブーストか */
  isEventBoost?: boolean
  /** スコア計算をスキップするか */
  skipCalculation?: boolean
}

/**
 * アビリティ種別とパラメータ型から、計算に使う条件とフラグを自動で決める
 *
 * @param nameKey - アビリティ種別
 * @param paramType - パラメータ種別（パラメータ特化型アビリティの判定に使う）
 * @returns 計算に使う条件とフラグ。設定がない場合はアビリティ種別を条件として使う
 */
export function deriveAbilityConfig(nameKey: AbilityNameKeyType, paramType?: ParameterType): DeriveAbilityResult {
  const config = ABILITY_CONFIG[nameKey]

  // 設定がないアビリティは nameKey をそのまま triggerKey として使う
  if (!config) {
    return { triggerKey: nameKey as unknown as TriggerKeyType }
  }

  // パラメータ特化型の場合、パラメータ別の対応表から発動条件を解決する
  let triggerKey = config.baseTriggerKey
  if (config.needsParameterType && paramType) {
    triggerKey = PARAM_TRIGGER_MAP[config.baseTriggerKey]?.[paramType] ?? config.baseTriggerKey
  }

  return {
    triggerKey,
    isPercentage: config.isPercentage,
    isParameterBonus: config.isParameterBonus,
    isInitialStat: config.isInitialStat,
    isEventBoost: config.isEventBoost,
    skipCalculation: config.skipCalculation,
  }
}
