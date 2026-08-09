/**
 * 最適編成パネルとサポート一覧の選択操作を接続する。
 *
 * パネルが一時的に閉じるスマホでも選択を取りこぼさないよう、登録前のサポート名と最新の選択状態をrefで保持する。
 */
import { type MouseEvent, useCallback, useLayoutEffect, useRef, useState } from 'react'
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
  /** 選択モードを考慮したサポートクリック処理 */
  onCardClick: (card: SupportCard) => void
  /** 選択モードを考慮した点数クリック処理 */
  onScoreClick: (card: SupportCard, event: MouseEvent) => void
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
  /** 通常時にサポート詳細を開く処理 */
  openCardDetail: (card: SupportCard) => void
  /** 通常時に点数詳細を開く処理 */
  openScoreDetail: (card: SupportCard, event: MouseEvent) => void
  /** スマホ表示かを判定する */
  isMobileViewport: () => boolean
  /** 選択完了後に最適編成パネルを開く */
  openUnitSimulator: () => void
  /** 選択完了後にスマホ下部ナビの表示を再同期する */
  requestMobileNavigationShow?: () => void
}

/**
 * サポート一覧のクリックを、通常表示または編成選択へ振り分ける
 *
 * @param params - 選択状態、通常時のクリック処理、パネル表示操作
 * @returns 最適編成パネルとの接続に必要な状態と操作
 */
export function useUnitCardSelectionBridge({
  selectionMode,
  setSelectionMode: setSelectionModeState,
  openCardDetail,
  openScoreDetail,
  isMobileViewport,
  openUnitSimulator,
  requestMobileNavigationShow,
}: UseUnitCardSelectionBridgeParams): UnitCardSelectionBridge {
  const addManualCardRef = useRef<((cardName: string) => void) | null>(null)
  const pendingManualCardRef = useRef<string | null>(null)
  const isCardEligibleRef = useRef<((card: SupportCard) => boolean) | null>(null)
  const selectionModeRef = useRef(selectionMode)
  const [eligibilityVersion, setEligibilityVersion] = useState(0)

  // クリックイベントがstate反映直後の通常effectより先に届いても選択を取りこぼさない
  useLayoutEffect(() => {
    selectionModeRef.current = selectionMode
  }, [selectionMode])

  const registerAddManualCard = useCallback((handler: ((cardName: string) => void) | null) => {
    // パネルが閉じている間にクリックされたカードは、登録完了後に1回だけ処理する
    addManualCardRef.current = handler
    if (handler === null || pendingManualCardRef.current === null) return

    const pendingCardName = pendingManualCardRef.current
    pendingManualCardRef.current = null
    handler(pendingCardName)
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
      if (!enabled) pendingManualCardRef.current = null
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

  const onCardClick = useCallback(
    (card: SupportCard) => {
      // 選択モード外は詳細表示、選択モード中は編成追加として扱う
      if (!selectionModeRef.current) {
        openCardDetail(card)
        return
      }
      if (addManualCardRef.current) {
        addManualCardRef.current(card.name)
        return
      }
      pendingManualCardRef.current = card.name
    },
    [openCardDetail],
  )

  const onScoreClick = useCallback(
    (card: SupportCard, event: MouseEvent) => {
      // 選択モード中にスコア行を押しても、詳細モーダルを開かない
      if (!selectionModeRef.current) openScoreDetail(card, event)
    },
    [openScoreDetail],
  )

  const isCardEligible = useCallback((card: SupportCard) => {
    return isCardEligibleRef.current?.(card) ?? true
  }, [])

  return {
    registerAddManualCard,
    registerIsCardEligible,
    setSelectionMode,
    finishSelection,
    handleSelectionComplete,
    onCardClick,
    onScoreClick,
    isCardEligible,
    eligibilityVersion,
  }
}
