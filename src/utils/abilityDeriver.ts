/**
 * アビリティ自動導出ユーティリティ
 *
 * アビリティ種別とパラメータ型からトリガーキーとフラグを導出する。
 * データ定義（ABILITY_CONFIG / PARAM_TRIGGER_MAP）は data/card/abilityConfig.ts に置く。
 */
import { AbilityNameKeyType, TriggerKeyType, ParameterType } from '../types/enums'
import { ABILITY_CONFIG, PARAM_TRIGGER_MAP } from '../data/card/abilityConfig'

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
 * deriveAbilityConfig はアビリティ種別とパラメータ型からトリガーキーとフラグを自動導出する。
 *
 * @param nameKey - アビリティ種別
 * @param paramType - パラメータ種別（パラメータ特化型アビリティで使用）
 * @returns トリガーキーとフラグのオブジェクト。設定がない場合は nameKey をそのまま triggerKey として返す
 */
export function deriveAbilityConfig(nameKey: AbilityNameKeyType, paramType?: ParameterType): DeriveAbilityResult {
  const config = ABILITY_CONFIG[nameKey]

  // 設定がないアビリティは nameKey をそのまま triggerKey として使う
  if (!config) {
    return { triggerKey: nameKey as unknown as TriggerKeyType }
  }

  // パラメータ特化型の場合、ネストマップからトリガーキーを解決する
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
