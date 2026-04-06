/**
 * 最適編成パネルコンポーネント
 *
 * 点数設定パネルと同じ UX（右パネル展開 + アコーディオン折りたたみ）で
 * 最適編成を表示する。
 */
import { useTranslation } from 'react-i18next'
import { useCallback, useEffect, useMemo, useRef } from 'react'

import { SidePanelLayout } from '../ui/SidePanelLayout'
import CollapsibleSection from '../ui/CollapsibleSection'
import CloseButton from '../ui/CloseButton'
import UnitSettings from './UnitSettings'
import UnitResult from './UnitResult'
import UnitSlotEditor from './UnitSlotEditor'
import { useUnitSimulator } from '../../hooks/useUnitSimulator'
import type { CardCountCustomState } from '../../hooks/useCardCountCustom'
import { useAccordionState } from '../../hooks'
import { ButtonSizeType, CollapsibleVariantType, PlanType, SimulatorSectionKey } from '../../types/enums'
import type { SupportCard, ScoreSettings } from '../../types/card'
import * as constant from '../../constant'

/** UnitSimulatorPanel に渡すプロパティ */
interface UnitSimulatorPanelProps {
  /** パネルが開いているか */
  isOpen: boolean
  /** パネルを閉じる関数 */
  onClose: () => void
  /** ピン留めかどうか */
  pinned: boolean
  /** 2枚目パネル（左側に配置）かどうか */
  secondPanel?: boolean
  /** サポート一覧選択モードの add コールバックを登録する */
  registerAddManualCard: (fn: ((cardName: string) => void) | null) => void
  /** サポート選択可否判定関数を登録する */
  registerIsCardEligible: (fn: ((card: SupportCard) => boolean) | null) => void
  /** サポート一覧選択モード */
  unitCardSelectMode: boolean
  /** サポート一覧選択モードの切り替え */
  setUnitCardSelectMode: (mode: boolean) => void
  /** カウント調整（Appと共有） */
  countCustom: CardCountCustomState
  /** スコア設定（Appと共有） */
  scoreSettings: ScoreSettings
}

/**
 * 最適編成パネル
 *
 * SidePanelLayout を再利用してサイドパネルとして表示する。
 */
export default function UnitSimulatorPanel({
  isOpen,
  onClose,
  pinned,
  secondPanel,
  registerAddManualCard,
  registerIsCardEligible,
  unitCardSelectMode,
  setUnitCardSelectMode,
  countCustom,
  scoreSettings,
}: UnitSimulatorPanelProps) {
  const { t } = useTranslation()
  const {
    settings,
    setSettings,
    optimizeRemaining,
    recalculateScores,
    evaluateCurrentCards,
    isCalculating,
    result,
    hasCalculated,
    noCandidates,
  } = useUnitSimulator()

  // サポート一覧選択モード用: addCard コールバックを親に登録する（自動/手動両対応）
  const settingsRef = useRef(settings)
  const setSettingsRef = useRef(setSettings)
  useEffect(() => {
    settingsRef.current = settings
  }, [settings])
  useEffect(() => {
    setSettingsRef.current = setSettings
  }, [setSettings])

  // 選択対象スロットのインデックス（空きスロットクリック時に記録する）
  const targetSlotIndexRef = useRef<number | null>(null)

  useEffect(() => {
    const addCard = (cardName: string) => {
      const s = settingsRef.current
      const filledCount = s.manualCards.filter((n) => n !== null).length
      if (filledCount >= constant.UNIT_SIZE) return
      if (s.manualCards.includes(cardName)) return
      // 6枠にパディングしてからターゲットスロットに配置する
      const padded = [...s.manualCards]
      while (padded.length < constant.UNIT_SIZE) padded.push(null)
      const targetIdx = targetSlotIndexRef.current
      if (targetIdx !== null && padded[targetIdx] === null) {
        padded[targetIdx] = cardName
      } else {
        // ターゲット未指定またはターゲットが埋まっている場合は最初の空きに配置
        const emptyIdx = padded.indexOf(null)
        if (emptyIdx >= 0) padded[emptyIdx] = cardName
      }
      targetSlotIndexRef.current = null
      setSettingsRef.current({ ...s, manualCards: padded })
      if (padded.filter((n) => n !== null).length >= constant.UNIT_SIZE) setUnitCardSelectMode(false)
    }
    registerAddManualCard(addCard)
    return () => registerAddManualCard(null)
  }, [registerAddManualCard, setUnitCardSelectMode])

  // サポート選択可否判定関数を親に登録する（プラン・タイプフィルタ）
  useEffect(() => {
    const isEligible = (card: SupportCard) => {
      const s = settingsRef.current
      // プラン判定: Free はどのプランでも選択可能
      if (card.plan !== PlanType.Free && card.plan !== s.plan) return false
      // タイプ判定: allowedTypes に含まれるサポートのみ選択可能
      if (!s.allowedTypes.includes(card.type)) return false
      // 既に選択済みのサポートは選択不可
      if (s.manualCards.includes(card.name)) return false
      return true
    }
    registerIsCardEligible(isEligible)
    return () => registerIsCardEligible(null)
  }, [registerIsCardEligible, settings.plan, settings.allowedTypes, settings.manualCards])

  // 点数詳細の発動回数カウント調整変更時にスコアのみ自動再計算する
  // （最適化をやり直さず、現在のユニット構成のまま計算し直す）
  const isFirstRender = useRef(true)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    if (!result) return
    recalculateScores(countCustom.cardCountCustom)
  }, [countCustom.cardCountCustom]) // eslint-disable-line react-hooks/exhaustive-deps

  // 点数設定（シナリオ・難易度・スケジュール等）の変更時にスコアを自動再計算する
  useEffect(() => {
    if (isFirstRender.current) return
    if (!result) return
    recalculateScores(countCustom.cardCountCustom)
  }, [scoreSettings]) // eslint-disable-line react-hooks/exhaustive-deps

  // 変更時に手持ちサポートでスコアを再評価する（最適化ではなく現在のサポートリストで計算）
  const prevManualCardsRef = useRef(settings.manualCards)
  useEffect(() => {
    if (prevManualCardsRef.current === settings.manualCards) return
    prevManualCardsRef.current = settings.manualCards
    // 実際にサポートが1枚以上ある場合に自動計算する
    const filledCount = settings.manualCards.filter((n) => n !== null).length
    if (filledCount > 0 && filledCount <= constant.UNIT_SIZE) {
      evaluateCurrentCards()
    }
  }, [settings.manualCards]) // eslint-disable-line react-hooks/exhaustive-deps

  // 点数詳細で発動回数をユーザーが手動変更（カウント調整）しているサポート名のセット
  // サポート一覧でバッジ表示するために使用する
  const customizedCardNames = useMemo(
    () => new Set(Object.keys(countCustom.cardCountCustom)),
    [countCustom.cardCountCustom],
  )

  // アコーディオン
  const { state: sections, toggle } = useAccordionState({
    [SimulatorSectionKey.Settings]: true,
    [SimulatorSectionKey.Slots]: true,
    [SimulatorSectionKey.Result]: true,
  })

  /** 一覧から選択モードの切り替え */
  const handleToggleSelectMode = useCallback(() => {
    const next = !unitCardSelectMode
    // モード解除時はターゲットスロットをクリアする
    if (!next) targetSlotIndexRef.current = null
    setUnitCardSelectMode(next)
    // モバイルの場合はパネルを閉じてサポート一覧から選べるようにする
    if (next && !window.matchMedia('(min-width: 768px)').matches) {
      onClose()
    }
  }, [unitCardSelectMode, setUnitCardSelectMode, onClose])

  /** 特定スロットを指定して選択モードを開始する */
  const handleSlotSelect = useCallback(
    (slotIndex: number) => {
      targetSlotIndexRef.current = slotIndex
      handleToggleSelectMode()
    },
    [handleToggleSelectMode],
  )

  /** サポート固定トグル */
  const handleToggleLock = useCallback(
    (cardName: string) => {
      const locked = settings.lockedCards
      const next = locked.includes(cardName) ? locked.filter((n) => n !== cardName) : [...locked, cardName]
      setSettings({ ...settings, lockedCards: next })
    },
    [settings, setSettings],
  )

  /** スロットからサポートを削除する（null で置換しスロット位置を維持する） */
  const handleRemoveCard = useCallback(
    (name: string) => {
      const nextCards = settings.manualCards.map((n) => (n === name ? null : n))
      const nextLocked = settings.lockedCards.filter((n) => n !== name)
      setSettings({ ...settings, manualCards: nextCards, lockedCards: nextLocked })
    },
    [settings, setSettings],
  )

  // サポート選択モード中はコールバック登録を維持するため、パネルを非表示にしてもアンマウントしない
  if (!isOpen && !pinned && !unitCardSelectMode) return null

  return (
    <SidePanelLayout isOpen={isOpen} onClose={onClose} pinned={pinned} secondPanel={secondPanel}>
      {/* ヘッダー */}
      <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-5 py-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-black text-slate-900">{t('ui.settings.unit_simulator')}</h2>
          <CloseButton onClick={onClose} size={ButtonSizeType.Lg} className="hover:bg-slate-100" />
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* 育成プラン設定 */}
        <div className={constant.SECTION_DIVIDER}>
          <CollapsibleSection
            title={t('unit.settings.plan')}
            isOpen={sections[SimulatorSectionKey.Settings]}
            onToggle={() => toggle(SimulatorSectionKey.Settings)}
            variant={CollapsibleVariantType.Panel}
          >
            <div className="mt-2">
              <UnitSettings settings={settings} onChange={setSettings} />
            </div>
          </CollapsibleSection>
        </div>

        {/* 最適編成セクション */}
        <div className={constant.SECTION_DIVIDER}>
          <CollapsibleSection
            title={t('ui.settings.unit_simulator')}
            isOpen={sections[SimulatorSectionKey.Slots]}
            onToggle={() => toggle(SimulatorSectionKey.Slots)}
            variant={CollapsibleVariantType.Panel}
          >
            <div className="mt-2 space-y-4">
              {/* アクションボタン（上部） */}
              <div className="flex gap-2">
                {/* 最適化ボタン（ロック済み以外を最適編成で埋める） */}
                <button
                  onClick={() => {
                    // サポート選択モード中なら解除する
                    if (unitCardSelectMode) {
                      setUnitCardSelectMode(false)
                      targetSlotIndexRef.current = null
                    }
                    optimizeRemaining()
                  }}
                  disabled={isCalculating}
                  title={t('unit.auto_optimize_tip')}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-colors ${
                    isCalculating
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      : 'bg-blue-500 text-white hover:bg-blue-600 active:bg-blue-700'
                  }`}
                >
                  {isCalculating ? t('unit.calculating') : t('unit.auto_optimize')}
                </button>
              </div>

              {/* 候補なし警告 */}
              {noCandidates && (
                <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700">
                  {t('unit.no_candidates')}
                </div>
              )}

              {/* スロットエディター（結果表示時は非表示） */}
              {result === null && (
                <UnitSlotEditor
                  cards={settings.manualCards}
                  onRemoveCard={handleRemoveCard}
                  onStartSelect={handleSlotSelect}
                  selectMode={unitCardSelectMode}
                  rentalCardName={settings.rentalCardName}
                />
              )}

              {/* 計算結果 */}
              {result !== null && (
                <UnitResult
                  result={result}
                  lockedCards={settings.lockedCards}
                  customizedCardNames={customizedCardNames}
                  onToggleLock={handleToggleLock}
                  onRemove={handleRemoveCard}
                  cardCountCustom={countCustom.cardCountCustom}
                  onSelfTriggerChange={countCustom.setSelfTrigger}
                  onRemoveSelfTrigger={countCustom.removeSelfTrigger}
                  onPItemCountChange={countCustom.setPItemCount}
                  onRemovePItemCount={countCustom.removePItemCount}
                  onClearCardCustom={countCustom.clearCardCustom}
                  scenario={scoreSettings.scenario}
                  difficulty={scoreSettings.difficulty}
                  scheduleSelections={scoreSettings.scheduleSelections}
                  initialParams={settings.initialParams}
                  manualCards={settings.manualCards}
                  onStartSelect={handleSlotSelect}
                  selectMode={unitCardSelectMode}
                />
              )}

              {/* 計算結果なし */}
              {result === null && hasCalculated && !isCalculating && (
                <div className="text-center py-4">
                  <p className="text-xs text-slate-500">{t('unit.no_result')}</p>
                </div>
              )}
            </div>
          </CollapsibleSection>
        </div>
      </div>
    </SidePanelLayout>
  )
}
