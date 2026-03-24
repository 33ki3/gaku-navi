/**
 * アクション回数カテゴリのマスタデータ。
 *
 * 点数計算の「アクション回数設定」セクションに表示する
 * 全アクションの一覧・グループ分類・グループラベルを統合的に定義する。
 */
import rawData from '../json/actionCategory.json'
import { type ActionIdType, type ActionGroupType } from '../../types/enums'
import type { TranslationKey } from '../../i18n'

/** アクション回数カテゴリの型 */
interface ActionCountCategory {
  id: ActionIdType
  label: TranslationKey
  summary_label?: TranslationKey
}

/** グループエントリの型 */
interface ActionGroupEntry {
  id: ActionGroupType
  label: TranslationKey
  categories: ActionCountCategory[]
}

const data = rawData as { groups: ActionGroupEntry[] }

/** 全カテゴリのフラット配列（表示順を保持） */
export const ActionCategoryList: readonly ActionCountCategory[] = data.groups.flatMap((g) => g.categories)

/** グループ別に分類された辞書（JSONのグループ構造をそのまま利用） */
export const ActionGroups: Record<string, ActionCountCategory[]> = Object.fromEntries(
  data.groups.map((g) => [g.id, g.categories]),
)

/**
 * アクショングループの表示ラベル（i18n キー）を返す。
 *
 * @param group - アクショングループ
 * @returns i18n キー
 */
export function getActionGroupLabel(group: ActionGroupType): TranslationKey {
  return data.groups.find((g) => g.id === group)!.label
}

/** サマリ表示用のアクションエントリ */
interface ActionSummaryEntry {
  id: ActionIdType
  label: TranslationKey
}

/** サマリ表示用のアクション一覧（summary_label を持つカテゴリのみ） */
export const ActionSummaryList: readonly ActionSummaryEntry[] = ActionCategoryList.filter(
  (c): c is ActionCountCategory & { summary_label: TranslationKey } => c.summary_label != null,
).map((c) => ({ id: c.id, label: c.summary_label }))
