/**
 * UI 表示状態管理フック
 *
 * アプリ全体の「見た目に関する状態」をまとめて管理する。
 * モーダルの開閉・パネルの表示/非表示・編集モードの切り替えなど。
 */
import { useState, useEffect } from 'react'
import type { SupportCard, CardCalculationResult } from '../types/card'
import { FilterSortTab } from '../types/enums'

/** useUIState の返却型 */
interface UIState {
  /** 詳細モーダルで表示中のカード（nullなら閉じている） */
  selectedCard: SupportCard | null
  setSelectedCard: (card: SupportCard | null) => void
  /** 点数設定パネルの開閉 */
  scoreSettingsOpen: boolean
  setScoreSettingsOpen: (open: boolean) => void
  /** 点数設定パネルのピン固定（trueなら常に表示） */
  settingsPinned: boolean
  setSettingsPinned: (pinned: boolean) => void
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
  const [settingsPinned, setSettingsPinned] = useState(false)
  const [filterSortOpen, setFilterSortOpen] = useState(false)
  const [filterSortTab, setFilterSortTab] = useState<FilterSortTab>(FilterSortTab.Sort)
  const [uncapEditMode, setUncapEditMode] = useState(false)
  const [scoreBreakdown, setScoreBreakdown] = useState<{
    card: SupportCard
    result: CardCalculationResult
  } | null>(null)

  // モバイル幅（md未満）になったらピン留めを自動解除する
  useEffect(() => {
    const mql = window.matchMedia('(min-width: 768px)')
    const handler = (e: MediaQueryListEvent) => {
      if (!e.matches && settingsPinned) {
        setSettingsPinned(false)
      }
    }
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [settingsPinned])

  return {
    selectedCard,
    setSelectedCard,
    scoreSettingsOpen,
    setScoreSettingsOpen,
    settingsPinned,
    setSettingsPinned,
    filterSortOpen,
    setFilterSortOpen,
    filterSortTab,
    setFilterSortTab,
    uncapEditMode,
    setUncapEditMode,
    scoreBreakdown,
    setScoreBreakdown,
  }
}
