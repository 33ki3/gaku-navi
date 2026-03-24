/**
 * カード操作コンテキスト
 *
 * CardList と CardListItem で共有するカード操作（クリック・
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
  /** カード名から現在の凸数を取得する関数 */
  getCardUncap: (cardName: string) => UncapType
  /** 凸数編集モードがONかどうか */
  uncapEditMode: boolean
  /** 凸数編集モードのON/OFFを切り替える関数 */
  onToggleUncapEdit: () => void
  /** カードをクリックしたときのハンドラ（詳細モーダルを開く） */
  onCardClick: (card: SupportCard) => void
  /** スコアをクリックしたときのハンドラ（スコア内訳モーダルを開く） */
  onScoreClick: (card: SupportCard, e: React.MouseEvent) => void
  /** カードの凸数を変更するハンドラ */
  onUncapChange: (cardName: string, uncap: UncapType) => void
}

/** Context 本体（初期値 null） */
const CardContext = createContext<CardContextValue | null>(null)

/** Context の Provider（App.tsx で使う） */
export const CardProvider = CardContext.Provider

/**
 * カード操作コンテキストを取得するフック
 *
 * @returns カード操作の関数と状態
 * @throws CardProvider の外で使うとエラー
 */
export function useCardContext(): CardContextValue {
  const ctx = useContext(CardContext)
  if (!ctx) throw new Error('useCardContext must be used within CardProvider')
  return ctx
}
