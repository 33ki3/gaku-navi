/**
 * Pアイテムのエフェクトトリガー解決ユーティリティ
 *
 * boost.trigger_key → effect.trigger の PItemEffectPart 変換を行う。
 */
import { TriggerKeyType, EffectTemplateKeyType, EffectKeywordType, ParameterType } from '../types/enums'
import type { PItemEffectPart } from '../types/card'

/**
 * resolveEffectTrigger は boost.trigger_key → effect.trigger の PItemEffectPart を返す。
 *
 * カード詳細表示でP-item効果テキストを正しく生成するために使用する。
 */
export function resolveEffectTrigger(triggerKey: TriggerKeyType): PItemEffectPart {
  // 未設定の場合は Null（表示なし）
  if (triggerKey === TriggerKeyType.None) {
    return { key: EffectTemplateKeyType.Null }
  }

  // *_card_acquire → keyword_card_acquire + keyword
  const cardAcquireMap: Record<string, EffectKeywordType> = {
    [TriggerKeyType.ConcentrationCardAcquire]: EffectKeywordType.Concentration,
    [TriggerKeyType.ReserveCardAcquire]: EffectKeywordType.Reserve,
    [TriggerKeyType.MotivationCardAcquire]: EffectKeywordType.Motivation,
    [TriggerKeyType.FullPowerCardAcquire]: EffectKeywordType.FullPower,
    [TriggerKeyType.GoodImpressionCardAcquire]: EffectKeywordType.GoodImpression,
    [TriggerKeyType.GoodConditionCardAcquire]: EffectKeywordType.GoodCondition,
    [TriggerKeyType.AggressiveCardAcquire]: EffectKeywordType.Aggressive,
    [TriggerKeyType.VitalityCardAcquire]: EffectKeywordType.Vitality,
  }
  const keyword = cardAcquireMap[triggerKey]
  if (keyword) {
    return { key: EffectTemplateKeyType.KeywordCardAcquire, keyword }
  }

  // *_lesson_end → param_lesson_end + param
  const lessonEndMap: Record<string, ParameterType> = {
    [TriggerKeyType.VoLessonEnd]: ParameterType.Vocal,
    [TriggerKeyType.DaLessonEnd]: ParameterType.Dance,
    [TriggerKeyType.ViLessonEnd]: ParameterType.Visual,
  }
  const lessonParam = lessonEndMap[triggerKey]
  if (lessonParam) {
    return { key: EffectTemplateKeyType.ParamLessonEnd, param: lessonParam }
  }

  // *_normal_lesson_end → param_normal_lesson_end + param
  const normalLessonEndMap: Record<string, ParameterType> = {
    [TriggerKeyType.VoNormalLessonEnd]: ParameterType.Vocal,
    [TriggerKeyType.DaNormalLessonEnd]: ParameterType.Dance,
    [TriggerKeyType.ViNormalLessonEnd]: ParameterType.Visual,
  }
  const normalLessonParam = normalLessonEndMap[triggerKey]
  if (normalLessonParam) {
    return { key: EffectTemplateKeyType.ParamNormalLessonEnd, param: normalLessonParam }
  }

  // *_sp_lesson_end → param_sp_lesson_end + param
  const spLessonEndMap: Record<string, ParameterType> = {
    [TriggerKeyType.VoSpLessonEnd]: ParameterType.Vocal,
    [TriggerKeyType.DaSpLessonEnd]: ParameterType.Dance,
    [TriggerKeyType.ViSpLessonEnd]: ParameterType.Visual,
  }
  const spLessonParam = spLessonEndMap[triggerKey]
  if (spLessonParam) {
    return { key: EffectTemplateKeyType.ParamSpLessonEnd, param: spLessonParam }
  }

  // 直接対応するキー
  const directMap: Record<string, EffectTemplateKeyType> = {
    [TriggerKeyType.LessonEnd]: EffectTemplateKeyType.LessonEnd,
    [TriggerKeyType.NormalLessonEnd]: EffectTemplateKeyType.NormalLessonEnd,
    [TriggerKeyType.SpLessonEnd]: EffectTemplateKeyType.SpLessonEnd,
    [TriggerKeyType.SpLesson20]: EffectTemplateKeyType.SpLesson20,
    [TriggerKeyType.ExamEnd]: EffectTemplateKeyType.ExamEnd,
    [TriggerKeyType.ClassWorkEnd]: EffectTemplateKeyType.ClassWorkEnd,
    [TriggerKeyType.SpecialTraining]: EffectTemplateKeyType.SpecialTrainingStart,
    [TriggerKeyType.Consult]: EffectTemplateKeyType.ConsultSelection,
    [TriggerKeyType.Outing]: EffectTemplateKeyType.OutingEnd,
    [TriggerKeyType.ActivitySupplyGift]: EffectTemplateKeyType.ActivitySupplyGiftSelection,
    [TriggerKeyType.Rest]: EffectTemplateKeyType.Rest,
    [TriggerKeyType.SkillEnhance]: EffectTemplateKeyType.CardEnhance,
    [TriggerKeyType.MSkillEnhance]: EffectTemplateKeyType.MSkillEnhance,
    [TriggerKeyType.ASkillEnhance]: EffectTemplateKeyType.ASkillEnhance,
    [TriggerKeyType.Delete]: EffectTemplateKeyType.SkillDelete,
    [TriggerKeyType.MSkillDelete]: EffectTemplateKeyType.MSkillDelete,
    [TriggerKeyType.ASkillDelete]: EffectTemplateKeyType.ASkillDelete,
    [TriggerKeyType.Change]: EffectTemplateKeyType.SkillChange,
    [TriggerKeyType.SkillAcquire]: EffectTemplateKeyType.SkillAcquire,
    [TriggerKeyType.MSkillAcquire]: EffectTemplateKeyType.MSkillAcquire,
    [TriggerKeyType.ASkillAcquire]: EffectTemplateKeyType.ASkillAcquire,
    [TriggerKeyType.SsrCardAcquire]: EffectTemplateKeyType.SsrCardAcquire,
    [TriggerKeyType.DrowsyAcquire]: EffectTemplateKeyType.DrowsyAcquire,
    [TriggerKeyType.PDrinkAcquire]: EffectTemplateKeyType.PDrinkAcquire,
    [TriggerKeyType.PDrinkExchange]: EffectTemplateKeyType.PDrinkExchange,
    [TriggerKeyType.Customize]: EffectTemplateKeyType.Customize,
    [TriggerKeyType.PItemAcquire]: EffectTemplateKeyType.PItemAcquire,
    [TriggerKeyType.TroubleDelete]: EffectTemplateKeyType.TroubleDelete,
  }
  const directKey = directMap[triggerKey]
  if (directKey) {
    return { key: directKey }
  }

  // フォールバック
  return { key: EffectTemplateKeyType.TurnStart }
}
