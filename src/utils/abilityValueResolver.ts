/**
 * サポートアビリティ値のマスタ解決。
 *
 * cards.json の values は空オブジェクトで出力されるため、
 * 効果段階マスタ + スロットスケジュールマスタ から復元する。
 * 例外サポートだけはサポート名ベースの例外マップで上書きする。
 */

import type { Ability, SupportCard } from '../types/card'
import { RarityType, RarityTierType, UncapType } from '../types/enums'
import { getStages, getSchedule } from '../data/score/abilityValue'
import { AbilityExceptionMap } from '../data/score/abilityException'

/** values の辞書型。 */
type AbilityValues = Record<string, string>

/** getRarityTier はレアリティとイベントSSRフラグからレアリティ階層を導出する */
function getRarityTier(rarity: RarityType, isEventSource: boolean): RarityTierType {
  if (rarity !== RarityType.SSR) return rarity as RarityTierType
  return isEventSource ? RarityTierType.EventSSR : RarityTierType.SSR
}

/**
 * アビリティの凸別値を解決する。
 *
 * values が空オブジェクトの場合はマスタから復元する。
 *
 * @param card - 対象サポート
 * @param ability - 対象アビリティ
 * @param slotIndex - 0-based のスロット番号
 * @returns 凸別値辞書
 */
export function resolveAbilityValues(card: SupportCard, ability: Ability, slotIndex: number): AbilityValues {
  // 値が既に埋め込まれている場合はそのまま返す
  if (Object.keys(ability.values).length > 0) {
    return ability.values
  }

  // サポート個別例外を先にチェック
  const slot = slotIndex + 1
  const exception = AbilityExceptionMap.get(card.name)?.get(slot)
  if (exception != null) {
    return exception
  }

  // 効果段階 + スケジュールから凸別値を組み立てる
  const rarityTier = getRarityTier(card.rarity, card.is_event_source ?? false)
  const stages = getStages(rarityTier, ability.name_key)
  const schedule = getSchedule(rarityTier, slot)

  // 段階データまたはスケジュールが未定義 → 凸別上書きなし
  if (!stages || stages.length === 0 || !schedule || schedule.length === 0) {
    return {}
  }

  // 各凸数に対して、スケジュールが指す段階のアビリティ値を割り当てる
  // 例: schedule=[0,1,1,2,3] → 凸0=未解放, 凸1=stage[0], 凸2=stage[0], 凸3=stage[1], 凸4=stage[2]
  const values: AbilityValues = {}
  for (let uncap = 0; uncap <= UncapType.Four; uncap++) {
    const stageIndex = schedule[uncap] ?? 0
    // stageIndex 0 = アビリティ未解放（空文字）
    values[uncap] = stageIndex === 0 ? '' : (stages[stageIndex - 1] ?? '')
  }
  return values
}
