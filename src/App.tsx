/**
 * サポート一覧ページ（メインページ）
 *
 * アプリのルートコンポーネント。
 * ヘッダー・フィルター・サポートグリッド・モーダル・点数設定パネルを
 * 組み合わせて表示する。useAppState で全体の状態を管理する。
 */
import { useTranslation } from 'react-i18next'
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef } from 'react'

import AppHeader from './components/header/AppHeader'
import CardList from './components/cardList/CardList'
import SortControls from './components/filterBar/SortControls'
import EmptyState from './components/cardList/EmptyState'
import { useAppState } from './hooks'
import { createEmptyResult } from './utils/calculator/calculateCard'
import { CardDataProvider, CardUIProvider } from './contexts/CardContext'
import type { CardDataContextValue, CardUIContextValue } from './contexts/CardContext'
import type { SupportCard } from './types/card'
import { hasAllScheduleSelections } from './utils/scoreSettings'

const CardDetailModal = lazy(() => import('./components/cardDetailModal/CardDetailModal'))
const ScoreDetailModal = lazy(() => import('./components/scoreDetailModal/ScoreDetailModal'))
const ScoreSettingsPanel = lazy(() => import('./components/scoreSettingsPanel/ScoreSettingsPanel'))
const FilterSortModal = lazy(() => import('./components/filterBar/FilterSortModal'))
const UnitSimulatorPanel = lazy(() => import('./components/unitSimulator/UnitSimulatorPanel'))

/**
 * メインアプリケーションコンポーネント
 *
 * @returns アプリ全体の要素
 */
function App() {
  const { t } = useTranslation()
  const state = useAppState()

  // サポート一覧選択モード: UnitSimulatorPanel が登録する addCard コールバック
  const addManualCardRef = useRef<((cardName: string) => void) | null>(null)
  const registerAddManualCard = useCallback((fn: ((cardName: string) => void) | null) => {
    addManualCardRef.current = fn
  }, [])

  // サポート一覧選択モード: サポート選択可否判定関数
  const isCardEligibleRef = useRef<((card: SupportCard) => boolean) | null>(null)
  const registerIsCardEligible = useCallback((fn: ((card: SupportCard) => boolean) | null) => {
    isCardEligibleRef.current = fn
  }, [])

  // unitCardSelectMode を ref で保持して onCardClick / isCardEligible を安定化する
  const unitCardSelectModeRef = useRef(state.ui.unitCardSelectMode)
  useEffect(() => {
    unitCardSelectModeRef.current = state.ui.unitCardSelectMode
  }, [state.ui.unitCardSelectMode])

  // handlers を個別に取り出し、useMemo の依存配列を正確に指定する
  const { handleCardClick, handleScoreClick, handleUncapChange, handleToggleUncapEdit } = state.handlers

  // サポート選択モード対応のクリックハンドラ（ref で安定化）
  const onCardClick = useCallback(
    (card: SupportCard) => {
      if (unitCardSelectModeRef.current && addManualCardRef.current) {
        addManualCardRef.current(card.name)
        return
      }
      handleCardClick(card)
    },
    [handleCardClick],
  )

  // サポート選択可否判定（ref で安定化）
  // unitCardSelectMode の判定は CardListItem 側で行うため、ここでは eligibility のみ評価する
  const isCardEligible = useCallback((card: SupportCard) => {
    return isCardEligibleRef.current ? isCardEligibleRef.current(card) : true
  }, [])

  // CardDataContext: 安定したアクション関数（凸数変更時のみ再生成）
  const cardDataCtx = useMemo<CardDataContextValue>(
    () => ({
      getCardUncap: state.scores.getCardUncap,
      onCardClick,
      onScoreClick: handleScoreClick,
      onUncapChange: handleUncapChange,
    }),
    [state.scores.getCardUncap, onCardClick, handleScoreClick, handleUncapChange],
  )

  // CardUIContext: 変化する UI 状態（編集モード・選択モード切替時のみ再生成）
  const cardUICtx = useMemo<CardUIContextValue>(
    () => ({
      uncapEditMode: state.ui.uncapEditMode,
      onToggleUncapEdit: handleToggleUncapEdit,
      unitCardSelectMode: state.ui.unitCardSelectMode,
      isCardEligible,
    }),
    [state.ui.uncapEditMode, handleToggleUncapEdit, state.ui.unitCardSelectMode, isCardEligible],
  )

  // パネル表示に応じてモーダルの右オフセットクラスを計算する
  const panelRightOffset = state.ui.bothPanelsPinned ? 'md:right-[48rem]' : state.ui.anyPanelPinned ? 'md:right-96' : ''

  return (
    // サポート操作コンテキストをアプリ全体に提供（データ層 + UI層の2分割）
    <CardDataProvider value={cardDataCtx}>
      <CardUIProvider value={cardUICtx}>
        <div
          className={`min-h-screen bg-[#f8fafc] text-slate-900 font-sans transition-[padding] duration-300 ${state.ui.bothPanelsPinned ? 'md:pr-[48rem]' : state.ui.anyPanelPinned ? 'md:pr-96' : ''}`}
        >
          {/* ヘッダー（タイトル・アクションボタン） */}
          <AppHeader
            onOpenScoreSettings={() => state.ui.setScoreSettingsOpen(true)}
            onPinScoreSettings={() => state.ui.setSettingsPinned(!state.ui.settingsPinned)}
            settingsPinned={state.ui.settingsPinned}
            onOpenSimulator={() => state.ui.setSimulatorOpen(true)}
            onPinSimulator={() => state.ui.setSimulatorPinned(!state.ui.simulatorPinned)}
            simulatorPinned={state.ui.simulatorPinned}
            bothPanelsPinned={state.ui.bothPanelsPinned}
            panelRightOffset={panelRightOffset}
          />

          <main className={`mx-auto px-4 py-5 sm:px-6 lg:px-8 ${state.ui.anyPanelPinned ? '' : 'max-w-7xl'}`}>
            {/* 件数表示 + フィルタ・ソートボタン */}
            <SortControls
              count={state.filters.filteredCards.length}
              filters={state.filters}
              onOpenFilterSort={() => state.ui.setFilterSortOpen(true)}
              onOpenScoreSettings={() => {
                // PC（md以上）はピン留めモード、モバイルはオーバーレイモード
                if (window.matchMedia('(min-width: 768px)').matches) {
                  state.ui.setSettingsPinned(true)
                } else {
                  state.ui.setScoreSettingsOpen(true)
                }
              }}
              scheduleConfigured={hasAllScheduleSelections(state.scores.scoreSettings)}
              scoreSettingsVisible={state.ui.scoreSettingsOpen || state.ui.settingsPinned}
            />

            {/* サポートグリッド（仮想スクロール対応） */}
            <CardList
              filteredCards={state.filters.filteredCards}
              cardScores={state.scores.cardScores}
              abilityBadgeMap={state.filters.abilityBadgeMap}
              cardCountCustom={state.scores.countCustom.cardCountCustom}
              settingsPinned={state.ui.anyPanelPinned}
              bothPanelsPinned={state.ui.bothPanelsPinned}
            />
            {/* フィルタ結果が空のときの案内表示 */}
            {state.filters.filteredCards.length === 0 && <EmptyState onClearFilters={state.filters.clearFilters} />}
          </main>
          {/* フッター（アプリ名・クレジット表示） */}
          <footer
            className={`mx-auto px-4 py-6 sm:px-6 lg:px-8 text-center ${state.ui.anyPanelPinned ? '' : 'max-w-7xl'}`}
          >
            <p className="text-[10px] font-bold text-slate-500 tracking-widest uppercase">{t('ui.footer')}</p>
          </footer>
          {/* サポート一覧選択モード: フローティングバー */}
          {state.ui.unitCardSelectMode && (
            <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-blue-600 text-white px-5 py-3 rounded-2xl shadow-lg">
              <span className="text-xs font-bold">{t('unit.manual_select_bar')}</span>
              <button
                onClick={() => {
                  state.ui.setUnitCardSelectMode(false)
                  // モバイルの場合はパネルを再度開く
                  if (!window.matchMedia('(min-width: 768px)').matches) {
                    state.ui.setSimulatorOpen(true)
                  }
                }}
                className="px-3 py-1 rounded-lg text-xs font-bold bg-white text-blue-600 hover:bg-blue-50 transition-colors"
              >
                {t('unit.manual_select_done')}
              </button>
            </div>
          )}
          {/* フィルタ・ソートモーダル */}
          {state.ui.filterSortOpen && (
            <Suspense fallback={null}>
              <FilterSortModal
                onClose={() => state.ui.setFilterSortOpen(false)}
                filters={state.filters}
                panelRightOffset={panelRightOffset}
                activeTab={state.ui.filterSortTab}
                onTabChange={state.ui.setFilterSortTab}
              />
            </Suspense>
          )}
          {/* サポート詳細モーダル（サポート選択時のみ表示） */}
          {state.ui.selectedCard && (
            <Suspense fallback={null}>
              <CardDetailModal
                card={state.ui.selectedCard}
                uncap={state.scores.getCardUncap(state.ui.selectedCard.name)}
                scoreResult={
                  state.scores.cardResults.get(state.ui.selectedCard.name) ?? createEmptyResult(state.ui.selectedCard)
                }
                calculateForCard={state.scores.calculateForCard}
                onClose={() => state.ui.setSelectedCard(null)}
              />
            </Suspense>
          )}
          {/* スコア内訳モーダル（スコアクリック時のみ表示） */}
          {state.ui.scoreBreakdown && (
            <Suspense fallback={null}>
              <ScoreDetailModal
                card={state.ui.scoreBreakdown.card}
                result={
                  state.scores.cardResults.get(state.ui.scoreBreakdown.card.name) ??
                  createEmptyResult(state.ui.scoreBreakdown.card)
                }
                countCustom={state.scores.countCustom.cardCountCustom[state.ui.scoreBreakdown.card.name] ?? {}}
                onSelfTriggerChange={(actionId, count) =>
                  state.scores.countCustom.setSelfTrigger(state.ui.scoreBreakdown!.card.name, actionId, count)
                }
                onRemoveSelfTrigger={(actionId) =>
                  state.scores.countCustom.removeSelfTrigger(state.ui.scoreBreakdown!.card.name, actionId)
                }
                onPItemCountChange={(actionId, count) =>
                  state.scores.countCustom.setPItemCount(state.ui.scoreBreakdown!.card.name, actionId, count)
                }
                onRemovePItemCount={(actionId) =>
                  state.scores.countCustom.removePItemCount(state.ui.scoreBreakdown!.card.name, actionId)
                }
                onClearCardCustom={() => state.scores.countCustom.clearCardCustom(state.ui.scoreBreakdown!.card.name)}
                onClose={() => state.ui.setScoreBreakdown(null)}
              />
            </Suspense>
          )}
          {/* 点数設定パネル（isOpen で開閉制御） */}
          <Suspense fallback={null}>
            <ScoreSettingsPanel
              isOpen={state.ui.scoreSettingsOpen}
              onClose={() => {
                state.ui.setScoreSettingsOpen(false)
                state.ui.setSettingsPinned(false)
              }}
              pinned={state.ui.settingsPinned}
              settings={state.scores.scoreSettings}
              onSettingsChange={state.scores.setScoreSettings}
            />
          </Suspense>
          {/* 最適編成パネル */}
          <Suspense fallback={null}>
            <UnitSimulatorPanel
              isOpen={state.ui.simulatorOpen}
              onClose={() => {
                state.ui.setSimulatorOpen(false)
                state.ui.setSimulatorPinned(false)
              }}
              pinned={state.ui.simulatorPinned}
              secondPanel={state.ui.bothPanelsPinned}
              registerAddManualCard={registerAddManualCard}
              registerIsCardEligible={registerIsCardEligible}
              unitCardSelectMode={state.ui.unitCardSelectMode}
              setUnitCardSelectMode={state.ui.setUnitCardSelectMode}
              countCustom={state.scores.countCustom}
              scoreSettings={state.scores.scoreSettings}
            />
          </Suspense>
        </div>
      </CardUIProvider>
    </CardDataProvider>
  )
}

export default App
