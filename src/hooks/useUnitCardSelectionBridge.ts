/**
 * 最適編成パネルとサポート一覧の選択操作を接続する。
 *
 * パネル側の追加処理と最新の選択状態をrefで保持し、一覧から同期的に呼び出せるようにする。
 */
import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import type { SupportCard } from '../types/card'

/** サポート一覧と最適編成パネルを接続する状態と操作 */
export interface UnitCardSelectionBridge {
  /** パネル側のカード追加処理を登録する */
  registerAddManualCard: (handler: ((cardName: string) => void) | null) => void
  /** パネル側の選択可否判定を登録する */
  registerIsCardEligible: (handler: ((card: SupportCard) => boolean) | null) => void
  /** 選択モードを同期的に切り替える */
  setSelectionMode: (enabled: boolean) => void
  /** 一覧上部の完了操作で選択を終了する */
  finishSelection: () => void
  /** パネル側で全枠の選択が完了した後の処理 */
  handleSelectionComplete: () => void
  /** 手動編成中のサポートクリック処理 */
  handleManualCardClick: (card: SupportCard) => void
  /** 現在の編成設定でサポートを選べるか判定する */
  isCardEligible: (card: SupportCard) => boolean
  /** 選択可否判定の更新を一覧へ伝える番号 */
  eligibilityVersion: number
}

interface UseUnitCardSelectionBridgeParams {
  /** 現在サポート一覧から選択中か */
  selectionMode: boolean
  /** アプリの選択モード状態を変更する */
  setSelectionMode: (enabled: boolean) => void
  /** スマホ表示かを判定する */
  isMobileViewport: () => boolean
  /** 選択完了後に最適編成パネルを開く */
  openUnitSimulator: () => void
  /** 選択完了後にスマホ下部ナビの表示を再同期する */
  requestMobileNavigationShow?: () => void
}

/**
 * サポート一覧と手動編成の選択操作を接続する
 *
 * @param params - 選択状態とパネル表示操作
 * @returns 最適編成パネルとの接続に必要な状態と操作
 */
export function useUnitCardSelectionBridge({
  selectionMode,
  setSelectionMode: setSelectionModeState,
  isMobileViewport,
  openUnitSimulator,
  requestMobileNavigationShow,
}: UseUnitCardSelectionBridgeParams): UnitCardSelectionBridge {
  const addManualCardRef = useRef<((cardName: string) => void) | null>(null)
  const isCardEligibleRef = useRef<((card: SupportCard) => boolean) | null>(null)
  const selectionModeRef = useRef(selectionMode)
  const [eligibilityVersion, setEligibilityVersion] = useState(0)

  // クリックイベントがstate反映直後の通常effectより先に届いても選択を取りこぼさない
  useLayoutEffect(() => {
    selectionModeRef.current = selectionMode
  }, [selectionMode])

  const registerAddManualCard = useCallback((handler: ((cardName: string) => void) | null) => {
    addManualCardRef.current = handler
  }, [])

  const registerIsCardEligible = useCallback((handler: ((card: SupportCard) => boolean) | null) => {
    // 判定関数の差し替えを一覧へ通知して、クリック可否の表示を更新する
    isCardEligibleRef.current = handler
    if (handler !== null) setEligibilityVersion((version) => version + 1)
  }, [])

  const setSelectionMode = useCallback(
    (enabled: boolean) => {
      // refを先に更新し、同じイベントループ内の一覧クリックにも新しい状態を使う
      selectionModeRef.current = enabled
      setSelectionModeState(enabled)
    },
    [setSelectionModeState],
  )

  const handleSelectionComplete = useCallback(() => {
    // スマホで一覧へ戻っていた場合だけ、完了後に最適編成パネルへ戻す
    if (!isMobileViewport()) return
    requestMobileNavigationShow?.()
    openUnitSimulator()
  }, [isMobileViewport, openUnitSimulator, requestMobileNavigationShow])

  const finishSelection = useCallback(() => {
    setSelectionMode(false)
    handleSelectionComplete()
  }, [handleSelectionComplete, setSelectionMode])

  const handleManualCardClick = useCallback((card: SupportCard) => {
    // 手動選択中だけ、カード一覧から受け取ったカードを編成へ追加する
    if (!selectionModeRef.current) return
    addManualCardRef.current?.(card.name)
  }, [])

  const isCardEligible = useCallback((card: SupportCard) => {
    return isCardEligibleRef.current?.(card) ?? true
  }, [])

  return {
    registerAddManualCard,
    registerIsCardEligible,
    setSelectionMode,
    finishSelection,
    handleSelectionComplete,
    handleManualCardClick,
    isCardEligible,
    eligibilityVersion,
  }
}
