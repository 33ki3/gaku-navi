/**
 * バッジマスタデータ。
 *
 * コンテスト・スキルカード種別・入手方法・プランの4カテゴリの
 * バッジ色・ラベルを統合的に定義する。
 */
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

/** メモリ化バッジマスタ。キー: PItemMemoryType */
export const MemoryBadge: Record<PItemMemoryType, BadgeEntry> = {
  memorizable: { label: 'card.memory.memorizable', badge: 'bg-emerald-100 text-emerald-700' },
  non_memorizable: { label: 'card.memory.non_memorizable', badge: 'bg-slate-200 text-slate-500' },
}

/** スキルカード種別バッジマスタ。キー: SkillCardType */
export const SkillTypeBadge: Record<SkillCardType, BadgeEntry> = {
  mental: { label: 'card.skill.mental', badge: 'bg-teal-100 text-teal-800' },
  active: { label: 'card.skill.active', badge: 'bg-orange-100 text-orange-800' },
}

/** 入手方法バッジマスタ。キー: SourceType */
export const SourceBadge: Record<SourceType, BadgeEntry> = {
  gacha: { label: 'card.source.gacha', badge: 'bg-green-100 text-green-700' },
  coin_gacha: { label: 'card.source.coin_gacha', badge: 'bg-amber-100 text-amber-700' },
  season_limited: { label: 'card.source.season_limited', badge: 'bg-purple-100 text-purple-700' },
  unit_limited: { label: 'card.source.unit_limited', badge: 'bg-purple-100 text-purple-700' },
  live_tour_limited: { label: 'card.source.live_tour_limited', badge: 'bg-purple-100 text-purple-700' },
  hatsuboshi_fes: { label: 'card.source.hatsuboshi_fes', badge: 'bg-orange-100 text-orange-700' },
  event: { label: 'card.source.event', badge: 'bg-cyan-100 text-cyan-700' },
  initial: { label: 'card.source.initial', badge: 'bg-slate-100 text-slate-500' },
  shop: { label: 'card.source.shop', badge: 'bg-emerald-100 text-emerald-700' },
  pack: { label: 'card.source.pack', badge: 'bg-rose-100 text-rose-700' },
}

/** プランバッジマスタ。キー: PlanType */
export const PlanBadge: Record<PlanType, PlanBadgeEntry> = {
  free: { label: 'common.plan.free', badge: 'bg-slate-100 text-slate-600', active_color: 'bg-slate-100 text-slate-600' },
  sense: { label: 'common.plan.sense', badge: 'bg-yellow-100 text-yellow-800', active_color: 'bg-yellow-100 text-yellow-800' },
  logic: { label: 'common.plan.logic', badge: 'bg-pink-100 text-pink-800', active_color: 'bg-pink-100 text-pink-800' },
  anomaly: { label: 'common.plan.anomaly', badge: 'bg-indigo-100 text-indigo-800', active_color: 'bg-indigo-100 text-indigo-800' },
}
