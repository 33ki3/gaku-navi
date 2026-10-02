/**
 * 一覧ページから開くモーダルをまとめて表示する。
 *
 * 各モーダルの開閉条件とデータ受け渡しだけを担当し、通常ページや固定パネルのレイアウトから分離する。
 */
import { Suspense } from 'react'
import * as constant from '../../constant'
import type { AppOptionsState } from '../../hooks/useAppOptions'
import type { AppState } from '../../hooks/useAppState'
import type { CardInteractions } from '../../hooks/useCardInteractions'
import type { AppPreferences } from '../../types/app'
import type { ScoreSettings, SupportCard } from '../../types/card'
import type { UncapType } from '../../types/enums'
import type { UnitSimulatorSettings } from '../../types/unit'
import { createEmptyResult } from '../../utils/calculator/calculateCard'
import * as lazyModules from '../../utils/lazyModules'
import { createPreloadedComponent } from '../../utils/preloadedComponent'
import { ModalLoadingFallback } from '../ui/ModalLoadingFallback'

const FilterSortModal = createPreloadedComponent(lazyModules.loadFilterSortModal)
const CardDetailModal = createPreloadedComponent(lazyModules.loadCardDetailModal)
const ScoreDetailModal = createPreloadedComponent(lazyModules.loadScoreDetailModal)
const UserCardFormModal = createPreloadedComponent(lazyModules.loadUserCardFormModal)
const OptionsModal = createPreloadedComponent(lazyModules.loadOptionsModal)

// モーダルの遅延読込・開閉条件・共通の配置計算を一箇所に集約し、Appの組み立てを簡潔にする
interface AppModalsProps {
  /** アプリ全体の統合状態 */
  state: AppState
  /** サポート編集・削除操作 */
  cardInteractions: CardInteractions
  /** オプション画面の状態と設定更新操作 */
  options: AppOptionsState
  /** 固定パネルを避けるモーダル右位置のクラス */
  panelRightOffset: string
  /** ユーザー定義サポートを共通commandで保存する操作 */
  onSaveUserSupport: (card: SupportCard) => void
  /** 表示設定を共通commandで保存する操作 */
  onPreferencesChange: (preferences: AppPreferences) => void
  /** 点数設定を共通commandで保存する操作 */
  onScoreSettingsChange: (settings: ScoreSettings) => void
  /** 最適編成設定を共通commandで保存する操作 */
  onUnitSettingsChange: (settings: UnitSimulatorSettings) => void
  /** 凸数変更を共通commandで保存する操作 */
  onCardUncapChange: (cardName: string, uncap: UncapType) => void
}

/**
 * 現在のUI状態に対応するモーダルを遅延読込して表示する
 *
 * @param props - アプリ状態、サポート操作、オプション状態、配置クラス
 * @returns 開いているモーダル群
 */
export function AppModals({
  state,
  cardInteractions,
  options,
  panelRightOffset,
  onSaveUserSupport,
  onPreferencesChange,
  onScoreSettingsChange,
  onUnitSettingsChange,
  onCardUncapChange,
}: AppModalsProps) {
  const selectedCard = state.ui.selectedCard
  const scoreBreakdown = state.ui.scoreBreakdown

  return (
    <>
      {/* フィルター・ソートモーダル */}
      {state.ui.filterSortOpen && (
        <Suspense
          fallback={<ModalLoadingFallback panelClassName={constant.MODAL_PANEL_FILTER} className={panelRightOffset} />}
        >
          <FilterSortModal
            onClose={() => state.ui.setFilterSortOpen(false)}
            filters={state.filters}
            panelRightOffset={panelRightOffset}
            activeTab={state.ui.filterSortTab}
            onTabChange={state.ui.setFilterSortTab}
          />
        </Suspense>
      )}

      {/* サポートカード詳細 */}
      {selectedCard && (
        <Suspense fallback={<ModalLoadingFallback />}>
          <CardDetailModal
            card={selectedCard}
            uncap={state.scores.getCardUncap(selectedCard.name)}
            scoreResult={state.scores.cardResults.get(selectedCard.name) ?? createEmptyResult(selectedCard)}
            calculateForCard={state.scores.calculateForCard}
            onClose={() => state.ui.setSelectedCard(null)}
            onUncapChange={onCardUncapChange}
            onEditUserCard={cardInteractions.editUserCard}
            onDeleteUserCard={cardInteractions.deleteUserCard}
          />
        </Suspense>
      )}

      {/* 点数内訳・回数調整 */}
      {scoreBreakdown && (
        <Suspense fallback={<ModalLoadingFallback panelClassName={constant.MODAL_PANEL_SCORE} />}>
          <ScoreDetailModal
            card={scoreBreakdown.card}
            result={state.scores.cardResults.get(scoreBreakdown.card.name) ?? createEmptyResult(scoreBreakdown.card)}
            countCustom={state.scores.countCustom.cardCountCustom[scoreBreakdown.card.name] ?? {}}
            onSelfTriggerChange={(actionId, count) =>
              state.scores.countCustom.setSelfTrigger(scoreBreakdown.card.name, actionId, count)
            }
            onRemoveSelfTrigger={(actionId) =>
              state.scores.countCustom.removeSelfTrigger(scoreBreakdown.card.name, actionId)
            }
            onPItemCountChange={(actionId, count) =>
              state.scores.countCustom.setPItemCount(scoreBreakdown.card.name, actionId, count)
            }
            onRemovePItemCount={(actionId) =>
              state.scores.countCustom.removePItemCount(scoreBreakdown.card.name, actionId)
            }
            onClearCardCustom={() => state.scores.countCustom.clearCardCustom(scoreBreakdown.card.name)}
            onClose={() => state.ui.setScoreBreakdown(null)}
          />
        </Suspense>
      )}

      {/* ユーザー追加カードの編集・新規登録フォーム */}
      {state.ui.userCardFormOpen && (
        <Suspense fallback={<ModalLoadingFallback panelClassName={constant.MODAL_PANEL_USER_CARD} />}>
          <UserCardFormModal
            onClose={() => {
              state.ui.setUserCardFormOpen(false)
              state.ui.setEditingUserCard(null)
            }}
            onCancel={() => {
              const editingCard = state.ui.editingUserCard
              state.ui.setUserCardFormOpen(false)
              state.ui.setEditingUserCard(null)
              if (editingCard) state.ui.setSelectedCard(editingCard)
            }}
            onSave={onSaveUserSupport}
            editingCard={state.ui.editingUserCard ?? undefined}
            existingNames={state.userCards.userCardNames}
          />
        </Suspense>
      )}

      {/* 表示設定・最適編成設定のオプションモーダル */}
      {options.isOpen && (
        <Suspense fallback={<ModalLoadingFallback panelClassName={constant.MODAL_PANEL_OPTIONS} />}>
          <OptionsModal
            onClose={options.close}
            preferences={options.preferences}
            onPreferencesChange={onPreferencesChange}
            scoreSettings={state.scores.scoreSettings}
            onScoreSettingsChange={onScoreSettingsChange}
            unitSettings={options.unitSettings}
            onUnitSettingsChange={onUnitSettingsChange}
          />
        </Suspense>
      )}
    </>
  )
}
