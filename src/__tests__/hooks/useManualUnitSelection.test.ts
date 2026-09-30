/**
 * 最適編成のスロット選択とサポート一覧のクリック連携を検証する
 */
import { act, renderHook } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import * as constant from '../../constant'
import * as data from '../../data'
import { useManualUnitSelection } from '../../hooks/useManualUnitSelection'
import { useUnitCardSelectionBridge } from '../../hooks/useUnitCardSelectionBridge'
import type { UnitSimulatorSettings } from '../../types/unit'

/** テストで選択する実在サポート */
const targetCard = data.AllCards[0]

/**
 * 表示幅を切り替え、スマホでは選択開始時に一覧パネルを閉じる動作も
 * 検証できるようにする。
 * matchMediaが指定した表示幅を返すようにする
 *
 * @param desktop - PC幅として扱うか
 */
function stubViewport(desktop: boolean): void {
  // hookが参照するmatchMediaだけを差し替え、PC/スマホの分岐を決める
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      matches: desktop,
      media: '',
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  )
}

/**
 * 手動選択テスト用に、6枠の空スロットを持つ設定を作る。
 * 既定値の配列を直接変更しないよう、入れ子の値もコピーする
 */
function createInitialSettings(): UnitSimulatorSettings {
  // 既定値を直接変更しないよう、配列・入れ子オブジェクトをテスト専用に複製する
  const defaults = constant.DEFAULT_UNIT_SIMULATOR_SETTINGS
  return {
    ...defaults,
    allowedTypes: [...defaults.allowedTypes],
    spConstraint: { ...defaults.spConstraint },
    typeCountMin: { ...defaults.typeCountMin },
    typeCountMax: { ...defaults.typeCountMax },
    paramBonusPercent: { ...defaults.paramBonusPercent },
    lockedCards: [...defaults.lockedCards],
    manualCards: Array.from({ length: constant.UNIT_SIZE }, () => null),
    excludedCardNames: [...defaults.excludedCardNames],
    initialParams: { ...defaults.initialParams },
  }
}

/** テスト中に使うブリッジと手動選択フックの状態 */
interface ManualSelectionHarness {
  bridge: ReturnType<typeof useUnitCardSelectionBridge>
  manualSelection: ReturnType<typeof useManualUnitSelection>
  settings: UnitSimulatorSettings
  unitCardSelectMode: boolean
  panelOpen: boolean
  closePanel: () => void
}

/**
 * ブリッジと手動選択フックを同じ状態で組み合わせる。
 * 実画面の「最適編成パネル ↔ サポート一覧」接続をテストするために使う
 */
function useManualSelectionHarness(onClosePanel: () => void, isMobileViewport = true): ManualSelectionHarness {
  // 実画面と同じく、設定・選択モード・一覧パネルの開閉を同じhook内で保持する
  const [settings, setSettings] = useState(createInitialSettings)
  const [unitCardSelectMode, setUnitCardSelectMode] = useState(false)
  const [panelOpen, setPanelOpen] = useState(true)
  const bridge = useUnitCardSelectionBridge({
    selectionMode: unitCardSelectMode,
    setSelectionMode: setUnitCardSelectMode,
    isMobileViewport: () => isMobileViewport,
    openUnitSimulator: vi.fn(),
  })
  const manualSelection = useManualUnitSelection({
    settings,
    setSettings,
    registerAddManualCard: bridge.registerAddManualCard,
    registerIsCardEligible: bridge.registerIsCardEligible,
    isUnitCardSelectMode: unitCardSelectMode,
    setUnitCardSelectMode: bridge.setSelectionMode,
    cardUncaps: {},
    useFixedUncap: true,
    onClosePanel,
  })

  return { bridge, manualSelection, settings, unitCardSelectMode, panelOpen, closePanel: () => setPanelOpen(false) }
}

/** 各テストで差し替えた表示幅判定を後片付けする */
afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useManualUnitSelection', () => {
  it('スロット選択直後の一覧クリックで指定位置にカードを追加する', () => {
    stubViewport(false)
    const onClosePanel = vi.fn()
    const { result } = renderHook(() => useManualSelectionHarness(onClosePanel))

    // 3番目のスロットを選択してから、一覧のカードクリックを発生させる
    act(() => {
      result.current.manualSelection.startSlotSelection(2)
      result.current.bridge.handleManualCardClick(targetCard)
    })

    // クリックしたカードは指定スロットだけへ入り、選択モードと一覧クローズ通知も維持される
    expect(result.current.settings.manualCards[2]).toBe(targetCard.name)
    expect(result.current.settings.manualCards.filter((name) => name !== null)).toHaveLength(1)
    expect(result.current.unitCardSelectMode).toBe(true)
    expect(onClosePanel).toHaveBeenCalledOnce()
  })

  it('選択モード中に別スロットを選んでも一覧パネルを再度閉じない', () => {
    stubViewport(false)
    const onClosePanel = vi.fn()
    const { result } = renderHook(() => useManualSelectionHarness(onClosePanel))

    // 最初のスロット選択で一覧を閉じた後、別スロットを選び直す
    act(() => result.current.manualSelection.startSlotSelection(0))
    act(() => result.current.manualSelection.startSlotSelection(1))

    // 選択モード中の再選択では、閉じる通知が初回の1回だけである
    expect(onClosePanel).toHaveBeenCalledOnce()
  })

  it('PCで最適編成パネルだけ閉じても、一覧クリックで手動編成へ追加できる', () => {
    // PCではスロット選択開始時にパネルを自動で閉じないため、利用者が閉じる操作を挟んでも選択モードと登録済みコールバックを維持する
    // 続けてカードをクリックし、対象スロットへ反映する
    stubViewport(true)
    const onClosePanel = vi.fn()
    const { result } = renderHook(() => useManualSelectionHarness(onClosePanel, false))

    // PCではパネルを閉じる前に5番目のスロットを選択し、利用者の閉じる操作を再現する
    act(() => result.current.manualSelection.startSlotSelection(4))
    act(() => result.current.closePanel())
    act(() => result.current.bridge.handleManualCardClick(targetCard))

    // パネルが閉じた後も選択モードのコールバックが残り、クリックしたカードが指定位置へ入る
    expect(result.current.panelOpen).toBe(false)
    expect(result.current.settings.manualCards[4]).toBe(targetCard.name)
    expect(result.current.unitCardSelectMode).toBe(true)
    expect(onClosePanel).not.toHaveBeenCalled()
  })

  it('除外カードでも一覧から手動編成へ新規追加できる', () => {
    stubViewport(false)
    const onClosePanel = vi.fn()
    const { result } = renderHook(() => useManualSelectionHarness(onClosePanel, true))

    act(() => result.current.manualSelection.startSlotSelection(0))
    expect(result.current.bridge.isCardEligible(targetCard)).toBe(true)

    act(() => result.current.bridge.handleManualCardClick(targetCard))

    expect(result.current.settings.manualCards[0]).toBe(targetCard.name)
  })
})
