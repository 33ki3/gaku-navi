/**
 * バッジマスタデータ。
 *
 * コンテスト・スキルカード種別・入手方法・プランの4カテゴリの
 * バッジ色・ラベルを統合的に定義する。
 */
import { PItemMemoryType, SkillCardType, SourceType, PlanType } from '../../types/enums'
import type { TranslationKey } from '../../i18n'

/** メモリ化バッジエントリの型 */
interface MemoryBadgeEntry {
  id: PItemMemoryType
  label: TranslationKey
  badge: string
}

/** スキルカード種別バッジエントリの型 */
interface SkillTypeBadgeEntry {
  id: SkillCardType
  label: TranslationKey
  badge: string
}

/** 入手方法バッジエントリの型 */
interface SourceBadgeEntry {
  id: SourceType
  label: TranslationKey
  badge: string
}

/** プランバッジエントリの型（アクティブカラー付き） */
interface PlanBadgeEntry {
  id: PlanType
  label: TranslationKey
  badge: string
  activeColor: string
}

const memoryBadgeEntries: MemoryBadgeEntry[] = [
  { id: PItemMemoryType.Memorizable, label: 'card.memory.memorizable', badge: 'bg-emerald-100 text-emerald-700' },
  { id: PItemMemoryType.NonMemorizable, label: 'card.memory.non_memorizable', badge: 'bg-slate-200 text-slate-500' },
]

const skillTypeBadgeEntries: SkillTypeBadgeEntry[] = [
  { id: SkillCardType.Mental, label: 'card.skill.mental', badge: 'bg-teal-100 text-teal-800' },
  { id: SkillCardType.Active, label: 'card.skill.active', badge: 'bg-orange-100 text-orange-800' },
]

const sourceBadgeEntries: SourceBadgeEntry[] = [
  { id: SourceType.Gacha, label: 'card.source.gacha', badge: 'bg-green-100 text-green-700' },
  { id: SourceType.CoinGacha, label: 'card.source.coin_gacha', badge: 'bg-amber-100 text-amber-700' },
  { id: SourceType.SeasonLimited, label: 'card.source.season_limited', badge: 'bg-purple-100 text-purple-700' },
  { id: SourceType.UnitLimited, label: 'card.source.unit_limited', badge: 'bg-purple-100 text-purple-700' },
  { id: SourceType.LiveTourLimited, label: 'card.source.live_tour_limited', badge: 'bg-purple-100 text-purple-700' },
  { id: SourceType.HatsuboshiFes, label: 'card.source.hatsuboshi_fes', badge: 'bg-orange-100 text-orange-700' },
  { id: SourceType.Event, label: 'card.source.event', badge: 'bg-cyan-100 text-cyan-700' },
  { id: SourceType.Initial, label: 'card.source.initial', badge: 'bg-slate-100 text-slate-500' },
  { id: SourceType.Shop, label: 'card.source.shop', badge: 'bg-emerald-100 text-emerald-700' },
  { id: SourceType.Pack, label: 'card.source.pack', badge: 'bg-rose-100 text-rose-700' },
]

const planBadgeEntries: PlanBadgeEntry[] = [
  {
    id: PlanType.Free,
    label: 'common.plan.free',
    badge: 'bg-slate-100 text-slate-600',
    activeColor: 'bg-slate-100 text-slate-600',
  },
  {
    id: PlanType.Sense,
    label: 'common.plan.sense',
    badge: 'bg-yellow-100 text-yellow-800',
    activeColor: 'bg-yellow-100 text-yellow-800',
  },
  {
    id: PlanType.Logic,
    label: 'common.plan.logic',
    badge: 'bg-pink-100 text-pink-800',
    activeColor: 'bg-pink-100 text-pink-800',
  },
  {
    id: PlanType.Anomaly,
    label: 'common.plan.anomaly',
    badge: 'bg-indigo-100 text-indigo-800',
    activeColor: 'bg-indigo-100 text-indigo-800',
  },
]

const memoryBadgeMap = new Map(memoryBadgeEntries.map((e) => [e.id, e]))
const skillTypeBadgeMap = new Map(skillTypeBadgeEntries.map((e) => [e.id, e]))
const sourceBadgeMap = new Map(sourceBadgeEntries.map((e) => [e.id, e]))
const planBadgeMap = new Map(planBadgeEntries.map((e) => [e.id, e]))

/**
 * メモリ化バッジを取得する。
 *
 * @param memory - Pアイテムのメモリ化種別
 * @returns バッジエントリ
 */
export function getMemoryBadge(memory: PItemMemoryType): MemoryBadgeEntry {
  return memoryBadgeMap.get(memory)!
}

/**
 * スキルカード種別バッジを取得する。
 *
 * @param skillType - スキルカード種別
 * @returns バッジエントリ
 */
export function getSkillTypeBadge(skillType: SkillCardType): SkillTypeBadgeEntry {
  return skillTypeBadgeMap.get(skillType)!
}

/**
 * 入手方法バッジを取得する。
 *
 * @param source - 入手方法種別
 * @returns バッジエントリ
 */
export function getSourceBadge(source: SourceType): SourceBadgeEntry {
  return sourceBadgeMap.get(source)!
}

/**
 * プランバッジを取得する。
 *
 * @param plan - プラン種別
 * @returns バッジエントリ（アクティブカラー付き）
 */
export function getPlanBadge(plan: PlanType): PlanBadgeEntry {
  return planBadgeMap.get(plan)!
}

/** 最適編成で選択可能なプラン一覧（Free を除外） */
export const SelectablePlanEntries = planBadgeEntries.filter((e) => e.id !== PlanType.Free)
