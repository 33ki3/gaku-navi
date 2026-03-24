/**
 * スキルカード表示モードマスタ。
 *
 * カード詳細モーダルでスキルカードの効果表示を切り替えるモードのラベルを定義する。
 */

import rawData from '../json/skillCardViewMode.json'
import { type SkillCardViewModeType } from '../../types/enums'
import type { TranslationKey } from '../../i18n'

const map = new Map<SkillCardViewModeType, TranslationKey>(
  (rawData as { key: SkillCardViewModeType; label: TranslationKey }[]).map((e) => [e.key, e.label]),
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
