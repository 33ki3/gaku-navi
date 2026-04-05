/**
 * サポート操作コンテキスト
 *
 * CardList と CardListItem で共有するサポート操作（クリック・
 * 凸数変更・スコアクリック）を Context で提供する。
 * App.tsx で CardProvider を使って値を渡し、
 * 子コンポーネントでは useCardContext() で取得する。
 */
/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext } from 'react'
import type { SupportCard } from '../types/card'
import type { UncapType } from '../types/enums'

/** CardContext が提供する値の型 */
export interface CardContextValue {
  /** サポート名から現在の凸数を取得する関数 */
  getCardUncap: (cardName: string) => UncapType
  /** 凸数編集モードがONかどうか */
  uncapEditMode: boolean
  /** 凸数編集モードのON/OFFを切り替える関数 */
  onToggleUncapEdit: () => void
  /** サポートをクリックしたときのハンドラ（詳細モーダルを開く） */
  onCardClick: (card: SupportCard) => void
  /** スコアをクリックしたときのハンドラ（スコア内訳モーダルを開く） */
  onScoreClick: (card: SupportCard, e: React.MouseEvent) => void
  /** サポートの凸数を変更するハンドラ */
  onUncapChange: (cardName: string, uncap: UncapType) => void
  /** 手動編成のサポート一覧選択モード */
  unitCardSelectMode?: boolean
  /** サポート選択モード中にサポートが選択可能かどうか判定する関数 */
  isCardEligible?: (card: SupportCard) => boolean
}

/** Context 本体（初期値 null） */
const CardContext = createContext<CardContextValue | null>(null)

/** Context の Provider（App.tsx で使う） */
export const CardProvider = CardContext.Provider

/**
 * サポート操作コンテキストを取得するフック
 *
 * @returns サポート操作の関数と状態
 * @throws CardProvider の外で使うとエラー
 */
export function useCardContext(): CardContextValue {
  const ctx = useContext(CardContext)
  if (!ctx) throw new Error('useCardContext must be used within CardProvider')
  return ctx
}
