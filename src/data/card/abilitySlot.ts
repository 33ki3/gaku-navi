/**
 * ユーザー定義サポートで選べるアビリティ入力候補
 *
 * スロット1・3・6は固定枠、スロット2・4・5はレアリティ別の自由枠として扱う
 */
import * as enums from '../../types/enums'

/**
 * 得意パラメータ別のアビリティ名を組み立てる先頭文字
 * パラメータ種別ごとの対応を一か所で管理する
 */
export const ABILITY_PARAMETER_PREFIX: Readonly<Record<enums.ParameterType, string>> = {
  [enums.ParameterType.Vocal]: 'vo_',
  [enums.ParameterType.Dance]: 'da_',
  [enums.ParameterType.Visual]: 'vi_',
}

/** アビリティごとの発動回数上限（定義がないものは無制限） */
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
  [enums.AbilityNameKeyType.BasicCardChange]: 3,
  [enums.AbilityNameKeyType.Customize]: 6,
  [enums.AbilityNameKeyType.ExamEnd]: 2,
  [enums.AbilityNameKeyType.Exam15]: 5,
  [enums.AbilityNameKeyType.ExamHp]: 1,
  [enums.AbilityNameKeyType.OutingCount]: 2,
  [enums.AbilityNameKeyType.PItemAcquire]: 6,
  [enums.AbilityNameKeyType.SpLesson20]: 4,
  [enums.AbilityNameKeyType.SpecialTraining]: 3,
}

/**
 * スロット1の固定選択肢
 * 初期パラメータかパラメータボーナスのどちらかを選択する
 */
export const SLOT1_OPTIONS: readonly enums.AbilityNameKeyType[] = [
  enums.AbilityNameKeyType.InitialStat,
  enums.AbilityNameKeyType.ParameterBonus,
]

/** スロット3の固定選択肢。サポート率のみ */
export const SLOT3_OPTIONS: readonly enums.AbilityNameKeyType[] = [enums.AbilityNameKeyType.SupportRate]

/** スロット6（6番目）の固定選択肢（レアリティ別） */
export const SLOT6_OPTIONS: Record<enums.RarityTierType, readonly enums.AbilityNameKeyType[]> = {
  [enums.RarityTierType.SSR]: [enums.AbilityNameKeyType.EventBoost, enums.AbilityNameKeyType.EventRecoveryBoost],
  [enums.RarityTierType.EventSSR]: [enums.AbilityNameKeyType.EventBoost],
  [enums.RarityTierType.SR]: [enums.AbilityNameKeyType.EventBoost, enums.AbilityNameKeyType.EventPpBoost],
  [enums.RarityTierType.R]: [enums.AbilityNameKeyType.EventBoost],
}
