/** Pアイテム本文の効果 → 提供アクションID */
import { ActionIdType, EffectTemplateKeyType } from '../../types/enums'

/** Pアイテム本文の効果キー → 提供アクションID一覧 */
export const PItemBodyActionMap: Partial<Record<EffectTemplateKeyType, readonly ActionIdType[]>> = {
  [EffectTemplateKeyType.GenerateCard]: [ActionIdType.SkillAcquire],
  [EffectTemplateKeyType.GenerateEnhancedCard]: [ActionIdType.SkillAcquire],
  [EffectTemplateKeyType.RandomSkillCardRAcquire]: [ActionIdType.SkillAcquire],
  [EffectTemplateKeyType.AcquireItemPp]: [ActionIdType.PItemAcquire],
  [EffectTemplateKeyType.SelectDeleteAcquireItem]: [ActionIdType.PItemAcquire, ActionIdType.Delete],
}
