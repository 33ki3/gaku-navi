/**
 * UI 表示状態管理フック
 *
 * アプリ全体の「見た目に関する状態」をまとめて管理する。
 * モーダルの開閉・パネルの表示/非表示・編集モードの切り替えなど。
 */
import { useState, useEffect, useCallback } from 'react'
import type { SupportCard, CardCalculationResult } from '../types/card'
import { FilterSortTab } from '../types/enums'
import * as constant from '../constant'

/** useUIState の返却型 */
interface UIState {
  /** 詳細モーダルで表示中のサポート（nullなら閉じている） */
  selectedCard: SupportCard | null
  setSelectedCard: (card: SupportCard | null) => void
  /** 点数設定パネルの開閉 */
  scoreSettingsOpen: boolean
  setScoreSettingsOpen: (open: boolean) => void
  /** 点数設定パネルのピン固定（trueなら常に表示） */
  settingsPinned: boolean
  setSettingsPinned: (pinned: boolean) => void
  /** 最適編成パネルの開閉 */
  simulatorOpen: boolean
  setSimulatorOpen: (open: boolean) => void
  /** 最適編成パネルのピン固定 */
  simulatorPinned: boolean
  setSimulatorPinned: (pinned: boolean) => void
  /** いずれかのパネルがピン留めされているか */
  anyPanelPinned: boolean
  /** 両方のパネルがピン留めされているか */
  bothPanelsPinned: boolean
  /** フィルタ・ソートモーダルが開いているか */
  filterSortOpen: boolean
  setFilterSortOpen: (open: boolean) => void
  /** フィルタ・ソートモーダルの選択中タブ */
  filterSortTab: FilterSortTab
  setFilterSortTab: (tab: FilterSortTab) => void
  /** 凸数を編集できるモードかどうか */
  uncapEditMode: boolean
  setUncapEditMode: (mode: boolean) => void
  /** スコア内訳モーダルに渡すデータ（nullなら閉じている） */
  scoreBreakdown: { card: SupportCard; result: CardCalculationResult } | null
  setScoreBreakdown: (data: { card: SupportCard; result: CardCalculationResult } | null) => void
  /** 手動編成のサポート一覧選択モード */
  unitCardSelectMode: boolean
  setUnitCardSelectMode: (mode: boolean) => void
}

/**
 * UI 表示状態をまとめて返すフック
 *
 * @returns 各 UI 状態と、それを変更する関数のセット
 */
export function useUIState(): UIState {
  // --- 各 UI 状態を useState で管理 ---
  const [selectedCard, setSelectedCard] = useState<SupportCard | null>(null)
  const [scoreSettingsOpen, setScoreSettingsOpen] = useState(false)
  const [settingsPinnedRaw, setSettingsPinnedRaw] = useState(false)
  const [simulatorOpen, setSimulatorOpen] = useState(false)
  const [simulatorPinnedRaw, setSimulatorPinnedRaw] = useState(false)
  const [filterSortOpen, setFilterSortOpen] = useState(false)
  const [filterSortTab, setFilterSortTabRaw] = useState<FilterSortTab>(() => {
    // localStorage から前回のタブ選択を復元する
    const saved = localStorage.getItem(constant.FILTER_SORT_TAB_KEY)
    if (saved === FilterSortTab.Filter || saved === FilterSortTab.Sort) return saved
    return FilterSortTab.Sort
  })
  const [uncapEditMode, setUncapEditMode] = useState(false)
  const [scoreBreakdown, setScoreBreakdown] = useState<{
    card: SupportCard
    result: CardCalculationResult
  } | null>(null)
  const [unitCardSelectMode, setUnitCardSelectMode] = useState(false)

  /** タブ変更時に localStorage にも保存する */
  const setFilterSortTab = useCallback((tab: FilterSortTab) => {
    setFilterSortTabRaw(tab)
    localStorage.setItem(constant.FILTER_SORT_TAB_KEY, tab)
  }, [])

  // ピン留め: 両方同時にピン可能（PCのみ）
  const setSettingsPinned = useCallback((pinned: boolean) => {
    setSettingsPinnedRaw(pinned)
  }, [])

  const setSimulatorPinned = useCallback((pinned: boolean) => {
    setSimulatorPinnedRaw(pinned)
  }, [])

  const settingsPinned = settingsPinnedRaw
  const simulatorPinned = simulatorPinnedRaw
  const anyPanelPinned = settingsPinned || simulatorPinned
  const bothPanelsPinned = settingsPinned && simulatorPinned

  // モバイル幅（md未満）になったらピン留めを自動解除する
  useEffect(() => {
    const mql = window.matchMedia('(min-width: 768px)')
    const handler = (e: MediaQueryListEvent) => {
      if (!e.matches) {
        if (settingsPinned) setSettingsPinnedRaw(false)
        if (simulatorPinned) setSimulatorPinnedRaw(false)
      }
    }
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [settingsPinned, simulatorPinned])

  return {
    selectedCard,
    setSelectedCard,
    scoreSettingsOpen,
    setScoreSettingsOpen,
    settingsPinned,
    setSettingsPinned,
    simulatorOpen,
    setSimulatorOpen,
    simulatorPinned,
    setSimulatorPinned,
    anyPanelPinned,
    bothPanelsPinned,
    filterSortOpen,
    setFilterSortOpen,
    filterSortTab,
    setFilterSortTab,
    uncapEditMode,
    setUncapEditMode,
    scoreBreakdown,
    setScoreBreakdown,
    unitCardSelectMode,
    setUnitCardSelectMode,
  }
}
