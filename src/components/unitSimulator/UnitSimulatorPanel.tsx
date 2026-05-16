/**
 * 最適編成パネルコンポーネント
 *
 * 点数設定パネルと同じ UX（右パネル展開 + アコーディオン折りたたみ）で
 * 最適編成を表示する。
 */
import { useTranslation } from 'react-i18next'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { SidePanelLayout } from '../ui/SidePanelLayout'
import CollapsibleSection from '../ui/CollapsibleSection'
import CloseButton from '../ui/CloseButton'
import { HelpTooltip } from '../ui/HelpTooltip'
import UnitSettings from './UnitSettings'
import UnitResult from './UnitResult'
import UnitSlotEditor from './UnitSlotEditor'
import { useUnitSimulator } from '../../hooks/useUnitSimulator'
import type { CardCountCustomState } from '../../hooks/useCardCountCustom'
import { ButtonSizeType, CollapsibleVariantType, PlanType, UncapType } from '../../types/enums'
import type { SupportCard, ScoreSettings } from '../../types/card'
import * as constant from '../../constant'
import { resolveParamCap } from '../../data/score/paramCap'

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
  /** 回数調整（Appと共有） */
  countCustom: CardCountCustomState
  /** スコア設定（Appと共有） */
  scoreSettings: ScoreSettings
  /** 全サポート一覧（ユーザー追加カード含む） */
  allCards: SupportCard[]
  /** サポート名→サポートのマップ（ユーザー追加カード含む） */
  allCardByName: Map<string, SupportCard>
  /** サポート凸数マップ（未所持判定に使用） */
  cardUncaps: Record<string, UncapType>
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
  allCards,
  allCardByName,
  cardUncaps,
}: UnitSimulatorPanelProps) {
  const { t } = useTranslation()
  const {
    settings,
    setSettings,
    optimizeRemaining,
    cancelOptimize,
    recalculateScores,
    evaluateCurrentCards,
    isCalculating,
    result,
    hasCalculated,
    noCandidates,
    exhaustiveProgress,
  } = useUnitSimulator(allCards, allCardByName)

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
      // 末尾スロットが変わったら rentalCardName を更新する（manualRental に関わらず）
      const newRentalName = padded[constant.UNIT_SIZE - 1] !== null ? padded[constant.UNIT_SIZE - 1] : s.rentalCardName
      setSettingsRef.current({ ...s, manualCards: padded, rentalCardName: newRentalName })
      if (padded.filter((n) => n !== null).length >= constant.UNIT_SIZE) setUnitCardSelectMode(false)
    }
    registerAddManualCard(addCard)
    return () => registerAddManualCard(null)
  }, [registerAddManualCard, setUnitCardSelectMode])

  // cardUncaps を ref で保持して isEligible から参照できるようにする
  const cardUncapsRef = useRef(cardUncaps)
  useEffect(() => {
    cardUncapsRef.current = cardUncaps
  }, [cardUncaps])

  // サポート選択可否判定関数を親に登録する（プラン・重複チェック・未所持チェック）
  // allowedTypes は最適化専用フィルタのため、手動編成では適用しない
  useEffect(() => {
    const isEligible = (card: SupportCard) => {
      const s = settingsRef.current
      // プラン判定: Free はどのプランでも選択可能
      if (card.plan !== PlanType.Free && card.plan !== s.plan) return false
      // 既に選択済みのサポートは選択不可
      if (s.manualCards.includes(card.name)) return false
      // レンタル枠以外では未所持サポートは選択不可
      // targetSlotIndexRef が null（連続選択中など）の場合は次に埋まる枠を計算する
      const padded = [...s.manualCards]
      while (padded.length < constant.UNIT_SIZE) padded.push(null)
      const effectiveTargetIdx = targetSlotIndexRef.current !== null ? targetSlotIndexRef.current : padded.indexOf(null)
      const isRentalSlot = effectiveTargetIdx === constant.UNIT_SIZE - 1
      // 4凸固定モード（useFixedUncap）のときは未所持チェックをスキップする
      if (!isRentalSlot && !scoreSettings.useFixedUncap && cardUncapsRef.current[card.name] === UncapType.NotOwned)
        return false
      return true
    }
    registerIsCardEligible(isEligible)
    return () => registerIsCardEligible(null)
  }, [registerIsCardEligible, settings.plan, settings.manualCards, scoreSettings.useFixedUncap])

  // 点数詳細の発動回数回数調整変更時にスコアのみ自動再計算する
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

  // 点数詳細で発動回数をユーザーが手動変更（回数調整）しているサポート名のセット
  // サポート一覧でバッジ表示するために使用する
  const customizedCardNames = useMemo(
    () => new Set(Object.keys(countCustom.cardCountCustom)),
    [countCustom.cardCountCustom],
  )

  // シナリオ既定値とユーザー上書きを解決した最終的なパラメータ上限値
  const resolvedParamCap = useMemo(
    () => resolveParamCap(scoreSettings.scenario, scoreSettings.difficulty, settings.paramCapOverride),
    [scoreSettings.scenario, scoreSettings.difficulty, settings.paramCapOverride],
  )

  // 育成プラン設定セクションの開閉状態
  const [isSettingsOpen, setIsSettingsOpen] = useState(true)

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
      // レンタルカード判定: 末尾スロット（インデックス5）のカードをレンタル枠とする
      const isRentalCard = settings.manualCards[constant.UNIT_SIZE - 1] === cardName
      if (isRentalCard) {
        const nowRentalLocked = settings.manualRental && settings.rentalCardName === cardName
        if (nowRentalLocked) {
          setSettings({ ...settings, manualRental: false, rentalCardName: null })
        } else {
          setSettings({ ...settings, manualRental: true, rentalCardName: cardName })
        }
        return
      }
      // 通常カードの固定アイコン: lockedCards をトグルする
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
      // 末尾スロットのカードを削除したとき rentalCardName とロック状態をクリアする
      const isRentalSlot = settings.manualCards[constant.UNIT_SIZE - 1] === name
      setSettings({
        ...settings,
        manualCards: nextCards,
        lockedCards: nextLocked,
        manualRental: isRentalSlot ? false : settings.manualRental,
        rentalCardName: isRentalSlot ? null : settings.rentalCardName,
      })
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
            title={
              <>
                {t('unit.settings.title')} <HelpTooltip text={t('unit.settings.title_tip')} />
              </>
            }
            isOpen={isSettingsOpen}
            onToggle={() => setIsSettingsOpen((prev) => !prev)}
            variant={CollapsibleVariantType.Panel}
          >
            <div className="mt-2">
              <UnitSettings
                settings={settings}
                onChange={setSettings}
                scenario={scoreSettings.scenario}
                resolvedParamCap={resolvedParamCap}
              />
            </div>
          </CollapsibleSection>
        </div>

        {/* 最適編成セクション */}
        <div className={constant.SECTION_DIVIDER}>
          <div className="flex items-center gap-1.5 w-full text-left text-xs font-black text-slate-500 uppercase tracking-widest py-1">
            {t('ui.settings.unit_simulator')}
          </div>
          <div className="mt-2 space-y-4">
            {/* アクションボタン（上部） */}
            <div className="flex gap-2">
              {/* 最適化ボタン（ロック済み以外を最適編成で埋める） */}
              <button
                onClick={() => {
                  if (isCalculating) {
                    if (window.confirm(t('unit.cancel_confirm'))) {
                      cancelOptimize()
                    }
                    return
                  }
                  // サポート選択モード中なら解除する
                  if (unitCardSelectMode) {
                    setUnitCardSelectMode(false)
                    targetSlotIndexRef.current = null
                  }
                  optimizeRemaining()
                }}
                title={t('unit.auto_optimize_tip')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-colors ${
                  isCalculating
                    ? 'bg-amber-500 text-white hover:bg-amber-600 active:bg-amber-700'
                    : 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800'
                }`}
              >
                {isCalculating && exhaustiveProgress !== null
                  ? t('unit.progress_count', {
                      done: exhaustiveProgress.done.toLocaleString(),
                      total: exhaustiveProgress.total.toLocaleString(),
                    })
                  : isCalculating
                    ? t('unit.calculating')
                    : t('unit.auto_optimize')}
              </button>
            </div>

            {/* 候補なし警告 */}
            {noCandidates && (
              <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700">
                {t('unit.no_candidates')}
              </div>
            )}

            {/* スロットエディター（結果表示時は非表示） */}
            {!isCalculating && result === null && (
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
                lockedCards={[
                  ...settings.lockedCards,
                  // レンタル固定中のカードも isLocked として表示する
                  ...(settings.manualRental && settings.rentalCardName ? [settings.rentalCardName] : []),
                ]}
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
                useCustomMode={scoreSettings.useCustomMode}
                customClassBonus={scoreSettings.customClassBonus}
                customNonBonusGain={scoreSettings.customNonBonusGain}
                initialParams={settings.initialParams}
                paramCapOverride={settings.paramCapOverride}
                manualCards={settings.manualCards}
                onStartSelect={handleSlotSelect}
                selectMode={unitCardSelectMode}
                isCalculating={isCalculating}
              />
            )}

            {/* 計算結果なし */}
            {result === null && hasCalculated && !isCalculating && (
              <div className="text-center py-4">
                <p className="text-xs text-slate-500">{t('unit.no_result')}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </SidePanelLayout>
  )
}
