/**
 * 効果キーワードマスタ。
 *
 * 元気・好調・集中などのゲーム内ステータスキーワードの
 * i18nラベルキーを一元管理する。
 */
import type { TranslationKey } from '../../i18n'
import type { EffectKeywordType } from '../../types/enums'

interface GameKeywordEntry {
  key: EffectKeywordType
  label: TranslationKey
}

const entries: GameKeywordEntry[] = [
  { key: 'vitality', label: 'common.keyword.vitality' },
  { key: 'good_condition', label: 'common.keyword.good_condition' },
  { key: 'perfect_condition', label: 'common.keyword.perfect_condition' },
  { key: 'concentration', label: 'common.keyword.concentration' },
  { key: 'good_impression', label: 'common.keyword.good_impression' },
  { key: 'motivation', label: 'common.keyword.motivation' },
  { key: 'reserve', label: 'common.keyword.reserve' },
  { key: 'aggressive', label: 'common.keyword.aggressive' },
  { key: 'full_power', label: 'common.keyword.full_power' },
  { key: 'full_power_value', label: 'common.keyword.full_power_value' },
  { key: 'enthusiasm', label: 'common.keyword.enthusiasm' },
]

const ENTRY_MAP = new Map<EffectKeywordType, GameKeywordEntry>(entries.map((e) => [e.key, e]))

/**
 * 効果キーワードのエントリを返す。
 *
 * @param keyword - キーワード識別子（例: "vitality"）
 * @returns エントリ（ラベル等を含む）
 */
export function getEffectKeywordEntry(keyword: EffectKeywordType): GameKeywordEntry | undefined {
  return ENTRY_MAP.get(keyword)
}
