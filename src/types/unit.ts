/**
 * 最適編成関連の型定義
 *
 * 最適編成計算で使用する設定・結果の型を定義する。
 */
import type { PlanType, CardType, ParameterType, UncapType, ActionIdType } from './enums'
import type { SupportCard, CardCalculationResult } from './card'

/** SP発生率の枚数設定（Vo/Da/Vi それぞれの必要枚数） */
export interface SpRateConstraint {
  /** ボーカルSP発生率の必要枚数 */
  vocal: number
  /** ダンスSP発生率の必要枚数 */
  dance: number
  /** ビジュアルSP発生率の必要枚数 */
  visual: number
}

/** パラメータ値（Vo/Da/Vi の3軸） */
export interface ParameterValues {
  vocal: number
  dance: number
  visual: number
}

/** タイプ別編成枚数（Vo/Da/Vi ごとの枚数） */
export type TypeCountValues = Record<ParameterType, number>

/** 最適編成の編成設定 */
export interface UnitSimulatorSettings {
  /** 育成プラン */
  plan: PlanType
  /** サポートタイプ制限（選択されたタイプのみ候補にする） */
  allowedTypes: CardType[]
  /** SP発生率の枚数制約 */
  spConstraint: SpRateConstraint
  /** タイプ別最小編成枚数 */
  typeCountMin: TypeCountValues
  /** タイプ別最大編成枚数 */
  typeCountMax: TypeCountValues
  /** パラメータボーナス%（プロデュース開始画面の値） */
  paramBonusPercent: ParameterValues
  /** レンタル枠を手動指定するか */
  manualRental: boolean
  /** 手動指定されたレンタルサポート名（null = 自動選出） */
  rentalCardName: string | null
  /** 固定サポート名リスト（自動最適化から除外） */
  lockedCards: string[]
  /** 手動選択されたサポート名リスト（手動モード用・null はスロット空き） */
  manualCards: (string | null)[]
  /** 初期パラメータ（プロデュース開始時のアイドルステータス） */
  initialParams: ParameterValues
}

/** アビリティごとのサポート間連携追加回数 */
export interface SupportSynergyDetail {
  /** trigger_key → 追加回数 */
  [triggerKey: string]: number
}

/** サポート間連携の提供元詳細（どのサポートが何を何回提供しているか） */
export interface SynergyProviderDetail {
  /** 提供元サポート名 */
  providerName: string
  /** アクションID */
  actionId: ActionIdType
  /** 追加回数 */
  count: number
}

/** ユニット内の1枚のサポート情報 */
export interface UnitMember {
  /** サポート */
  card: SupportCard
  /** 凸数 */
  uncap: UncapType
  /** このサポートがレンタル枠かどうか */
  isRental: boolean
  /** 計算結果 */
  result: CardCalculationResult
  /** サポート間連携による追加スコア */
  supportSynergy: number
  /** アビリティのtrigger_keyごとのサポート間連携追加回数 */
  supportSynergyDetail: SupportSynergyDetail
  /** サポート間連携の提供元詳細 */
  synergyProviders: SynergyProviderDetail[]
  /** このサポートのパラメータボーナス%（Vo/Da/Vi 別） */
  paramBonusPercent: ParameterValues
}

/** ユニット計算結果 */
export interface UnitResult {
  /** ユニットメンバー6枚 */
  members: UnitMember[]
  /** 合計スコア */
  totalScore: number
  /** パラメータボーナスの合計%（サポート + サポート外） */
  totalParamBonusPercent: ParameterValues
  /** パラメータボーナスの計算結果 */
  parameterBonus: ParameterValues
  /** パラメータボーナスの基礎値（VoDaVi） */
  parameterBonusBase: ParameterValues
  /** サポート外パラメータボーナス%（ユーザー入力値） */
  outsideParamBonusPercent: ParameterValues
}
