/**
 * アビリティキーワードマスタ。
 *
 * アビリティキーワード（初期パラメータ・レッスン・お出かけなど）ごとの
 * 表示ラベル・バッジ略称・トリガーキー対応を一元管理する。
 * フィルター UI、サポート一覧バッジ、キーワード検索に使用。
 */

import { AbilityKeywordType, TriggerKeyType } from '../../types/enums'
import type { TranslationKey } from '../../i18n'

/** アビリティキーワードマスタの1行分 */
interface AbilityKeywordEntry {
  id: AbilityKeywordType
  label: TranslationKey
  badge: TranslationKey
  isParamCategory: boolean
  triggers: TriggerKeyType[]
}

const entries: AbilityKeywordEntry[] = [
  {
    id: AbilityKeywordType.InitialParameter,
    label: 'card.ability.initial_param',
    badge: 'card.badge.initial_param',
    isParamCategory: true,
    triggers: [
      TriggerKeyType.InitialStat,
      TriggerKeyType.VoInitialStat,
      TriggerKeyType.DaInitialStat,
      TriggerKeyType.ViInitialStat,
    ],
  },
  {
    id: AbilityKeywordType.ParameterBonus,
    label: 'card.ability.param_bonus',
    badge: 'card.badge.param_bonus',
    isParamCategory: true,
    triggers: [
      TriggerKeyType.ParameterBonus,
      TriggerKeyType.VoParameterBonus,
      TriggerKeyType.DaParameterBonus,
      TriggerKeyType.ViParameterBonus,
    ],
  },
  {
    id: AbilityKeywordType.SpLesson,
    label: 'card.ability.sp_lesson',
    badge: 'card.badge.sp_lesson',
    isParamCategory: false,
    triggers: [
      TriggerKeyType.SpLesson20,
      TriggerKeyType.SpLessonEnd,
      TriggerKeyType.VoSpLessonEnd,
      TriggerKeyType.DaSpLessonEnd,
      TriggerKeyType.ViSpLessonEnd,
      TriggerKeyType.SpLessonHp,
      TriggerKeyType.VoSpLessonHp,
      TriggerKeyType.DaSpLessonHp,
      TriggerKeyType.ViSpLessonHp,
      TriggerKeyType.SpLessonHpAll,
      TriggerKeyType.SpLessonPp,
      TriggerKeyType.VoSpLessonPp,
      TriggerKeyType.DaSpLessonPp,
      TriggerKeyType.ViSpLessonPp,
      TriggerKeyType.SpLessonRate,
      TriggerKeyType.VoSpLessonRate,
      TriggerKeyType.DaSpLessonRate,
      TriggerKeyType.ViSpLessonRate,
      TriggerKeyType.SpLessonRateAll,
    ],
  },
  {
    id: AbilityKeywordType.Lesson,
    label: 'card.ability.lesson',
    badge: 'card.badge.lesson',
    isParamCategory: false,
    triggers: [
      TriggerKeyType.LessonEnd,
      TriggerKeyType.VoLessonEnd,
      TriggerKeyType.DaLessonEnd,
      TriggerKeyType.ViLessonEnd,
      TriggerKeyType.NormalLessonEnd,
      TriggerKeyType.VoNormalLessonEnd,
      TriggerKeyType.DaNormalLessonEnd,
      TriggerKeyType.ViNormalLessonEnd,
      TriggerKeyType.LessonBonus,
      TriggerKeyType.VoLessonBonus,
      TriggerKeyType.DaLessonBonus,
      TriggerKeyType.ViLessonBonus,
    ],
  },
  {
    id: AbilityKeywordType.CardEnhance,
    label: 'card.ability.card_enhance',
    badge: 'card.badge.card_enhance',
    isParamCategory: false,
    triggers: [TriggerKeyType.SkillEnhance, TriggerKeyType.ASkillEnhance, TriggerKeyType.MSkillEnhance],
  },
  {
    id: AbilityKeywordType.CardDelete,
    label: 'card.ability.card_delete',
    badge: 'card.badge.card_delete',
    isParamCategory: false,
    triggers: [TriggerKeyType.Delete, TriggerKeyType.ASkillDelete, TriggerKeyType.MSkillDelete],
  },
  {
    id: AbilityKeywordType.CardChange,
    label: 'card.ability.change',
    badge: 'card.badge.change',
    isParamCategory: false,
    triggers: [TriggerKeyType.Change],
  },
  {
    id: AbilityKeywordType.CardAcquire,
    label: 'card.ability.card_acquire',
    badge: 'card.badge.card_acquire',
    isParamCategory: false,
    triggers: [
      TriggerKeyType.SkillAcquire,
      TriggerKeyType.MSkillAcquire,
      TriggerKeyType.ASkillAcquire,
      TriggerKeyType.GoodConditionCardAcquire,
      TriggerKeyType.ConcentrationCardAcquire,
      TriggerKeyType.MotivationCardAcquire,
      TriggerKeyType.GoodImpressionCardAcquire,
      TriggerKeyType.AggressiveCardAcquire,
      TriggerKeyType.FullPowerCardAcquire,
      TriggerKeyType.ReserveCardAcquire,
      TriggerKeyType.VitalityCardAcquire,
      TriggerKeyType.SsrCardAcquire,
    ],
  },
  {
    id: AbilityKeywordType.ClassWork,
    label: 'card.ability.class',
    badge: 'card.badge.class',
    isParamCategory: false,
    triggers: [TriggerKeyType.ClassWorkEnd],
  },
  {
    id: AbilityKeywordType.Exam,
    label: 'card.ability.exam',
    badge: 'card.badge.exam',
    isParamCategory: false,
    triggers: [TriggerKeyType.ExamEnd, TriggerKeyType.ExamHp],
  },
  {
    id: AbilityKeywordType.ActivitySupplyGift,
    label: 'card.ability.supply',
    badge: 'card.badge.supply',
    isParamCategory: false,
    triggers: [TriggerKeyType.ActivitySupplyGift],
  },
  {
    id: AbilityKeywordType.Outing,
    label: 'card.ability.outing',
    badge: 'card.badge.outing',
    isParamCategory: false,
    triggers: [TriggerKeyType.Outing],
  },
  {
    id: AbilityKeywordType.Consult,
    label: 'card.ability.consult',
    badge: 'card.badge.consult',
    isParamCategory: false,
    triggers: [TriggerKeyType.Consult],
  },
  {
    id: AbilityKeywordType.PDrink,
    label: 'card.ability.p_drink',
    badge: 'card.badge.p_drink',
    isParamCategory: false,
    triggers: [TriggerKeyType.PDrinkAcquire, TriggerKeyType.PDrinkExchange],
  },
  {
    id: AbilityKeywordType.Rest,
    label: 'card.ability.rest',
    badge: 'card.badge.rest',
    isParamCategory: false,
    triggers: [TriggerKeyType.Rest],
  },
  {
    id: AbilityKeywordType.Customize,
    label: 'card.ability.customize',
    badge: 'card.badge.customize',
    isParamCategory: false,
    triggers: [TriggerKeyType.Customize],
  },
  {
    id: AbilityKeywordType.PItem,
    label: 'card.ability.p_item',
    badge: 'card.badge.p_item',
    isParamCategory: false,
    triggers: [TriggerKeyType.PItemAcquire],
  },
  {
    id: AbilityKeywordType.SpecialTraining,
    label: 'card.ability.special',
    badge: 'card.badge.special',
    isParamCategory: false,
    triggers: [TriggerKeyType.SpecialTraining],
  },
]

/** キーワード→エントリのルックアップマップ */
export const AbilityKeywordMap = new Map<AbilityKeywordType, AbilityKeywordEntry>(entries.map((e) => [e.id, e]))

/** アビリティキーワード一覧（表示順でソート済み） */
export const AbilityKeywordList: AbilityKeywordType[] = entries.map((e) => e.id)

/** パラメータ系カテゴリに属するキーワード一覧 */
export const AbilityParamKeywords: AbilityKeywordType[] = entries.filter((e) => e.isParamCategory).map((e) => e.id)

/** 効果系カテゴリ（パラメータ系以外）に属するキーワード一覧 */
export const AbilityEffectKeywords: AbilityKeywordType[] = entries.filter((e) => !e.isParamCategory).map((e) => e.id)

/** アビリティフィルターの「パラメータ系」カテゴリに属するキーワードセット */
export const AbilityCategoryParam = new Set<AbilityKeywordType>(AbilityParamKeywords)
