/**
 * 効果キーワードマスタ。
 *
 * 元気・好調・集中などのゲーム内ステータスキーワードの
 * i18nラベルキーを一元管理する。
 */
import type { TranslationKey } from '../../i18n'
import { EffectKeywordType } from '../../types/enums'

interface EffectKeywordEntry {
  id: EffectKeywordType
  label: TranslationKey
}

const entries: EffectKeywordEntry[] = [
  { id: EffectKeywordType.Vitality, label: 'common.keyword.vitality' },
  { id: EffectKeywordType.GoodCondition, label: 'common.keyword.good_condition' },
  { id: EffectKeywordType.PerfectCondition, label: 'common.keyword.perfect_condition' },
  { id: EffectKeywordType.Concentration, label: 'common.keyword.concentration' },
  { id: EffectKeywordType.GoodImpression, label: 'common.keyword.good_impression' },
  { id: EffectKeywordType.Motivation, label: 'common.keyword.motivation' },
  { id: EffectKeywordType.Reserve, label: 'common.keyword.reserve' },
  { id: EffectKeywordType.Aggressive, label: 'common.keyword.aggressive' },
  { id: EffectKeywordType.FullPower, label: 'common.keyword.full_power' },
  { id: EffectKeywordType.FullPowerValue, label: 'common.keyword.full_power_value' },
  { id: EffectKeywordType.Enthusiasm, label: 'common.keyword.enthusiasm' },
]

const ENTRY_MAP = new Map<EffectKeywordType, EffectKeywordEntry>(entries.map((e) => [e.id, e]))

/**
 * 効果キーワードのエントリを返す。
 *
 * @param keyword - キーワード識別子（例: "vitality"）
 * @returns エントリ（ラベル等を含む）
 */
export function getEffectKeywordEntry(keyword: EffectKeywordType): EffectKeywordEntry | undefined {
  return ENTRY_MAP.get(keyword)
}
