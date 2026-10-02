/**
 * サポート間連携の追加発動回数と点数を計算する。
 * 候補選定・編成探索・結果表示で、単体計算後の発動上限と端数処理を共有する。
 */

/** 単体計算済みのアビリティから、他カードの提供分だけを加点するための情報 */
export interface SynergyAbility {
  /** 提供アクションの配列位置 */
  actionIdx: number
  /** アビリティ1回あたりの点数 */
  parsedValue: number
  /** 発動回数上限。未指定なら上限なし */
  maxCount: number | undefined
  /** 単体点の計算で使った発動回数 */
  usedCount: number
}

/**
 * 単体点で使った回数を除いた発動上限を、他カードからの提供回数へ適用する
 *
 * @param ability - 単体計算済みの発動回数と上限
 * @param providedCount - 自身の提供分を除いた追加回数
 * @returns 連携によって追加で発動できる回数
 */
export function getSynergyExtraCount(ability: SynergyAbility, providedCount: number): number {
  // 提供がなければ加点せず、上限ありの場合だけ単体計算で消費した回数を引く
  if (providedCount <= 0) return 0
  return ability.maxCount === undefined
    ? providedCount
    : Math.min(providedCount, Math.max(0, ability.maxCount - ability.usedCount))
}

/**
 * 編成の提供回数から受け手の連携点を計算し、候補評価と本探索で同じ上限・端数処理を使う
 *
 * @param abilities - 受け手の事前解析済みアビリティ
 * @param totalProvided - 編成全体の提供回数
 * @param ownProvided - 単体点で計算済みの、自身の提供回数
 * @returns 他カードの提供分による追加点
 */
export function calculateSynergyScore(
  abilities: readonly SynergyAbility[],
  totalProvided: Float64Array,
  ownProvided: Float64Array,
): number {
  let score = 0
  for (const ability of abilities) {
    // 自身の提供分を差し引き、アビリティごとの残り発動回数だけ加点する
    const count = getSynergyExtraCount(ability, totalProvided[ability.actionIdx] - ownProvided[ability.actionIdx])
    score += Math.floor(ability.parsedValue * count)
  }
  return score
}
