/**
 * UI 表示状態管理フック
 *
 * アプリ全体の「見た目に関する状態」をまとめて管理する。
 * モーダルの開閉・パネルの表示/非表示・編集モードの切り替えなど。
 */
import { useState, useEffect } from 'react'
import type { SupportCard, CardCalculationResult } from '../types/card'
import * as constant from '../constant'

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
  /** ヘッダーのフィルターエリアが開いているか */
  headerOpen: boolean
  setHeaderOpen: (open: boolean) => void
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
 * ヘッダーの開閉状態だけ localStorage に保存して、
 * ページを開き直しても前の状態を復元する。
 *
 * @returns 各 UI 状態と、それを変更する関数のセット
 */
export function useUIState(): UIState {
  // --- 各 UI 状態を useState で管理 ---
  const [selectedCard, setSelectedCard] = useState<SupportCard | null>(null)
  const [scoreSettingsOpen, setScoreSettingsOpen] = useState(false)
  const [settingsPinned, setSettingsPinned] = useState(false)

  // ヘッダーだけ localStorage から復元（初回レンダリング時に読み込む）
  const [headerOpen, setHeaderOpen] = useState(() => {
    const saved = localStorage.getItem(constant.HEADER_OPEN_KEY)
    return saved !== null ? saved === 'true' : false
  })

  const [uncapEditMode, setUncapEditMode] = useState(false)
  const [scoreBreakdown, setScoreBreakdown] = useState<{
    card: SupportCard
    result: CardCalculationResult
  } | null>(null)

  // ヘッダー開閉が変わったら localStorage に保存する
  useEffect(() => {
    localStorage.setItem(constant.HEADER_OPEN_KEY, String(headerOpen))
  }, [headerOpen])

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
    headerOpen,
    setHeaderOpen,
    uncapEditMode,
    setUncapEditMode,
    scoreBreakdown,
    setScoreBreakdown,
  }
}
