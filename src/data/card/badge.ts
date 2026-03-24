/**
 * バッジマスタデータ。
 *
 * コンテスト・スキルカード種別・入手方法・プランの4カテゴリの
 * バッジ色・ラベルを統合的に定義する。
 */
import rawData from '../json/badge.json'
import type {
  PItemMemoryType,
  SkillCardType,
  SourceType,
  PlanType,
} from '../../types/enums'
import type { TranslationKey } from '../../i18n'

/** バッジエントリの型 */
interface BadgeEntry {
  label: TranslationKey
  badge: string
}

/** プランバッジエントリの型（アクティブカラー付き） */
interface PlanBadgeEntry extends BadgeEntry {
  active_color: string
}

const data = rawData as {
  memory: Record<PItemMemoryType, BadgeEntry>
  skill_type: Record<SkillCardType, BadgeEntry>
  source: Record<SourceType, BadgeEntry>
  plan: Record<PlanType, PlanBadgeEntry>
}

/** メモリ化バッジマスタ。キー: PItemMemoryType */
export const MemoryBadge: Record<PItemMemoryType, BadgeEntry> = data.memory

/** スキルカード種別バッジマスタ。キー: SkillCardType */
export const SkillTypeBadge: Record<SkillCardType, BadgeEntry> = data.skill_type

/** 入手方法バッジマスタ。キー: SourceType */
export const SourceBadge: Record<SourceType, BadgeEntry> = data.source

/** プランバッジマスタ。キー: PlanType */
export const PlanBadge: Record<PlanType, PlanBadgeEntry> = data.plan
