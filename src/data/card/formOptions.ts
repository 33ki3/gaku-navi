/**
 * ユーザー定義サポートフォームの選択肢マスタ。
 *
 * フォーム各コンポーネントで使用する選択肢の定義をまとめたファイル。
 */
import { RarityType, CardType, PlanType, SkillCardType, SkillCardRarityType } from '../../types/enums'
import type { TranslationKey } from '../../i18n'

/** レアリティ選択肢 */
export const RARITY_SELECT_OPTIONS: { value: RarityType; labelKey: TranslationKey }[] = [
  { value: RarityType.SSR, labelKey: 'common.rarity.ssr' },
  { value: RarityType.SR, labelKey: 'common.rarity.sr' },
  { value: RarityType.R, labelKey: 'common.rarity.r' },
]

/** タイプ選択肢（Assist 除外） */
export const TYPE_SELECT_OPTIONS: { value: CardType; labelKey: TranslationKey }[] = [
  { value: CardType.Vocal, labelKey: 'common.type.vocal' },
  { value: CardType.Dance, labelKey: 'common.type.dance' },
  { value: CardType.Visual, labelKey: 'common.type.visual' },
]

/** プラン選択肢 */
export const PLAN_SELECT_OPTIONS: { value: PlanType; labelKey: TranslationKey }[] = [
  { value: PlanType.Free, labelKey: 'common.plan.free' },
  { value: PlanType.Sense, labelKey: 'common.plan.sense' },
  { value: PlanType.Logic, labelKey: 'common.plan.logic' },
  { value: PlanType.Anomaly, labelKey: 'common.plan.anomaly' },
]

/** スキルカード種別選択肢 */
export const SKILL_CARD_TYPE_OPTIONS: { value: SkillCardType; labelKey: TranslationKey }[] = [
  { value: SkillCardType.Mental, labelKey: 'card.skill.mental' },
  { value: SkillCardType.Active, labelKey: 'card.skill.active' },
]

/** スキルカードレアリティ選択肢 */
export const SKILL_CARD_RARITY_OPTIONS: { value: SkillCardRarityType; labelKey: TranslationKey }[] = [
  { value: SkillCardRarityType.SSR, labelKey: 'common.skill_card_rarity.ssr' },
  { value: SkillCardRarityType.SR, labelKey: 'common.skill_card_rarity.sr' },
]
