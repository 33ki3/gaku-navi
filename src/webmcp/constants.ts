/** WebMCPの公開契約とツール入力で共有する制限値 */

/** 破壊的な操作の確認トークンを有効にする時間（ms） */
export const WEB_MCP_CONFIRMATION_TTL_MS = 5 * 60 * 1000
/** ページングで省略されたときに使う件数 */
export const WEB_MCP_DEFAULT_PAGE_LIMIT = 25
/** ページングで許可する最大件数 */
export const WEB_MCP_MAX_PAGE_LIMIT = 100
/** 一覧で指定できる開始位置の最大値 */
export const WEB_MCP_MAX_PAGE_OFFSET = 100_000
/** 検索結果で省略されたときに使う件数 */
export const WEB_MCP_DEFAULT_SEARCH_LIMIT = 8
/** 検索結果で許可する最大件数 */
export const WEB_MCP_MAX_SEARCH_LIMIT = 50
/** 現在状態で指定できるセクション数の上限 */
export const WEB_MCP_MAX_STATE_SECTIONS = 5
/** 点数比較で一度に指定できる条件数の上限 */
export const WEB_MCP_MAX_SCORE_COMPARISON_VARIANTS = 20
/** 最適編成比較で一度に指定できる条件数の上限 */
export const WEB_MCP_MAX_UNIT_COMPARISON_VARIANTS = 5
/** WebMCPで保存できるプリセット名の最大文字数 */
export const WEB_MCP_MAX_PRESET_NAME_LENGTH = 100
/** WebMCPで受け付けるインポートJSONの最大文字数 */
export const WEB_MCP_MAX_IMPORT_JSON_LENGTH = 500_000
