/**
 * アビリティキーワードマスタ。
 *
 * アビリティキーワード（初期パラメータ・レッスン・お出かけなど）ごとの
 * 表示ラベル・バッジ略称・トリガーキー対応を一元管理する。
 * フィルター UI、カード一覧バッジ、キーワード検索に使用。
 */

import { type AbilityKeywordType, type TriggerKeyType } from '../../types/enums'
import type { TranslationKey } from '../../i18n'

/** アビリティキーワードマスタの1行分 */
interface AbilityKeywordEntry {
  keyword: AbilityKeywordType
  label: TranslationKey
  badge: TranslationKey
  is_param_category: boolean
  triggers: TriggerKeyType[]
}

const entries: AbilityKeywordEntry[] = [
  { keyword: 'initial_parameter', label: 'card.ability.initial_param', badge: 'card.badge.initial_param', is_param_category: true, triggers: ['initial_stat', 'vo_initial_stat', 'da_initial_stat', 'vi_initial_stat'] },
  { keyword: 'parameter_bonus', label: 'card.ability.param_bonus', badge: 'card.badge.param_bonus', is_param_category: true, triggers: ['parameter_bonus', 'vo_parameter_bonus', 'da_parameter_bonus', 'vi_parameter_bonus'] },
  { keyword: 'sp_lesson', label: 'card.ability.sp_lesson', badge: 'card.badge.sp_lesson', is_param_category: false, triggers: ['sp_lesson_20', 'sp_lesson_end', 'vo_sp_lesson_end', 'da_sp_lesson_end', 'vi_sp_lesson_end', 'sp_lesson_hp', 'vo_sp_lesson_hp', 'da_sp_lesson_hp', 'vi_sp_lesson_hp', 'sp_lesson_hp_all', 'sp_lesson_pp', 'vo_sp_lesson_pp', 'da_sp_lesson_pp', 'vi_sp_lesson_pp', 'sp_lesson_rate', 'vo_sp_lesson_rate', 'da_sp_lesson_rate', 'vi_sp_lesson_rate', 'sp_lesson_rate_all'] },
  { keyword: 'lesson', label: 'card.ability.lesson', badge: 'card.badge.lesson', is_param_category: false, triggers: ['lesson_end', 'vo_lesson_end', 'da_lesson_end', 'vi_lesson_end', 'normal_lesson_end', 'vo_normal_lesson_end', 'da_normal_lesson_end', 'vi_normal_lesson_end', 'lesson_bonus', 'vo_lesson_bonus', 'da_lesson_bonus', 'vi_lesson_bonus'] },
  { keyword: 'card_enhance', label: 'card.ability.card_enhance', badge: 'card.badge.card_enhance', is_param_category: false, triggers: ['skill_enhance', 'a_skill_enhance', 'm_skill_enhance'] },
  { keyword: 'card_delete', label: 'card.ability.card_delete', badge: 'card.badge.card_delete', is_param_category: false, triggers: ['delete', 'a_skill_delete', 'm_skill_delete'] },
  { keyword: 'card_change', label: 'card.ability.change', badge: 'card.badge.change', is_param_category: false, triggers: ['change'] },
  { keyword: 'card_acquire', label: 'card.ability.card_acquire', badge: 'card.badge.card_acquire', is_param_category: false, triggers: ['skill_acquire', 'm_skill_acquire', 'a_skill_acquire', 'good_condition_card_acquire', 'concentration_card_acquire', 'motivation_card_acquire', 'good_impression_card_acquire', 'aggressive_card_acquire', 'full_power_card_acquire', 'reserve_card_acquire', 'vitality_card_acquire', 'ssr_card_acquire'] },
  { keyword: 'class_work', label: 'card.ability.class', badge: 'card.badge.class', is_param_category: false, triggers: ['class_work_end'] },
  { keyword: 'exam', label: 'card.ability.exam', badge: 'card.badge.exam', is_param_category: false, triggers: ['exam_end', 'exam_hp'] },
  { keyword: 'activity_supply_gift', label: 'card.ability.supply', badge: 'card.badge.supply', is_param_category: false, triggers: ['activity_supply_gift'] },
  { keyword: 'outing', label: 'card.ability.outing', badge: 'card.badge.outing', is_param_category: false, triggers: ['outing'] },
  { keyword: 'consult', label: 'card.ability.consult', badge: 'card.badge.consult', is_param_category: false, triggers: ['consult'] },
  { keyword: 'p_drink', label: 'card.ability.p_drink', badge: 'card.badge.p_drink', is_param_category: false, triggers: ['p_drink_acquire', 'p_drink_exchange'] },
  { keyword: 'rest', label: 'card.ability.rest', badge: 'card.badge.rest', is_param_category: false, triggers: ['rest'] },
  { keyword: 'customize', label: 'card.ability.customize', badge: 'card.badge.customize', is_param_category: false, triggers: ['customize'] },
  { keyword: 'p_item', label: 'card.ability.p_item', badge: 'card.badge.p_item', is_param_category: false, triggers: ['p_item_acquire'] },
  { keyword: 'special_training', label: 'card.ability.special', badge: 'card.badge.special', is_param_category: false, triggers: ['special_training'] },
]

/** キーワード→エントリのルックアップマップ */
export const AbilityKeywordMap = new Map<AbilityKeywordType, AbilityKeywordEntry>(entries.map((e) => [e.keyword, e]))

/** アビリティキーワード一覧（表示順でソート済み） */
export const AbilityKeywordList: AbilityKeywordType[] = entries.map((e) => e.keyword)

/** パラメータ系カテゴリに属するキーワード一覧 */
export const AbilityParamKeywords: AbilityKeywordType[] = entries.filter((e) => e.is_param_category).map((e) => e.keyword)

/** 効果系カテゴリ（パラメータ系以外）に属するキーワード一覧 */
export const AbilityEffectKeywords: AbilityKeywordType[] = entries.filter((e) => !e.is_param_category).map((e) => e.keyword)

/** アビリティフィルターの「パラメータ系」カテゴリに属するキーワードセット */
export const AbilityCategoryParam = new Set<AbilityKeywordType>(AbilityParamKeywords)
