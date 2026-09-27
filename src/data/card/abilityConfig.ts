/**
 * アビリティ名から、表示・計算に必要な項目を決める設定
 *
 * ユーザー定義カードのフォームでアビリティ種別を選択したとき、
 * 発動条件やパラメータ上昇の扱いを自動で補うために使う
 */
import { AbilityNameKeyType, ParameterType, TriggerKeyType } from '../../types/enums'

/** アビリティの自動導出設定 */
interface AbilityAutoConfig {
  /** パラメータ種別に応じて発動条件を選ぶか */
  needsParameterType: boolean
  /** パラメータ補正なしで使う発動条件 */
  baseTriggerKey: TriggerKeyType
  /** 割合として扱う設定を自動で付けるか */
  isPercentage?: boolean
  /** パラメータボーナスとして扱う設定を自動で付けるか */
  isParameterBonus?: boolean
  /** 初期パラメータとして扱う設定を自動で付けるか */
  isInitialStat?: boolean
  /** イベント上昇として扱う設定を自動で付けるか */
  isEventBoost?: boolean
  /** 通常の点数計算から外す設定を自動で付けるか */
  skipCalculation?: boolean
}

/** 基本の発動条件とパラメータ種別から、実際に使う発動条件を探す表 */
export const PARAM_TRIGGER_MAP: Partial<Record<TriggerKeyType, Record<ParameterType, TriggerKeyType>>> = {
  [TriggerKeyType.ParameterBonus]: {
    [ParameterType.Vocal]: TriggerKeyType.VoParameterBonus,
    [ParameterType.Dance]: TriggerKeyType.DaParameterBonus,
    [ParameterType.Visual]: TriggerKeyType.ViParameterBonus,
  },
  [TriggerKeyType.InitialStat]: {
    [ParameterType.Vocal]: TriggerKeyType.VoInitialStat,
    [ParameterType.Dance]: TriggerKeyType.DaInitialStat,
    [ParameterType.Visual]: TriggerKeyType.ViInitialStat,
  },
  [TriggerKeyType.LessonEnd]: {
    [ParameterType.Vocal]: TriggerKeyType.VoLessonEnd,
    [ParameterType.Dance]: TriggerKeyType.DaLessonEnd,
    [ParameterType.Visual]: TriggerKeyType.ViLessonEnd,
  },
  [TriggerKeyType.NormalLessonEnd]: {
    [ParameterType.Vocal]: TriggerKeyType.VoNormalLessonEnd,
    [ParameterType.Dance]: TriggerKeyType.DaNormalLessonEnd,
    [ParameterType.Visual]: TriggerKeyType.ViNormalLessonEnd,
  },
  [TriggerKeyType.SpLessonEnd]: {
    [ParameterType.Vocal]: TriggerKeyType.VoSpLessonEnd,
    [ParameterType.Dance]: TriggerKeyType.DaSpLessonEnd,
    [ParameterType.Visual]: TriggerKeyType.ViSpLessonEnd,
  },
  [TriggerKeyType.SpLessonRate]: {
    [ParameterType.Vocal]: TriggerKeyType.VoSpLessonRate,
    [ParameterType.Dance]: TriggerKeyType.DaSpLessonRate,
    [ParameterType.Visual]: TriggerKeyType.ViSpLessonRate,
  },
  [TriggerKeyType.SpLessonHp]: {
    [ParameterType.Vocal]: TriggerKeyType.VoSpLessonHp,
    [ParameterType.Dance]: TriggerKeyType.DaSpLessonHp,
    [ParameterType.Visual]: TriggerKeyType.ViSpLessonHp,
  },
  [TriggerKeyType.SpLessonPp]: {
    [ParameterType.Vocal]: TriggerKeyType.VoSpLessonPp,
    [ParameterType.Dance]: TriggerKeyType.DaSpLessonPp,
    [ParameterType.Visual]: TriggerKeyType.ViSpLessonPp,
  },
}
export const ABILITY_CONFIG: Partial<Record<AbilityNameKeyType, AbilityAutoConfig>> = {
  // パラメータ特化型は、得意パラメータに応じて発動条件が変わる
  [AbilityNameKeyType.ParameterBonus]: {
    needsParameterType: true,
    baseTriggerKey: TriggerKeyType.ParameterBonus,
    isPercentage: true,
    isParameterBonus: true,
  },
  [AbilityNameKeyType.InitialStat]: {
    needsParameterType: true,
    baseTriggerKey: TriggerKeyType.InitialStat,
    isInitialStat: true,
  },
  [AbilityNameKeyType.LessonEnd]: {
    needsParameterType: true,
    baseTriggerKey: TriggerKeyType.LessonEnd,
  },
  [AbilityNameKeyType.NormalLessonEnd]: {
    needsParameterType: true,
    baseTriggerKey: TriggerKeyType.NormalLessonEnd,
  },
  [AbilityNameKeyType.SpLessonEnd]: {
    needsParameterType: true,
    baseTriggerKey: TriggerKeyType.SpLessonEnd,
  },
  [AbilityNameKeyType.SpLessonRate]: {
    needsParameterType: true,
    baseTriggerKey: TriggerKeyType.SpLessonRate,
  },
  [AbilityNameKeyType.SpLessonHp]: {
    needsParameterType: true,
    baseTriggerKey: TriggerKeyType.SpLessonHp,
  },
  [AbilityNameKeyType.SpLessonPp]: {
    needsParameterType: true,
    baseTriggerKey: TriggerKeyType.SpLessonPp,
    isPercentage: true,
  },
  [AbilityNameKeyType.BasicCardChange]: {
    needsParameterType: true,
    baseTriggerKey: TriggerKeyType.BasicCardChange,
  },
  [AbilityNameKeyType.Exam15]: {
    needsParameterType: true,
    baseTriggerKey: TriggerKeyType.Exam15,
  },
  // パラメータ種別がないアビリティは、名前と同じ発動条件を使う
  [AbilityNameKeyType.EventBoost]: {
    needsParameterType: false,
    baseTriggerKey: TriggerKeyType.EventBoost,
    isPercentage: true,
    isEventBoost: true,
  },
  [AbilityNameKeyType.SupportRate]: {
    needsParameterType: false,
    baseTriggerKey: TriggerKeyType.SupportRate,
    isPercentage: true,
    skipCalculation: true,
  },
  [AbilityNameKeyType.InitialPp]: {
    needsParameterType: false,
    baseTriggerKey: TriggerKeyType.InitialPp,
    skipCalculation: true,
  },
  // アビリティ名と、登録・計算に使う発動条件名が異なるもの
  [AbilityNameKeyType.ActivitySupplyGiftHp]: {
    needsParameterType: false,
    baseTriggerKey: TriggerKeyType.ActivitySupplyGift,
  },
  [AbilityNameKeyType.Discount]: {
    needsParameterType: false,
    baseTriggerKey: TriggerKeyType.Nothing,
  },
  [AbilityNameKeyType.EventPpBoost]: {
    needsParameterType: false,
    baseTriggerKey: TriggerKeyType.Nothing,
  },
  [AbilityNameKeyType.EventRecoveryBoost]: {
    needsParameterType: false,
    baseTriggerKey: TriggerKeyType.Nothing,
  },
  [AbilityNameKeyType.LessonPpBoost]: {
    needsParameterType: false,
    baseTriggerKey: TriggerKeyType.Nothing,
  },
  [AbilityNameKeyType.SpLessonRateAllHigh]: {
    needsParameterType: false,
    baseTriggerKey: TriggerKeyType.SpLessonRateAll,
  },
}
