/**
 * アビリティスロット定義マスタ
 *
 * ユーザー定義サポートフォーム用の定数を定義する。
 * スロット1・3・6は固定枠で選択肢が決まっている。
 * スロット2・4・5は自由枠でレアリティ別の全アビリティから選択できる。
 */
import * as enums from '../../types/enums'

/**
 * パラメータ特化アビリティ名を判定するためのデータキー接頭辞
 * パラメータ種別をキーにして、enum値と接頭辞の対応を一か所で管理する
 */
export const ABILITY_PARAMETER_PREFIX: Readonly<Record<enums.ParameterType, string>> = {
  [enums.ParameterType.Vocal]: 'vo_',
  [enums.ParameterType.Dance]: 'da_',
  [enums.ParameterType.Visual]: 'vi_',
}

/** アビリティごとの固定 max_count（定義がないものは無制限） */
export const ABILITY_MAX_COUNT: Partial<Record<enums.AbilityNameKeyType, number>> = {
  [enums.AbilityNameKeyType.ActivitySupplyGiftCount]: 2,
  [enums.AbilityNameKeyType.ASkillDelete]: 3,
  [enums.AbilityNameKeyType.ConsultCount]: 2,
  [enums.AbilityNameKeyType.DeleteCount]: 4,
  [enums.AbilityNameKeyType.PDrinkAcquireCount]: 10,
  [enums.AbilityNameKeyType.VitalityCardAcquire8]: 4,
  [enums.AbilityNameKeyType.GoodConditionCardAcquire8]: 4,
  [enums.AbilityNameKeyType.ConcentrationCardAcquire8]: 4,
  [enums.AbilityNameKeyType.GoodImpressionCardAcquire8]: 4,
  [enums.AbilityNameKeyType.MotivationCardAcquire8]: 4,
  [enums.AbilityNameKeyType.ReserveCardAcquire8]: 4,
  [enums.AbilityNameKeyType.AggressiveCardAcquire8]: 4,
  [enums.AbilityNameKeyType.FullPowerCardAcquire8]: 4,
  [enums.AbilityNameKeyType.ConsultSkillCardAcquire]: 5,
  [enums.AbilityNameKeyType.MSkillDelete]: 3,
  [enums.AbilityNameKeyType.Change]: 3,
  [enums.AbilityNameKeyType.Customize]: 6,
  [enums.AbilityNameKeyType.ExamEnd]: 2,
  [enums.AbilityNameKeyType.ExamHp]: 1,
  [enums.AbilityNameKeyType.OutingCount]: 2,
  [enums.AbilityNameKeyType.PItemAcquire]: 6,
  [enums.AbilityNameKeyType.SpLesson20]: 4,
  [enums.AbilityNameKeyType.SpecialTraining]: 3,
}

/**
 * スロット1（idx 0）の固定選択肢。
 * 初期パラメータかパラメータボーナスのどちらかを選択する。
 */
export const SLOT1_OPTIONS: readonly enums.AbilityNameKeyType[] = [
  enums.AbilityNameKeyType.InitialStat,
  enums.AbilityNameKeyType.ParameterBonus,
]

/** スロット3（idx 2）の固定選択肢。サポート率のみ。 */
export const SLOT3_OPTIONS: readonly enums.AbilityNameKeyType[] = [enums.AbilityNameKeyType.SupportRate]

/** スロット6（idx 5）の固定選択肢（レアリティ別） */
export const SLOT6_OPTIONS: Record<enums.RarityTierType, readonly enums.AbilityNameKeyType[]> = {
  [enums.RarityTierType.SSR]: [enums.AbilityNameKeyType.EventBoost, enums.AbilityNameKeyType.EventRecoveryBoost],
  [enums.RarityTierType.EventSSR]: [enums.AbilityNameKeyType.EventBoost],
  [enums.RarityTierType.SR]: [enums.AbilityNameKeyType.EventBoost, enums.AbilityNameKeyType.EventPpBoost],
  [enums.RarityTierType.R]: [enums.AbilityNameKeyType.EventBoost],
}

/**
 * 固定スロットかどうかを返す。0-based index。
 * スロット0・2・5が固定枠。
 */
export function isFixedSlot(slotIdx: number): boolean {
  return slotIdx === 0 || slotIdx === 2 || slotIdx === 5
}
