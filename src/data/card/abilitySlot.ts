/**
 * アビリティスロット定義マスタ
 *
 * ユーザー定義サポートフォーム用の定数を定義する。
 * スロット1・3・6は固定枠で選択肢が決まっている。
 * スロット2・4・5は自由枠でレアリティ別の全アビリティから選択できる。
 */
import { AbilityNameKeyType, RarityTierType } from '../../types/enums'

/** 未選択を表す値 */
export const SLOT_NONE = '' as const

/** アビリティごとの固定 max_count（定義がないものは無制限） */
export const ABILITY_MAX_COUNT: Partial<Record<AbilityNameKeyType, number>> = {
  [AbilityNameKeyType.ASkillDelete]: 3,
  [AbilityNameKeyType.MSkillDelete]: 3,
  [AbilityNameKeyType.Change]: 3,
  [AbilityNameKeyType.Customize]: 6,
  [AbilityNameKeyType.ExamEnd]: 2,
  [AbilityNameKeyType.ExamHp]: 1,
  [AbilityNameKeyType.PItemAcquire]: 6,
  [AbilityNameKeyType.SpLesson20]: 4,
  [AbilityNameKeyType.SpecialTraining]: 3,
}

/**
 * スロット1（idx 0）の固定選択肢。
 * 初期パラメータかパラメータボーナスのどちらかを選択する。
 */
export const SLOT1_OPTIONS: readonly AbilityNameKeyType[] = [
  AbilityNameKeyType.InitialStat,
  AbilityNameKeyType.ParameterBonus,
]

/** スロット3（idx 2）の固定選択肢。サポート率のみ。 */
export const SLOT3_OPTIONS: readonly AbilityNameKeyType[] = [AbilityNameKeyType.SupportRate]

/** スロット6（idx 5）の固定選択肢（レアリティ別） */
export const SLOT6_OPTIONS: Record<RarityTierType, readonly AbilityNameKeyType[]> = {
  [RarityTierType.SSR]: [AbilityNameKeyType.EventBoost, AbilityNameKeyType.EventRecoveryBoost],
  [RarityTierType.EventSSR]: [AbilityNameKeyType.EventBoost],
  [RarityTierType.SR]: [AbilityNameKeyType.EventBoost, AbilityNameKeyType.EventPpBoost],
  [RarityTierType.R]: [AbilityNameKeyType.EventBoost],
}

/**
 * 固定スロットかどうかを返す。0-based index。
 * スロット0・2・5が固定枠。
 */
export function isFixedSlot(slotIdx: number): boolean {
  return slotIdx === 0 || slotIdx === 2 || slotIdx === 5
}
