/**
 * アプリ全体で共有する保存キー・既定値・計算用の固定値
 *
 * ブラウザの保存キー・既定値、エクスポート設定、計算処理用の固定値など、
 * 画面スタイルに該当しない汎用的な値をまとめたファイル
 */

import { DifficultyType, ScenarioType, UncapType } from '../types/enums'

/** 既定の凸数（4凸）。新しいサポートを表示するときの初期値 */
export const DEFAULT_UNCAP = UncapType.Four

/** サポートごとの凸数を保存するキー。サポート名と凸数の対応表をJSONで保存する */
export const UNCAP_STORAGE_KEY = 'gaku-navi-card-uncaps'
/** 点数設定の常時表示フラグの保存キー。サイドパネルをピン留めするかどうか */
export const SETTINGS_PINNED_KEY = 'gaku-navi-settings-pinned'
/** フィルター・ソート状態の保存キー。条件と並び順をJSONで保存する */
export const FILTER_STORAGE_KEY = 'gaku-navi-filter-state'
/** 点数設定を保存するキー。設定内容をJSONで保存する */
export const SCORE_SETTINGS_STORAGE_KEY = 'gaku-navi-score-settings'
/**
 * シナリオ別スケジュール選択を保存するキー
 *
 * Hajime以外のスケジュールも含め、シナリオ名・週番号・活動IDの対応表をJSONで保存する
 */
export const SCHEDULE_SELECTIONS_STORAGE_KEY = 'gaku-navi-schedule-selections'
/** 点数設定プリセット一覧を保存するキー。設定名と内容をJSONで保存する */
export const SCORE_PRESETS_STORAGE_KEY = 'gaku-navi-score-presets'
/**
 * サポート別回数設定を保存するキー
 *
 * サポート名・アクション・回数の対応表をJSONで保存する
 */
export const CARD_COUNT_CUSTOM_KEY = 'gaku-navi-card-count-custom'
/** フィルタ・ソートモーダルのタブ選択状態の保存キー */
export const FILTER_SORT_TAB_KEY = 'gaku-navi-filter-sort-tab'
/** 最適編成設定を保存するキー。編成条件をJSONで保存する */
export const UNIT_SIMULATOR_STORAGE_KEY = 'gaku-navi-unit-builder'
/** 最適編成の最新結果を保存するキー。選出カードと計算結果をJSONで保存する */
export const UNIT_RESULT_STORAGE_KEY = 'gaku-navi-unit-result'
/** ユーザーが追加したサポート一覧を保存するキー。カード情報をJSONで保存する */
export const USER_SUPPORTS_STORAGE_KEY = 'gaku-navi-user-supports'
/** ユーザー定義サポート名の最大文字数 */
export const USER_SUPPORT_NAME_MAX_LENGTH = 200
/** アプリ全体の表示設定の保存キー */
export const APP_PREFERENCES_STORAGE_KEY = 'gaku-navi-app-preferences'
/** ブラウザの保存領域が変更されたことを知らせるイベント名 */
export const STORAGE_EVENT_NAME = 'storage'
/** AbortSignalへ中断listenerを登録・解除するイベント名 */
export const ABORT_EVENT_NAME = 'abort'
/** Promise.allSettledで失敗した処理を示すstatus */
export const PROMISE_REJECTED_STATUS = 'rejected'
/** 保存済みのフィルター全体を画面へ一括反映するreducer action */
export const SET_ALL_FILTERS = 'set_all_filters' as const
/**
 * 連続操作の後に保存するまでの待機時間（ms）
 *
 * 連続でフィルターが変更されたときに保存回数を減らす
 */
export const FILTER_SAVE_DEBOUNCE_MS = 300
/** 保存後に画面の表示が新しい値へ追いつくのを待つ既定の上限 */
export const STATE_SYNC_TIMEOUT_MS = 500

/** PCレイアウトへ切り替わるメディアクエリ */
export const DESKTOP_MEDIA_QUERY = '(min-width: 768px)'
/** スマホレイアウトに限定するメディアクエリ */
export const MOBILE_MEDIA_QUERY = '(max-width: 767px)'
/** 下部メニューを隠し始めるページ上端からの距離（px） */
export const MOBILE_NAV_HIDE_SCROLL_TOP = 80
/** 下部メニューを必ず表示するページ上端付近の距離（px） */
export const MOBILE_NAV_VISIBLE_SCROLL_TOP = 24
/** 下部メニューの表示を切り替える最小スクロール差分（px） */
export const MOBILE_NAV_SCROLL_DELTA = 6
/** 件数バッジにそのまま表示する最大値 */
export const COUNT_BADGE_MAX = 99

/** 点数設定パネルのスクロール位置保存キー */
export const SCORE_SETTINGS_PANEL_SCROLL_KEY = 'score-settings-panel'
/** 最適編成パネルのスクロール位置保存キー */
export const UNIT_SIMULATOR_PANEL_SCROLL_KEY = 'unit-simulator-panel'

/**
 * エクスポートファイル名の先頭部分
 *
 * 後ろにタイムスタンプが付く（例: "gaku-navi-backup-20240101T120000"）
 */
export const EXPORT_FILE_PREFIX = 'gaku-navi-backup-'
/** エクスポート日時を表示するタイムゾーン（日本標準時） */
export const EXPORT_TIME_ZONE = 'Asia/Tokyo'
/** エクスポート日時へ付ける日本標準時のUTCオフセット */
export const EXPORT_TIME_ZONE_OFFSET = '+09:00'
/** エクスポートファイルの拡張子。JSON 形式でダウンロードされる */
export const EXPORT_FILE_EXT = '.json'
/** エクスポートデータのMIMEタイプ。ブラウザのダウンロードダイアログで使う */
export const EXPORT_MIME_TYPE = 'application/json'
/** エクスポートデータのバージョン。インポート時の互換性チェックに使う */
export const EXPORT_VERSION = 2
/** インポートで受け付ける最小のエクスポートデータバージョン */
export const MIN_SUPPORTED_EXPORT_VERSION = 1

/** パーセント記号（アビリティ値文字列から数値を抽出する際に取り除く） */
export const PERCENT_SIGN = '%'
/** プラス記号（アビリティ値文字列から数値を抽出する際に取り除く） */
export const PLUS_SIGN = '+'
/** スコア設定の既定シナリオ */
export const DEFAULT_SCENARIO = ScenarioType.Hajime
/** スコア設定の既定難易度 */
export const DEFAULT_DIFFICULTY = DifficultyType.Legend

/** マシュマロ（匿名フィードバック）の URL */
export const MARSHMALLOW_URL = import.meta.env.VITE_FEEDBACK_URL
/** GitHub リポジトリの URL */
export const GITHUB_URL = import.meta.env.VITE_GITHUB_URL
/** X（旧Twitter）のアカウント URL */
export const X_URL = import.meta.env.VITE_X_URL

/** パーセント→倍率変換の除数。100% → 1.0 に変換するときに使う */
export const PERCENT_DIVISOR = 100

/** 最適編成の編成枚数 */
export const UNIT_SIZE = 6
/** アビリティスロット数 */
export const SLOT_COUNT = 6
/** 点数設定・カード別回数調整で許可する1アクションあたりの最大回数 */
export const ACTION_COUNT_MAX = 999
/** 1編成で指定できるSP条件の合計上限 */
export const SP_TOTAL_MAX = 6
/** 総当たり最適化の候補枚数の既定値 */
export const EXHAUSTIVE_CANDIDATE_LIMIT = 30
/** 候補プール内で保護するPアイテム行動提供元の最大枚数（最終編成枚数の2倍） */
export const P_ITEM_ACTION_PROVIDER_LIMIT = UNIT_SIZE * 2
/** 総当たり進捗の目標更新回数（画面更新頻度の目安） */
export const EXHAUSTIVE_PROGRESS_TARGET_UPDATES = 200
/** 総当たり進捗バッチサイズの下限（小規模探索でも中間進捗を通知する） */
export const EXHAUSTIVE_PROGRESS_MIN_BATCH_SIZE = 1
/** 総当たり進捗バッチサイズの上限（更新遅延防止） */
export const EXHAUSTIVE_PROGRESS_MAX_BATCH_SIZE = 20000
/** SP条件の組み合わせ数を計算するときに保持する状態の上限 */
export const SP_TYPE_STATES_CACHE_MAX = 300
/** SP条件とタイプ条件の組み合わせ数を計算するときに保持する結果の上限 */
export const SP_TYPE_COUNT_CACHE_MAX = 500

/** タイプ別編成枚数の既定最小値 */
export const TYPE_COUNT_MIN_DEFAULT = 0
/** タイプ別編成枚数の既定最大値 */
export const TYPE_COUNT_MAX_DEFAULT = 4

/**
 * 初期パラメータ入力で許可する最大値
 *
 * 極端な入力による計算負荷を抑えるために設ける
 */
export const INITIAL_PARAMETER_MAX = 9999
/** 最適編成のパラメータボーナス入力で許可する最大値（%） */
export const PARAMETER_BONUS_PERCENT_MAX = 200
/** 最適編成のパラメータボーナス入力単位（%） */
export const PARAMETER_BONUS_PERCENT_STEP = 0.1
/** 最適編成のパラメータ上限入力で許可する最小値 */
export const PARAM_CAP_MIN = 0
/** 最適編成の候補枚数入力で許可する最小値 */
export const CANDIDATE_LIMIT_MIN = 10
/** 最適編成の候補枚数入力で許可する最大値 */
export const CANDIDATE_LIMIT_MAX = 100
