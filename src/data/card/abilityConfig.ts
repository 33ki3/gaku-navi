/**
 * アビリティ名 → トリガーキー・フラグの自動導出設定
 *
 * ユーザー定義カードのフォームで、アビリティ種別を選択すると
 * trigger_key やフラグ（is_percentage 等）を自動でセットするための設定。
 */
import { AbilityNameKeyType, TriggerKeyType, ParameterType } from '../../types/enums'

/** アビリティの自動導出設定 */
interface AbilityAutoConfig {
  /** パラメータ種別でトリガーキーが変わるか */
  needsParameterType: boolean
  /** パラメータ修飾なしの場合のトリガーキー */
  baseTriggerKey: TriggerKeyType
  /** is_percentage フラグを自動でセットするか */
  isPercentage?: boolean
  /** is_parameter_bonus フラグを自動でセットするか */
  isParameterBonus?: boolean
  /** is_initial_stat フラグを自動でセットするか */
  isInitialStat?: boolean
  /** is_event_boost フラグを自動でセットするか */
  isEventBoost?: boolean
  /** skip_calculation フラグを自動でセットするか */
  skipCalculation?: boolean
}

/** パラメータ修飾付きトリガーキーの解決テーブル（baseTriggerKey → paramType → resolvedKey） */
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
  // パラメータ特化型（parameter_type で trigger_key が変わる）
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
  // パラメータなし（trigger_key = name_key と同一）
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
}
