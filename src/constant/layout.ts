/**
 * レイアウト・仮想スクロール定数。
 *
 * ブレークポイント・行高さ・グリッド間隔など、カード一覧の
 * レスポンシブ表示と仮想スクロールに必要な数値定数をまとめたファイル。
 */

/** 4列表示の最小幅（max-w-7xl + パディングを考慮）。これ以上なら 4 列で表示する。 */
export const BREAKPOINT_4COL = 1200

/** 4列表示の最小幅（点数設定パネル固定時）。パネルが右に固定されているときはこの幅を使う。 */
export const BREAKPOINT_4COL_PINNED = 960

/** 3列表示の最小幅 */
export const BREAKPOINT_3COL = 1024

/** 3列表示の最小幅（点数設定パネル固定時） */
export const BREAKPOINT_3COL_PINNED = 720

/** 2列表示の最小幅 */
export const BREAKPOINT_2COL = 640

/** カード行の推定高さ（px・動的計測前の初期値）。仮想スクロールの初期描画に使う。 */
export const ROW_HEIGHT = 148

/** グリッドの行間隔（px）。仮想スクロールの行高計算に加算される。 */
export const GRID_GAP = 16

/** グリッドの列間隔（px）。Tailwind の gap に対応する。 */
export const GRID_COL_GAP = 16

/** 仮想スクロールの overscan 行数。見えている範囲の外側に余分に描画する行数。 */
export const VIRTUAL_OVERSCAN = 5
