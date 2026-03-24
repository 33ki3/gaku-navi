/**
 * カード一覧ページ（メインページ）
 *
 * アプリのルートコンポーネント。
 * ヘッダー・フィルター・カードグリッド・モーダル・点数設定パネルを
 * 組み合わせて表示する。useAppState で全体の状態を管理する。
 */
import { useTranslation } from 'react-i18next'
import { lazy, Suspense, useMemo } from 'react'

import AppHeader from './components/header/AppHeader'
import CardList from './components/cardList/CardList'
import SortControls from './components/filterBar/SortControls'
import EmptyState from './components/cardList/EmptyState'
import { useAppState } from './hooks'
import { CardProvider } from './contexts/CardContext'
import type { CardContextValue } from './contexts/CardContext'
import { hasAllScheduleSelections } from './utils/scoreSettings'

const CardDetailModal = lazy(() => import('./components/cardDetailModal/CardDetailModal'))
const ScoreDetailModal = lazy(() => import('./components/scoreDetailModal/ScoreDetailModal'))
const ScoreSettingsPanel = lazy(() => import('./components/scoreSettingsPanel/ScoreSettingsPanel'))

/**
 * メインアプリケーションコンポーネント
 *
 * @returns アプリ全体の要素
 */
function App() {
  const { t } = useTranslation()
  const state = useAppState()

  // CardList・CardListItem で共有するカード操作コンテキストを生成
  const cardCtx = useMemo<CardContextValue>(
    () => ({
      getCardUncap: state.scores.getCardUncap,
      uncapEditMode: state.ui.uncapEditMode,
      onToggleUncapEdit: state.handlers.handleToggleUncapEdit,
      onCardClick: state.handlers.handleCardClick,
      onScoreClick: state.handlers.handleScoreClick,
      onUncapChange: state.handlers.handleUncapChange,
    }),
    // useMemo の依存配列 — コンテキスト値を構成する各関数・状態が変わったときだけ再生成
    [state.scores.getCardUncap, state.ui.uncapEditMode, state.handlers.handleToggleUncapEdit, state.handlers.handleCardClick, state.handlers.handleScoreClick, state.handlers.handleUncapChange],
  )

  return (
    // カード操作コンテキストをアプリ全体に提供
    <CardProvider value={cardCtx}>
    <div
      className={`min-h-screen bg-[#f8fafc] text-slate-900 font-sans transition-all duration-300 ${state.ui.settingsPinned ? 'md:pr-96' : ''}`}
    >
      {/* ヘッダー（タイトル・フィルター・アクションボタン） */}
      <AppHeader
        filters={state.filters}
        onOpenScoreSettings={() => state.ui.setScoreSettingsOpen(true)}
        onPinScoreSettings={() => state.ui.setSettingsPinned(!state.ui.settingsPinned)}
        settingsPinned={state.ui.settingsPinned}
        headerOpen={state.ui.headerOpen}
        onToggleHeaderOpen={() => state.ui.setHeaderOpen(!state.ui.headerOpen)}
      />

      <main className={`mx-auto px-4 py-5 sm:px-6 lg:px-8 ${state.ui.settingsPinned ? '' : 'max-w-7xl'}`}>
        {/* 件数表示 + ソート */}
        <SortControls
          count={state.filters.filteredCards.length}
          sortMode={state.filters.sortMode}
          onSortModeChange={state.filters.setSortMode}
          sortReverse={state.filters.sortReverse}
          onToggleSortReverse={state.filters.toggleSortReverse}
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

        {/* カードグリッド（仮想スクロール対応） */}
        <CardList
          filteredCards={state.filters.filteredCards}
          cardScores={state.scores.cardScores}
          abilityBadgeMap={state.filters.abilityBadgeMap}
          settingsPinned={state.ui.settingsPinned}
        />
        {/* フィルタ結果が空のときの案内表示 */}
        {state.filters.filteredCards.length === 0 && (
          <EmptyState onClearFilters={state.filters.clearFilters} />
        )}
      </main>
      {/* フッター（アプリ名・クレジット表示） */}
      <footer className={`mx-auto px-4 py-6 sm:px-6 lg:px-8 text-center ${state.ui.settingsPinned ? '' : 'max-w-7xl'}`}>
        <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">{t('ui.footer')}</p>
      </footer>
      {/* カード詳細モーダル（カード選択時のみ表示） */}
      {state.ui.selectedCard && (
        <Suspense fallback={null}>
          <CardDetailModal
            card={state.ui.selectedCard}
            uncap={state.scores.getCardUncap(state.ui.selectedCard.name)}
            scoreResult={state.scores.cardResults.get(state.ui.selectedCard.name)!}
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
            result={state.ui.scoreBreakdown.result}
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
    </div>
    </CardProvider>
  )
}

export default App
