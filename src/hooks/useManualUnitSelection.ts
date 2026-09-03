/**
 * 最適編成パネルとサポート一覧をつなぐ手動選択フック。
 *
 * 選択対象スロット、一覧からのカード追加、選択可能カードの判定を
 * 1か所で管理し、パネル本体から複雑な分岐を分離する
 */
import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import * as constant from '../constant'
import type { SupportCard } from '../types/card'
import * as enums from '../types/enums'
import type { UnitSimulatorSettings } from '../types/unit'

interface UseManualUnitSelectionParams {
  /** 現在の最適編成設定 */
  settings: UnitSimulatorSettings
  /** 最適編成設定を更新する関数 */
  setSettings: (settings: UnitSimulatorSettings) => void
  /** 一覧からカードを追加する関数の登録先 */
  registerAddManualCard: (handler: ((cardName: string) => void) | null) => void
  /** 一覧でカードを選択できるか判定する関数の登録先 */
  registerIsCardEligible: (handler: ((card: SupportCard) => boolean) | null) => void
  /** サポート一覧で選択中か */
  isUnitCardSelectMode: boolean
  /** サポート一覧の選択状態を切り替える関数 */
  setUnitCardSelectMode: (enabled: boolean) => void
  /** サポートごとの凸数 */
  cardUncaps: Record<string, enums.UncapType>
  /** 未所持判定を無効にする固定凸モードか */
  useFixedUncap: boolean
  /** スマホで選択開始時にパネルを閉じる関数 */
  onClosePanel: () => void
  /** 6枠すべて選択されたときに呼び出す関数 */
  onSelectionComplete?: () => void
}

interface UseManualUnitSelectionReturn {
  /** 指定したスロットへのカード選択を開始する */
  startSlotSelection: (slotIndex: number) => void
  /** 選択対象スロットを解除する */
  clearTargetSlot: () => void
}

/**
 * サポート一覧を使った手動編成の連携処理を提供する
 *
 * @param params - 最適編成設定、一覧連携関数、選択状態
 * @returns スロット選択開始と選択解除の操作
 */
export function useManualUnitSelection({
  settings,
  setSettings,
  registerAddManualCard,
  registerIsCardEligible,
  isUnitCardSelectMode,
  setUnitCardSelectMode,
  cardUncaps,
  useFixedUncap,
  onClosePanel,
  onSelectionComplete,
}: UseManualUnitSelectionParams): UseManualUnitSelectionReturn {
  const settingsRef = useRef(settings)
  const setSettingsRef = useRef(setSettings)
  const cardUncapsRef = useRef(cardUncaps)
  const onSelectionCompleteRef = useRef(onSelectionComplete)
  const targetSlotIndexRef = useRef<number | null>(null)
  const [targetSlotIndex, setTargetSlotIndex] = useState<number | null>(null)

  /**
   * コールバック登録先から常に最新状態を参照できるようrefへ同期する。
   *
   * パネルの再マウント直後に一覧クリックが先に処理される可能性があるため、通常のeffectではなくレイアウト確定時に同期する。
   */
  useLayoutEffect(() => {
    // パネルの開閉をまたぐクリックでも、一覧側から最新設定を参照できるようにする
    settingsRef.current = settings
  }, [settings])
  useLayoutEffect(() => {
    // 親から渡されたsetterも、登録済みコールバックから最新のものを参照する
    setSettingsRef.current = setSettings
  }, [setSettings])
  useLayoutEffect(() => {
    // 凸数変更を選択可否判定へ即時反映する
    cardUncapsRef.current = cardUncaps
  }, [cardUncaps])
  useLayoutEffect(() => {
    // 6枠が埋まった後に呼ぶ処理を、再登録せず最新値へ更新する
    onSelectionCompleteRef.current = onSelectionComplete
  }, [onSelectionComplete])

  /** 選択対象スロットをrefとstateの両方から解除する */
  const clearTargetSlot = useCallback(() => {
    // refとstateの両方を消して、次のカードを空き枠へ入れる
    targetSlotIndexRef.current = null
    setTargetSlotIndex(null)
  }, [])

  /**
   * サポート一覧から受け取ったカードを、対象スロットまたは最初の空きへ入れる。
   *
   * この登録もレイアウト確定時に行い、パネルの表示切り替え直後の最初のクリックを取りこぼさない。
   * 完了時コールバックはref経由で参照し、画面の開閉だけで登録を解除・再登録しない
   */
  useLayoutEffect(() => {
    const addCard = (cardName: string) => {
      // 同じカードの重複と6枚超過を先に拒否する
      const currentSettings = settingsRef.current
      const filledCount = currentSettings.manualCards.filter((name) => name !== null).length
      if (filledCount >= constant.UNIT_SIZE || currentSettings.manualCards.includes(cardName)) return

      const nextCards = [...currentSettings.manualCards]
      while (nextCards.length < constant.UNIT_SIZE) nextCards.push(null)

      const targetIndex = targetSlotIndexRef.current
      // 指定枠が空いていればそこへ、そうでなければ先頭の空き枠へ入れる
      const insertIndex =
        targetIndex !== null && nextCards[targetIndex] === null ? targetIndex : nextCards.indexOf(null)
      if (insertIndex < 0) return
      nextCards[insertIndex] = cardName
      clearTargetSlot()

      const rentalName = nextCards[constant.UNIT_SIZE - 1] ?? currentSettings.rentalCardName
      // 最後の枠をレンタル枠として扱い、手動設定と表示を一致させる
      setSettingsRef.current({
        ...currentSettings,
        manualCards: nextCards,
        rentalCardName: rentalName,
      })

      const completed = nextCards.filter((name) => name !== null).length >= constant.UNIT_SIZE
      if (completed) {
        setUnitCardSelectMode(false)
        onSelectionCompleteRef.current?.()
      }
    }

    registerAddManualCard(addCard)
    return () => registerAddManualCard(null)
  }, [clearTargetSlot, registerAddManualCard, setUnitCardSelectMode])

  /** 現在の設定と対象スロットから、一覧上で選択可能なカードを判定する */
  useLayoutEffect(() => {
    const isEligible = (card: SupportCard) => {
      // プラン・重複・凸数の条件を一覧側のクリック前に判定する
      const currentSettings = settingsRef.current
      if (card.plan !== enums.PlanType.Free && card.plan !== currentSettings.plan) return false
      if (currentSettings.manualCards.includes(card.name)) return false

      const nextCards = [...currentSettings.manualCards]
      while (nextCards.length < constant.UNIT_SIZE) nextCards.push(null)
      const effectiveTargetIndex = targetSlotIndexRef.current ?? nextCards.indexOf(null)
      const isRentalSlot = effectiveTargetIndex === constant.UNIT_SIZE - 1

      return isRentalSlot || useFixedUncap || cardUncapsRef.current[card.name] !== enums.UncapType.NotOwned
    }

    registerIsCardEligible(isEligible)
    return () => registerIsCardEligible(null)
  }, [registerIsCardEligible, settings.manualCards, settings.plan, targetSlotIndex, useFixedUncap])

  /** 指定したスロットを選択対象にして、スマホでは一覧へ戻る */
  const startSlotSelection = useCallback(
    (slotIndex: number) => {
      // 選択対象を保存してから一覧選択モードへ切り替える
      targetSlotIndexRef.current = slotIndex
      setTargetSlotIndex(slotIndex)
      if (isUnitCardSelectMode) return

      setUnitCardSelectMode(true)
      if (!window.matchMedia(constant.DESKTOP_MEDIA_QUERY).matches) onClosePanel()
    },
    [onClosePanel, setUnitCardSelectMode, isUnitCardSelectMode],
  )

  return { startSlotSelection, clearTargetSlot }
}
