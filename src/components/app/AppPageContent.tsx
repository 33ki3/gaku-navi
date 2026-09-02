/**
 * アプリのヘッダー、サポート一覧、フッターを表示する。
 * 変更履歴ではなく、各領域の責務が分かるコメントだけを残す。
 * モーダルと設定パネルは別コンポーネントへ分け、通常ページのレイアウトだけを担当する。
 */
import { useTranslation } from 'react-i18next'
import * as constant from '../../constant'
import * as data from '../../data'
import type { AppOptionsState } from '../../hooks/useAppOptions'
import type { AppState } from '../../hooks/useAppState'
import type { PanelNavigationActions } from '../../hooks/usePanelNavigation'
import type { CardListModeController } from '../../types/app'
import * as enums from '../../types/enums'
import { getActiveFilterCount } from '../../utils/filterCount'
import { hasAllScheduleSelections } from '../../utils/scoreSettings'
import AppHeader from '../header/AppHeader'
import CardList from '../cardList/CardList'
import EmptyState from '../cardList/EmptyState'
import SortControls from '../filterBar/SortControls'
import { CardListModeCompletionBarContent } from './CardListModeCompletionBar'

interface AppPageContentProps {
  /** アプリ全体の統合状態 */
  state: AppState
  /** 設定パネルを開閉する操作 */
  navigation: PanelNavigationActions
  /** 保存対象の表示設定とオプション画面操作 */
  options: AppOptionsState
  /** サポート一覧の操作モードと切り替え操作 */
  cardListMode: CardListModeController
  /** 外部操作から下部ナビを表示し直す関数を登録する */
  registerMobileNavigationShow?: (handler: (() => void) | null) => void
}

/**
 * 通常表示されるページ本体を組み立てる
 *
 * @param props - アプリ状態、画面遷移、表示設定、手動選択操作
 * @returns ヘッダー、サポート一覧、フッター
 */
export function AppPageContent({
  state,
  navigation,
  options,
  cardListMode,
  registerMobileNavigationShow,
}: AppPageContentProps) {
  const { t } = useTranslation()
  // 絞り込み件数と固定パネルの表示状態を、ヘッダー・本文・手動選択バーで共有する
  const activeFilterCount = getActiveFilterCount(state.filters)
  const contentOffset = state.ui.bothPanelsPinned
    ? constant.CONTENT_TWO_PANEL_OFFSET
    : state.ui.anyPanelPinned
      ? constant.CONTENT_ONE_PANEL_OFFSET
      : ''
  const contentPadding = state.ui.anyPanelPinned ? constant.CONTENT_COMPACT_PADDING : constant.CONTENT_DEFAULT_WIDTH

  return (
    <>
      {/* アプリヘッダー */}
      <AppHeader
        onOpenScoreSettings={navigation.openScoreSettings}
        onPinScoreSettings={navigation.toggleScoreSettingsPin}
        settingsPinned={state.ui.settingsPinned}
        scoreSettingsActive={state.ui.scoreSettingsOpen || state.ui.settingsPinned}
        onOpenSimulator={navigation.openUnitSimulator}
        onPinSimulator={navigation.toggleUnitSimulatorPin}
        simulatorPinned={state.ui.simulatorPinned}
        simulatorActive={state.ui.simulatorOpen || state.ui.simulatorPinned}
        onToggleMobileUncap={navigation.toggleMobileUncapEdit}
        onOpenMobileFilter={() => state.ui.setFilterSortOpen(true)}
        mobileFilterLabel={t(data.getSortModeLabel(state.filters.sortMode))}
        mobileFilterCount={activeFilterCount}
        sortReverse={state.filters.sortReverse}
        onOpenUserCardForm={() => state.ui.setUserCardFormOpen(true)}
        onOpenOptions={options.open}
        showMobileBottomNav={options.preferences.showMobileBottomNav}
        keepMobileBottomNavFixed={options.preferences.keepMobileBottomNavFixed}
        registerMobileNavigationShow={registerMobileNavigationShow}
      />

      {/* ヘッダーは全幅のまま、本文だけを固定パネルの表示領域に合わせる */}
      <div className={`transition-[padding] duration-300 ${contentOffset}`}>
        <main className={`mx-auto px-4 py-5 sm:px-6 lg:px-8 ${contentPadding}`}>
          {/* ソート・フィルター操作欄 */}
          <SortControls
            count={state.filters.filteredCards.length}
            filters={state.filters}
            onOpenFilterSort={() => state.ui.setFilterSortOpen(true)}
            onOpenScoreSettings={navigation.openScoreSettingsFromList}
            scheduleConfigured={hasAllScheduleSelections(state.scores.scoreSettings)}
            scoreSettingsVisible={state.ui.scoreSettingsOpen || state.ui.settingsPinned}
            compactLayout={state.ui.anyPanelPinned}
          />

          {/* 絞り込み済みサポートカード一覧 */}
          <CardList
            filteredCards={state.filters.filteredCards}
            cardScores={state.scores.cardScores}
            abilityBadgeMap={state.filters.abilityBadgeMap}
            cardCountCustom={state.scores.countCustom.cardCountCustom}
            settingsPinned={state.ui.anyPanelPinned}
            bothPanelsPinned={state.ui.bothPanelsPinned}
          />
          {/* 絞り込み結果なしの案内 */}
          {state.filters.filteredCards.length === 0 && <EmptyState onClearFilters={state.filters.clearFilters} />}
        </main>

        {/* ページ末尾フッター */}
        <footer
          className={`mx-auto px-4 py-6 text-center sm:px-6 lg:px-8 ${
            state.ui.anyPanelPinned ? '' : constant.CONTENT_DEFAULT_WIDTH
          }`}
        >
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{t('ui.footer')}</p>
        </footer>
      </div>

      {/* 手動選択・除外設定中の完了操作バー */}
      {cardListMode.mode === enums.CardListInteractionModeType.CardExclusionEdit && (
        <CardListModeCompletionBarContent
          label="unit.card_exclusion_select_bar"
          doneLabel="unit.manual_select_done"
          onDone={cardListMode.toggleExclusion}
          showMobileBottomNav={options.preferences.showMobileBottomNav}
        />
      )}
      {cardListMode.mode === enums.CardListInteractionModeType.UnitCardSelect && (
        <CardListModeCompletionBarContent
          label="unit.manual_select_bar"
          doneLabel="unit.manual_select_done"
          onDone={cardListMode.finishManualSelection}
          showMobileBottomNav={options.preferences.showMobileBottomNav}
        />
      )}
    </>
  )
}
