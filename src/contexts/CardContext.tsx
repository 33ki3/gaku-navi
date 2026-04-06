/**
 * サポート操作コンテキスト（データ層 + UI層の2分割）
 *
 * CardList と CardListItem で共有するサポート操作を Context で提供する。
 * 安定したアクション関数（データ層）と変化する UI 状態（UI層）を分離し、
 * 不要な再レンダリングを抑制する。
 *
 * - CardDataContext: getCardUncap, onCardClick, onScoreClick, onUncapChange
 * - CardUIContext: uncapEditMode, onToggleUncapEdit, unitCardSelectMode, isCardEligible
 *
 * App.tsx で両方の Provider を使って値を渡し、
 * 子コンポーネントでは useCardDataContext() / useCardUIContext() で取得する。
 */
/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext } from 'react'
import type { SupportCard } from '../types/card'
import type { UncapType } from '../types/enums'

/** CardDataContext が提供する値の型（安定したアクション関数） */
export interface CardDataContextValue {
  /** サポート名から現在の凸数を取得する関数 */
  getCardUncap: (cardName: string) => UncapType
  /** サポートをクリックしたときのハンドラ（詳細モーダルを開く） */
  onCardClick: (card: SupportCard) => void
  /** スコアをクリックしたときのハンドラ（スコア内訳モーダルを開く） */
  onScoreClick: (card: SupportCard, e: React.MouseEvent) => void
  /** サポートの凸数を変更するハンドラ */
  onUncapChange: (cardName: string, uncap: UncapType) => void
}

/** CardUIContext が提供する値の型（変化する UI 状態） */
export interface CardUIContextValue {
  /** 凸数編集モードがONかどうか */
  uncapEditMode: boolean
  /** 凸数編集モードのON/OFFを切り替える関数 */
  onToggleUncapEdit: () => void
  /** 手動編成のサポート一覧選択モード */
  unitCardSelectMode?: boolean
  /** サポート選択モード中にサポートが選択可能かどうか判定する関数 */
  isCardEligible?: (card: SupportCard) => boolean
}

/** データ層 Context 本体（初期値 null） */
const CardDataContext = createContext<CardDataContextValue | null>(null)

/** UI層 Context 本体（初期値 null） */
const CardUIContext = createContext<CardUIContextValue | null>(null)

/** データ層 Context の Provider（App.tsx で使う） */
export const CardDataProvider = CardDataContext.Provider

/** UI層 Context の Provider（App.tsx で使う） */
export const CardUIProvider = CardUIContext.Provider

/**
 * サポートデータ操作コンテキストを取得するフック
 *
 * @returns サポートデータ操作の関数
 * @throws CardDataProvider の外で使うとエラー
 */
export function useCardDataContext(): CardDataContextValue {
  const ctx = useContext(CardDataContext)
  if (!ctx) throw new Error('useCardDataContext must be used within CardDataProvider')
  return ctx
}

/**
 * サポート UI 状態コンテキストを取得するフック
 *
 * @returns サポート UI の状態と操作関数
 * @throws CardUIProvider の外で使うとエラー
 */
export function useCardUIContext(): CardUIContextValue {
  const ctx = useContext(CardUIContext)
  if (!ctx) throw new Error('useCardUIContext must be used within CardUIProvider')
  return ctx
}
