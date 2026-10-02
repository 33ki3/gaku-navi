/**
 * 最適編成パネルとサポート一覧をつなぐ手動選択フック
 *
 * 選択対象スロット、一覧からのカード追加、選択可能カードの判定を
 * 1か所で管理し、パネル本体から複雑な分岐を分離する
 */
import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import * as constant from '../constant'
import type { SupportCard } from '../types/card'
import * as enums from '../types/enums'
import type { UnitSimulatorSettings } from '../types/unit'
import { getUnitSlotCards } from '../utils/unitCardSelection'

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

  // 描画前に最新の編成設定をrefへ同期する
  useLayoutEffect(() => {
    // パネルの開閉をまたぐクリックでも、一覧側から最新設定を参照できるようにする
    settingsRef.current = settings
  }, [settings])
  // 描画前に最新の設定更新関数をrefへ同期する
  useLayoutEffect(() => {
    // 親から渡された更新処理も、登録済みの処理から最新のものを参照する
    setSettingsRef.current = setSettings
  }, [setSettings])
  // 描画前に最新の凸数を選択可否判定用refへ同期する
  useLayoutEffect(() => {
    // 凸数変更を選択可否判定へ即時反映する
    cardUncapsRef.current = cardUncaps
  }, [cardUncaps])
  // 描画前に完了通知の最新関数をrefへ同期する
  useLayoutEffect(() => {
    // 6枠が埋まった後に呼ぶ処理を、再登録せず最新値へ更新する
    onSelectionCompleteRef.current = onSelectionComplete
  }, [onSelectionComplete])

  /** 選択対象のスロットを解除する */
  const clearTargetSlot = useCallback(() => {
    // 次のカードを空き枠へ入れられるよう、選択対象を消す
    targetSlotIndexRef.current = null
    setTargetSlotIndex(null)
  }, [])

  /**
   * サポート一覧から受け取ったカードを、対象スロットまたは最初の空きへ入れる
   *
   * パネルの表示切替直後のクリックを取りこぼさないよう、
   * 画面の配置が確定したタイミングで一覧側の登録先を更新する
   * 6枠が埋まった後の処理は最新のものを使い、画面の開閉だけで登録し直さない
   */
  useLayoutEffect(() => {
    const addCard = (cardName: string) => {
      // 同じカードの重複と6枚超過を先に拒否する
      const currentSettings = settingsRef.current
      const filledCount = currentSettings.selectedCards.filter((name) => name !== null).length
      if (filledCount >= constant.UNIT_SIZE || currentSettings.selectedCards.includes(cardName)) return

      const nextCards = getUnitSlotCards(currentSettings)

      const targetIndex = targetSlotIndexRef.current
      // 指定枠が空いていればそこへ、そうでなければ先頭の空き枠へ入れる
      const insertIndex =
        targetIndex !== null && nextCards[targetIndex] === null ? targetIndex : nextCards.indexOf(null)
      if (insertIndex < 0) return
      nextCards[insertIndex] = cardName
      clearTargetSlot()

      const rentalName = insertIndex === constant.UNIT_SIZE - 1 ? cardName : currentSettings.rentalCardName
      // 選択枠の位置と空き枠を保持し、6枠目への選択だけレンタル名も更新する
      setSettingsRef.current({
        ...currentSettings,
        selectedCards: nextCards,
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

  // 一覧で選択可能なカードを判定する処理を登録する
  useLayoutEffect(() => {
    const isEligible = (card: SupportCard) => {
      // プラン・重複・凸数の条件を一覧側のクリック前に判定する
      const currentSettings = settingsRef.current
      if (card.plan !== enums.PlanType.Free && card.plan !== currentSettings.plan) return false
      if (currentSettings.selectedCards.includes(card.name)) return false

      const nextCards = getUnitSlotCards(currentSettings)
      const effectiveTargetIndex = targetSlotIndexRef.current ?? nextCards.indexOf(null)
      const isRentalSlot = effectiveTargetIndex === constant.UNIT_SIZE - 1

      return isRentalSlot || useFixedUncap || cardUncapsRef.current[card.name] !== enums.UncapType.NotOwned
    }

    registerIsCardEligible(isEligible)
    return () => registerIsCardEligible(null)
  }, [registerIsCardEligible, settings.selectedCards, settings.plan, targetSlotIndex, useFixedUncap])

  // 指定したスロットを選択対象にして、スマホでは一覧へ戻る
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
