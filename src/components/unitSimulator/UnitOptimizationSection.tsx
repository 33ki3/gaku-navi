/**
 * 最適編成の計算操作・スロット編集・結果表示を担当する。
 * パネルのレイアウトや設定アコーディオンは親へ任せ、計算に直接関係する
 * 表示だけをまとめる
 */
import { useTranslation } from 'react-i18next'
import * as constant from '../../constant'
import type { CardCountCustomState } from '../../hooks/useCardCountCustom'
import type { ScoreSettings, SupportCard } from '../../types/card'
import * as enums from '../../types/enums'
import type { ExhaustiveProgress, UnitResult, UnitSimulatorSettings } from '../../types/unit'
import { hasAllScheduleSelections } from '../../utils/scoreSettings'
import { HelpTooltip } from '../ui/HelpTooltip'
import { OptimizeUnitButton } from './OptimizeUnitButton'
import UnitResultView from './UnitResult'
import UnitSlotEditor from './UnitSlotEditor'

interface UnitOptimizationState {
  /** 現在の最適編成設定 */
  settings: UnitSimulatorSettings
  /** 最適編成設定を更新する関数 */
  setSettings: (settings: UnitSimulatorSettings) => void
  /** 最適編成を計算する関数 */
  optimizeRemaining: () => void
  /** 計算を中止する関数 */
  cancelOptimize: () => void
  /** 計算中か */
  isCalculating: boolean
  /** 現在の計算結果 */
  result: UnitResult | null
  /** 一度でも計算したか */
  hasCalculated: boolean
  /** 条件に合う候補がなかったか */
  noCandidates: boolean
  /** 総当たり計算の進捗 */
  exhaustiveProgress: ExhaustiveProgress | null
}

interface ManualSelectionState {
  /** サポート一覧で選択中か */
  active: boolean
  /** サポート一覧の選択状態を切り替える */
  setActive: (active: boolean) => void
  /** 指定したスロットの選択を始める */
  startSlotSelection: (slotIndex: number) => void
  /** 選択対象スロットを解除する */
  clearTargetSlot: () => void
}

interface UnitOptimizationSectionProps {
  /** 最適編成の状態と操作 */
  simulator: UnitOptimizationState
  /** 手動選択の状態と操作 */
  manualSelection: ManualSelectionState
  /** 現在の点数設定 */
  scoreSettings: ScoreSettings
  /** サポート別の回数調整 */
  countCustom: CardCountCustomState
  /** 回数調整されているサポート名 */
  customizedCardNames: Set<string>
  /** ユーザー追加分を含むサポート名マップ */
  allCardByName: ReadonlyMap<string, SupportCard>
}

/**
 * 最適編成の実行から結果編集までをまとめて表示する
 *
 * @param props - 最適編成、手動選択、点数設定、回数調整の状態
 * @returns 最適編成の計算・結果セクション
 */
export function UnitOptimizationSection({
  simulator,
  manualSelection,
  scoreSettings,
  countCustom,
  customizedCardNames,
  allCardByName,
}: UnitOptimizationSectionProps) {
  const { t } = useTranslation()
  const { settings } = simulator
  // 結果がある間は結果領域を残し、手動変更直後の高さ変化とスクロール跳ねを防ぐ
  const showManualEditor = simulator.result === null
  const showResult = simulator.result !== null

  /** 手動選択を終了してから最適編成を開始する */
  const optimize = () => {
    if (manualSelection.active) {
      manualSelection.setActive(false)
      manualSelection.clearTargetSlot()
    }
    simulator.optimizeRemaining()
  }

  /** 通常枠とレンタル枠それぞれの固定状態を切り替える */
  const toggleLock = (cardName: string) => {
    const isRentalCard = settings.manualCards[constant.UNIT_SIZE - 1] === cardName
    if (isRentalCard) {
      const isLocked = settings.manualRental && settings.rentalCardName === cardName
      simulator.setSettings({
        ...settings,
        manualRental: !isLocked,
        rentalCardName: isLocked ? null : cardName,
      })
      return
    }

    const lockedCards = settings.lockedCards.includes(cardName)
      ? settings.lockedCards.filter((name) => name !== cardName)
      : [...settings.lockedCards, cardName]
    simulator.setSettings({ ...settings, lockedCards })
  }

  /** カードをスロットから外し、関連する固定状態も解除する */
  const removeCard = (cardName: string) => {
    const isRentalCard = settings.manualCards[constant.UNIT_SIZE - 1] === cardName
    simulator.setSettings({
      ...settings,
      manualCards: settings.manualCards.map((name) => (name === cardName ? null : name)),
      lockedCards: settings.lockedCards.filter((name) => name !== cardName),
      manualRental: isRentalCard ? false : settings.manualRental,
      rentalCardName: isRentalCard ? null : settings.rentalCardName,
    })
  }

  const lockedCards = [
    ...settings.lockedCards,
    ...(settings.manualRental && settings.rentalCardName ? [settings.rentalCardName] : []),
  ]
  const difficulty = scoreSettings.difficulty ?? enums.DifficultyType.None

  return (
    <div className={constant.SECTION_DIVIDER}>
      {/* 計算操作・警告・編成結果セクション */}
      <div className="flex w-full items-center gap-1.5 py-1 text-left text-xs font-black uppercase tracking-widest text-slate-500">
        {t('ui.settings.unit_simulator')}
        <HelpTooltip text={t('unit.auto_optimize_section_tip')} />
      </div>
      <div className="mt-2 space-y-4">
        <div className="flex gap-2">
          {/* 最適編成の計算ボタン */}
          <OptimizeUnitButton
            isCalculating={simulator.isCalculating}
            exhaustiveProgress={simulator.exhaustiveProgress}
            onOptimize={optimize}
            onCancel={simulator.cancelOptimize}
          />
        </div>
        {/* スケジュール不足は計算前に警告し、設定へ戻る判断材料を示す */}
        {!hasAllScheduleSelections(scoreSettings) && (
          <div className="whitespace-pre-line rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
            {t('unit.schedule_incomplete_warning')}
          </div>
        )}
        {/* 最適編成の候補なし警告 */}
        {simulator.noCandidates && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
            {t('unit.no_candidates')}
          </div>
        )}

        {/* 手動編成スロット編集欄（計算結果がまだない場合） */}
        {showManualEditor && (
          /* 手動編成スロット編集欄 */
          <UnitSlotEditor
            cards={settings.manualCards}
            cardByName={allCardByName}
            onRemoveCard={removeCard}
            onStartSelect={manualSelection.startSlotSelection}
            selectMode={manualSelection.active}
            rentalCardName={settings.rentalCardName}
          />
        )}

        {/* 手動変更中・計算中も結果領域を残し、合計値・各カードの点数を一時的に消さない */}
        {showResult && simulator.result && (
          /* 最適編成計算結果 */
          <UnitResultView
            result={simulator.result}
            lockedCards={lockedCards}
            customizedCardNames={customizedCardNames}
            onToggleLock={toggleLock}
            onRemove={removeCard}
            cardCountCustom={countCustom.cardCountCustom}
            onSelfTriggerChange={countCustom.setSelfTrigger}
            onRemoveSelfTrigger={countCustom.removeSelfTrigger}
            onPItemCountChange={countCustom.setPItemCount}
            onRemovePItemCount={countCustom.removePItemCount}
            onClearCardCustom={countCustom.clearCardCustom}
            scenario={scoreSettings.scenario}
            difficulty={difficulty}
            scheduleSelections={scoreSettings.scheduleSelections}
            hifExamRatios={scoreSettings.hifExamRatios}
            useCustomMode={scoreSettings.useCustomMode}
            customClassBonus={scoreSettings.customClassBonus}
            customNonBonusGain={scoreSettings.customNonBonusGain}
            initialParams={settings.initialParams}
            paramCapOverride={settings.paramCapOverride}
            manualCards={settings.manualCards}
            onStartSelect={manualSelection.startSlotSelection}
            selectMode={manualSelection.active}
            isCalculating={simulator.isCalculating}
          />
        )}
        {/* 計算済みだが結果が見つからない場合は、再計算を促す */}
        {simulator.result === null && simulator.hasCalculated && !simulator.isCalculating && (
          <div className="py-4 text-center">
            <p className="text-xs text-slate-500">{t('unit.no_result')}</p>
          </div>
        )}
      </div>
    </div>
  )
}
