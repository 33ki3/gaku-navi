/**
 * アプリ共通の定数定義。
 *
 * localStorage キー・デフォルト値、エクスポート設定、計算処理用定数など、
 * UI スタイルに該当しない汎用定数をまとめたファイル。
 */

import { UncapType, ScenarioType, DifficultyType } from '../types/enums'

/** デフォルト凸数（4凸）。新しいサポートを表示するときの初期凸数。 */
export const DEFAULT_UNCAP = UncapType.Four

/** サポート個別凸数の保存キー。サポート名→凸数の Map を JSON で保存する。 */
export const UNCAP_STORAGE_KEY = 'gaku-navi-card-uncaps'
/** 点数設定の常時表示フラグの保存キー。サイドパネルをピン留めするかどうか。 */
export const SETTINGS_PINNED_KEY = 'gaku-navi-settings-pinned'
/** フィルター・ソート状態の保存キー。フィルター条件とソート順を JSON で保存する。 */
export const FILTER_STORAGE_KEY = 'gaku-navi-filter-state'
/** 点数設定の保存キー。ScoreSettings オブジェクトを JSON で保存する。 */
export const SCORE_SETTINGS_STORAGE_KEY = 'gaku-navi-score-settings'
/** 点数設定プリセットの保存キー。ScorePreset[] を JSON で保存する。 */
export const SCORE_PRESETS_STORAGE_KEY = 'gaku-navi-score-presets'
/** サポート別回数設定の保存キー。サポート名→アクションID→回数の Map を JSON で保存する。 */
export const CARD_COUNT_CUSTOM_KEY = 'gaku-navi-card-count-custom'
/** フィルタ・ソートモーダルのタブ選択状態の保存キー */
export const FILTER_SORT_TAB_KEY = 'gaku-navi-filter-sort-tab'
/** 最適編成設定の保存キー。UnitSimulatorSettings を JSON で保存する。 */
export const UNIT_SIMULATOR_STORAGE_KEY = 'gaku-navi-unit-builder'
/** 最適編成計算結果の保存キー。UnitResult を JSON で保存する。 */
export const UNIT_RESULT_STORAGE_KEY = 'gaku-navi-unit-result'
/** ユーザー定義サポートの保存キー。SupportCard[] を JSON で保存する。 */
export const USER_SUPPORTS_STORAGE_KEY = 'gaku-navi-user-supports'
/** フィルター保存のデバウンス待機時間（ms）。連続でフィルターが変更されたときに保存回数を減らす。 */
export const FILTER_SAVE_DEBOUNCE_MS = 300

/** エクスポートファイル名プレフィクス。タイムスタンプが後ろに付く（例: "gaku-navi-backup-20240101T120000"）。 */
export const EXPORT_FILE_PREFIX = 'gaku-navi-backup-'
/** エクスポートファイルの拡張子。JSON 形式でダウンロードされる。 */
export const EXPORT_FILE_EXT = '.json'
/** エクスポートデータのMIMEタイプ。ブラウザのダウンロードダイアログで使う。 */
export const EXPORT_MIME_TYPE = 'application/json'
/** エクスポートデータのバージョン。インポート時の互換性チェックに使う。 */
export const EXPORT_VERSION = 1

/** パーセント記号（アビリティ値文字列から数値を抽出する際に取り除く） */
export const PERCENT_SIGN = '%'
/** プラス記号（アビリティ値文字列から数値を抽出する際に取り除く） */
export const PLUS_SIGN = '+'
/** アビリティ名テンプレート内の `{v}` を値に置き換えるための正規表現 */
export const VALUE_PLACEHOLDER_RE = /\{v\}/g
/** スコア設定のデフォルトシナリオ */
export const DEFAULT_SCENARIO = ScenarioType.Hajime
/** スコア設定のデフォルト難易度 */
export const DEFAULT_DIFFICULTY = DifficultyType.Legend

/** インポート成功後のリロード遅延（ms）。ユーザーに「完了」を見せてからリロードする。 */
export const IMPORT_RELOAD_DELAY = 1500

/** マシュマロ（匿名フィードバック）の URL */
export const MARSHMALLOW_URL = import.meta.env.VITE_FEEDBACK_URL
/** GitHub リポジトリの URL */
export const GITHUB_URL = import.meta.env.VITE_GITHUB_URL

/** パーセント→倍率変換の除数。100% → 1.0 に変換するときに使う。 */
export const PERCENT_DIVISOR = 100

/** 最適編成の編成枚数 */
export const UNIT_SIZE = 6
/** アビリティスロット数 */
export const SLOT_COUNT = 6
/** SP制約の上限（UNIT_SIZEと同値だが意味が異なる） */
export const SP_TOTAL_MAX = 6
/** 局所探索の最大イテレーション回数 */
export const MAX_SWAP_ITERATIONS = 10

/** タイプ別編成枚数のデフォルト最小値 */
export const TYPE_COUNT_MIN_DEFAULT = 0
/** タイプ別編成枚数のデフォルト最大値 */
export const TYPE_COUNT_MAX_DEFAULT = 3
