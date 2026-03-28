/**
 * スキルカード表示モードマスタ。
 *
 * カード詳細モーダルでスキルカードの効果表示を切り替えるモードのラベルを定義する。
 */
import { SkillCardViewModeType } from '../../types/enums'
import type { TranslationKey } from '../../i18n'

const entries: { id: SkillCardViewModeType; label: TranslationKey }[] = [
  { id: SkillCardViewModeType.Unenhanced, label: 'card.view_mode.unenhanced' },
  { id: SkillCardViewModeType.Enhanced, label: 'card.view_mode.enhanced' },
  { id: SkillCardViewModeType.Custom, label: 'card.view_mode.custom' },
]

const map = new Map<SkillCardViewModeType, TranslationKey>(
  entries.map((e) => [e.id, e.label]),
)

/**
 * スキルカード表示モードの表示ラベル（i18n キー）を返す。
 *
 * @param mode - 表示モード
 * @returns i18n キー
 */
export function getSkillCardViewModeLabel(mode: SkillCardViewModeType): TranslationKey {
  return map.get(mode)!
}
