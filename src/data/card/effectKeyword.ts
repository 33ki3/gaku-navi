/**
 * 効果キーワードマスタ。
 *
 * 元気・好調・集中などのゲーム内ステータスキーワードの
 * i18nラベルキーを一元管理する。
 */
import rawData from './gameKeyword.json'
import type { TranslationKey } from '../../i18n'
import type { EffectKeywordType } from '../../types/enums'

interface GameKeywordEntry {
  key: EffectKeywordType
  label: TranslationKey
}

const entries = rawData as GameKeywordEntry[]
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
