/** Pアイドルの追加・名称・登場日を扱い、登場日の降順に並べる */
import * as enums from '../types/enums'

/** PアイドルJSONを検証・展開した、アプリ内で扱う一件分の定義 */
interface PIdol {
  /** アイドルIDと正式名称を連結した保存用ID */
  id: string
  /** 所属するアイドルの共通ID */
  idolId: enums.IdolId
  /** Pアイドルの正式名称 */
  name: string
  /** 登場日。YYYY-MM-DD形式で、一覧の降順表示に使う */
  releasedAt: string
}

/** JSONから受け取った値が配列ではないオブジェクトか判定する
 *
 * @param value - 実行時に検証する値
 * @returns キーと値を持つオブジェクトならtrue
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

/** JSONを検証してPアイドル一覧へ展開し、登場日の降順に並べる
 *
 * @param rawPIdols - 外部JSONから取得した未検証の値
 * @returns 保存用IDを含むPアイドル一覧
 * @throws 入力形式やアイドルID、カード項目が不正な場合
 */
function inflatePIdols(rawPIdols: unknown): PIdol[] {
  if (!Array.isArray(rawPIdols)) {
    throw new Error('P-idol data must be an array')
  }

  return (
    rawPIdols
      .flatMap((entry: unknown) => {
        if (!isRecord(entry) || typeof entry.idol_id !== 'string' || !Array.isArray(entry.cards)) {
          throw new Error('P-idol entry must contain an idol_id and cards array')
        }

        const { idol_id: idolIdValue, cards: rawPIdolEntries } = entry
        // JSONの識別子を共通定義と照合し、未登録アイドルを黙って省かず検出する
        const idolId = Object.values(enums.IdolId).find((id) => id === idolIdValue)
        if (!idolId) throw new Error(`Unknown idol: ${idolIdValue}`)

        return rawPIdolEntries.map((rawPIdol: unknown) => {
          if (!isRecord(rawPIdol) || typeof rawPIdol.name !== 'string' || typeof rawPIdol.released_at !== 'string') {
            throw new Error(`Invalid P-idol entry for ${idolId}`)
          }

          // 手入力IDを増やさず、アイドルと正式名称の組み合わせで保存用のキーを作る
          return {
            id: `${idolId}:${rawPIdol.name}`,
            idolId,
            name: rawPIdol.name,
            releasedAt: rawPIdol.released_at,
          }
        })
      })
      // ISO形式の日付を比較し、同日のカードはJSON内の登録順を維持する
      .sort((left, right) => right.releasedAt.localeCompare(left.releasedAt))
  )
}

/** アプリ全体で参照する、登場日の降順に並んだPアイドル一覧 */
export let P_IDOLS: PIdol[] = []

/** 外部JSONを検証して、アプリ全体から参照するPアイドル一覧を更新する
 *
 * @param rawPIdols - 外部JSONから取得した未検証の値
 * @returns なし
 * @throws 入力形式やアイドルID、カード項目が不正な場合
 */
export function initializePIdols(rawPIdols: unknown): void {
  P_IDOLS = inflatePIdols(rawPIdols)
}
