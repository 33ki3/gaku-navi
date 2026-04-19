/**
 * 入手方法表示用マスタデータ。
 *
 * ガチャ・コインガチャ・限定・フェス・イベント・ショップ等の
 * バッジ色・ラベルを定義する。フィルターとバッジの両方で使用する。
 */
import { SourceType } from '../../types/enums'
import type { TranslationKey } from '../../i18n'

/** 入手方法エントリの型 */
interface SourceDisplayEntry {
  id: SourceType
  label: TranslationKey
  badge: string
}

const entries: SourceDisplayEntry[] = [
  { id: SourceType.Gacha, label: 'card.source.gacha', badge: 'bg-green-100 text-green-700' },
  { id: SourceType.CoinGacha, label: 'card.source.coin_gacha', badge: 'bg-amber-100 text-amber-700' },
  { id: SourceType.SeasonLimited, label: 'card.source.season_limited', badge: 'bg-purple-100 text-purple-700' },
  { id: SourceType.UnitLimited, label: 'card.source.unit_limited', badge: 'bg-purple-100 text-purple-700' },
  { id: SourceType.LiveTourLimited, label: 'card.source.live_tour_limited', badge: 'bg-purple-100 text-purple-700' },
  { id: SourceType.HatsuboshiFes, label: 'card.source.hatsuboshi_fes', badge: 'bg-orange-100 text-orange-700' },
  { id: SourceType.Event, label: 'card.source.event', badge: 'bg-cyan-100 text-cyan-700' },
  { id: SourceType.Initial, label: 'card.source.initial', badge: 'bg-slate-100 text-slate-600' },
  { id: SourceType.Shop, label: 'card.source.shop', badge: 'bg-emerald-100 text-emerald-700' },
  { id: SourceType.Pack, label: 'card.source.pack', badge: 'bg-rose-100 text-rose-700' },
  { id: SourceType.User, label: 'card.source.user', badge: 'bg-violet-100 text-violet-700' },
]

/** 入手方法エントリ一覧（フィルター・バッジ共用） */
export const SourceDisplayEntries = entries

const map = new Map(entries.map((e) => [e.id, e]))

/**
 * 入手方法の表示エントリを返す。
 *
 * @param source - 入手方法種別
 * @returns SourceDisplayEntry オブジェクト
 */
export function getSourceEntry(source: SourceType): SourceDisplayEntry {
  return map.get(source)!
}
