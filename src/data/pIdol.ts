/** Pアイドルの追加・名称・登場日を扱い、登場日の降順に並べる */
import * as enums from '../types/enums'
import pIdolJson from './json/pIdol.json'

/** JSONの登録内容を実行時のカード定義へ変換した、新しい登場日順の一覧 */
export const P_IDOLS = pIdolJson
  .flatMap(({ idol_id, cards }) => {
    // JSONの識別子を共通定義と照合し、未登録アイドルを黙って省かず検出する
    const idolId = Object.values(enums.IdolId).find((id) => id === idol_id)
    if (!idolId) throw new Error(`Unknown idol: ${idol_id}`)
    // 手入力IDを増やさず、アイドルと正式名称の組み合わせで保存用のキーを作る
    return cards.map(({ name, released_at }) => ({ id: `${idolId}:${name}`, idolId, name, releasedAt: released_at }))
  })
  // ISO形式の日付を比較し、同日のカードはJSON内の登録順を維持する
  .sort((left, right) => right.releasedAt.localeCompare(left.releasedAt))
