/**
 * Pアイテム発動条件・発動時効果の選択肢マスタ
 *
 * ユーザー定義サポートフォームで使用するPアイテムの発動条件（トリガー）と
 * 発動時効果（アクション）の選択肢を定義する。
 */
import { TriggerKeyType, ActionIdType } from '../../types/enums'

import type { TranslationKey } from '../../i18n'

/** Pアイテム発動条件の選択肢 */
interface PItemTriggerOption {
  /** トリガーキー */
  value: TriggerKeyType
  /** 表示ラベルの i18n キー */
  labelKey: TranslationKey
}

/** Pアイテム発動時効果の選択肢 */
interface PItemEffectOption {
  /** アクションID */
  value: ActionIdType
  /** 表示ラベルの i18n キー */
  labelKey: TranslationKey
}

/** 発動条件の選択肢一覧 */
export const PITEM_TRIGGER_OPTIONS: PItemTriggerOption[] = [
  { value: TriggerKeyType.None, labelKey: 'pitem_trigger.none' },
  { value: TriggerKeyType.LessonEnd, labelKey: 'pitem_trigger.lesson_end' },
  { value: TriggerKeyType.VoLessonEnd, labelKey: 'pitem_trigger.vo_lesson_end' },
  { value: TriggerKeyType.DaLessonEnd, labelKey: 'pitem_trigger.da_lesson_end' },
  { value: TriggerKeyType.ViLessonEnd, labelKey: 'pitem_trigger.vi_lesson_end' },
  { value: TriggerKeyType.NormalLessonEnd, labelKey: 'pitem_trigger.normal_lesson_end' },
  { value: TriggerKeyType.VoNormalLessonEnd, labelKey: 'pitem_trigger.vo_normal_lesson_end' },
  { value: TriggerKeyType.DaNormalLessonEnd, labelKey: 'pitem_trigger.da_normal_lesson_end' },
  { value: TriggerKeyType.ViNormalLessonEnd, labelKey: 'pitem_trigger.vi_normal_lesson_end' },
  { value: TriggerKeyType.SkillEnhance, labelKey: 'pitem_trigger.skill_enhance' },
  { value: TriggerKeyType.MSkillEnhance, labelKey: 'pitem_trigger.m_skill_enhance' },
  { value: TriggerKeyType.ASkillEnhance, labelKey: 'pitem_trigger.a_skill_enhance' },
  { value: TriggerKeyType.Delete, labelKey: 'pitem_trigger.delete' },
  { value: TriggerKeyType.MSkillDelete, labelKey: 'pitem_trigger.m_skill_delete' },
  { value: TriggerKeyType.ASkillDelete, labelKey: 'pitem_trigger.a_skill_delete' },
  { value: TriggerKeyType.Change, labelKey: 'pitem_trigger.change' },
  { value: TriggerKeyType.SkillAcquire, labelKey: 'pitem_trigger.skill_acquire' },
  { value: TriggerKeyType.MSkillAcquire, labelKey: 'pitem_trigger.m_skill_acquire' },
  { value: TriggerKeyType.ASkillAcquire, labelKey: 'pitem_trigger.a_skill_acquire' },
  { value: TriggerKeyType.VitalityCardAcquire, labelKey: 'pitem_trigger.vitality_card_acquire' },
  { value: TriggerKeyType.GoodConditionCardAcquire, labelKey: 'pitem_trigger.good_condition_card_acquire' },
  { value: TriggerKeyType.ConcentrationCardAcquire, labelKey: 'pitem_trigger.concentration_card_acquire' },
  { value: TriggerKeyType.GoodImpressionCardAcquire, labelKey: 'pitem_trigger.good_impression_card_acquire' },
  { value: TriggerKeyType.MotivationCardAcquire, labelKey: 'pitem_trigger.motivation_card_acquire' },
  { value: TriggerKeyType.ReserveCardAcquire, labelKey: 'pitem_trigger.reserve_card_acquire' },
  { value: TriggerKeyType.AggressiveCardAcquire, labelKey: 'pitem_trigger.aggressive_card_acquire' },
  { value: TriggerKeyType.FullPowerCardAcquire, labelKey: 'pitem_trigger.full_power_card_acquire' },
  { value: TriggerKeyType.SsrCardAcquire, labelKey: 'pitem_trigger.ssr_card_acquire' },
  { value: TriggerKeyType.DrowsyAcquire, labelKey: 'pitem_trigger.drowsy_acquire' },
  { value: TriggerKeyType.ClassWorkEnd, labelKey: 'pitem_trigger.class_work_end' },
  { value: TriggerKeyType.ExamEnd, labelKey: 'pitem_trigger.exam_end' },
  { value: TriggerKeyType.ActivitySupplyGift, labelKey: 'pitem_trigger.activity_supply_gift' },
  { value: TriggerKeyType.Outing, labelKey: 'pitem_trigger.outing' },
  { value: TriggerKeyType.Consult, labelKey: 'pitem_trigger.consult' },
  { value: TriggerKeyType.PDrinkAcquire, labelKey: 'pitem_trigger.p_drink_acquire' },
  { value: TriggerKeyType.PDrinkExchange, labelKey: 'pitem_trigger.p_drink_exchange' },
  { value: TriggerKeyType.Rest, labelKey: 'pitem_trigger.rest' },
  { value: TriggerKeyType.Customize, labelKey: 'pitem_trigger.customize' },
  { value: TriggerKeyType.PItemAcquire, labelKey: 'pitem_trigger.p_item_acquire' },
  { value: TriggerKeyType.SpLesson20, labelKey: 'pitem_trigger.sp_lesson_20' },
  { value: TriggerKeyType.SpLessonEnd, labelKey: 'pitem_trigger.sp_lesson_end' },
  { value: TriggerKeyType.VoSpLessonEnd, labelKey: 'pitem_trigger.vo_sp_lesson_end' },
  { value: TriggerKeyType.DaSpLessonEnd, labelKey: 'pitem_trigger.da_sp_lesson_end' },
  { value: TriggerKeyType.ViSpLessonEnd, labelKey: 'pitem_trigger.vi_sp_lesson_end' },
  { value: TriggerKeyType.SpecialTraining, labelKey: 'pitem_trigger.special_training' },
  { value: TriggerKeyType.TroubleDelete, labelKey: 'pitem_trigger.trouble_delete' },
]

/** 発動時効果の選択肢一覧 */
export const PITEM_EFFECT_OPTIONS: PItemEffectOption[] = [
  { value: ActionIdType.SkillEnhance, labelKey: 'pitem_effect.skill_enhance' },
  { value: ActionIdType.MSkillEnhance, labelKey: 'pitem_effect.m_skill_enhance' },
  { value: ActionIdType.ASkillEnhance, labelKey: 'pitem_effect.a_skill_enhance' },
  { value: ActionIdType.Delete, labelKey: 'pitem_effect.delete' },
  { value: ActionIdType.MSkillDelete, labelKey: 'pitem_effect.m_skill_delete' },
  { value: ActionIdType.ASkillDelete, labelKey: 'pitem_effect.a_skill_delete' },
  { value: ActionIdType.Change, labelKey: 'pitem_effect.change' },
  { value: ActionIdType.SkillAcquire, labelKey: 'pitem_effect.skill_acquire' },
  { value: ActionIdType.MSkillAcquire, labelKey: 'pitem_effect.m_skill_acquire' },
  { value: ActionIdType.ASkillAcquire, labelKey: 'pitem_effect.a_skill_acquire' },
  { value: ActionIdType.VitalityCardAcquire, labelKey: 'pitem_effect.vitality_card_acquire' },
  { value: ActionIdType.GoodConditionCardAcquire, labelKey: 'pitem_effect.good_condition_card_acquire' },
  { value: ActionIdType.ConcentrationCardAcquire, labelKey: 'pitem_effect.concentration_card_acquire' },
  { value: ActionIdType.GoodImpressionCardAcquire, labelKey: 'pitem_effect.good_impression_card_acquire' },
  { value: ActionIdType.MotivationCardAcquire, labelKey: 'pitem_effect.motivation_card_acquire' },
  { value: ActionIdType.ReserveCardAcquire, labelKey: 'pitem_effect.reserve_card_acquire' },
  { value: ActionIdType.AggressiveCardAcquire, labelKey: 'pitem_effect.aggressive_card_acquire' },
  { value: ActionIdType.FullPowerCardAcquire, labelKey: 'pitem_effect.full_power_card_acquire' },
  { value: ActionIdType.SsrCardAcquire, labelKey: 'pitem_effect.ssr_card_acquire' },
  { value: ActionIdType.DrowsyAcquire, labelKey: 'pitem_effect.drowsy_acquire' },
  { value: ActionIdType.PDrinkAcquire, labelKey: 'pitem_effect.p_drink_acquire' },
  { value: ActionIdType.TroubleDelete, labelKey: 'pitem_effect.trouble_delete' },
]
