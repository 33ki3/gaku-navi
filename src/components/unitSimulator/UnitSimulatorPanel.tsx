/**
 * 最適編成パネル。
 *
 * パネルのレイアウトと各機能の組み合わせだけを担当し、手動選択・再計算同期・設定・結果表示は専用hook／コンポーネントへ委譲する。
 */
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import * as constant from '../../constant'
import * as data from '../../data'
import type { CardCountCustomState } from '../../hooks/useCardCountCustom'
import { useManualUnitSelection } from '../../hooks/useManualUnitSelection'
import { useUnitResultSync } from '../../hooks/useUnitResultSync'
import { useUnitSimulator } from '../../hooks/useUnitSimulator'
import type { CardListModeController } from '../../types/app'
import type { ScoreSettings, SupportCard } from '../../types/card'
import * as enums from '../../types/enums'
import CloseButton from '../ui/CloseButton'
import CollapsibleSection from '../ui/CollapsibleSection'
import { HelpTooltip } from '../ui/HelpTooltip'
import { PanelSwitcher } from '../ui/PanelSwitcher'
import { SidePanelLayout } from '../ui/SidePanelLayout'
import { UnitOptimizationSection } from './UnitOptimizationSection'
import UnitSettings from './UnitSettings'

interface UnitSimulatorPanelProps {
  /** パネルが開いているか */
  isOpen: boolean
  /** パネルを閉じる関数 */
  onClose: () => void
  /** ピン留めかどうか */
  pinned: boolean
  /** 2枚目パネルとして左側に配置するか */
  secondPanel?: boolean
  /** サポート一覧からカードを追加する関数の登録先 */
  registerAddManualCard: (handler: ((cardName: string) => void) | null) => void
  /** サポート一覧で選択可能か判定する関数の登録先 */
  registerIsCardEligible: (handler: ((card: SupportCard) => boolean) | null) => void
  /** サポート一覧の操作モードと切り替え操作 */
  cardListMode: CardListModeController
  /** サポート別の回数調整 */
  countCustom: CardCountCustomState
  /** 現在の点数設定 */
  scoreSettings: ScoreSettings
  /** ユーザー追加分を含む全サポート */
  allCards: SupportCard[]
  /** サポート名からカードを引くマップ */
  allCardByName: Map<string, SupportCard>
  /** サポートごとの凸数 */
  cardUncaps: Record<string, enums.UncapType>
  /** 手動編成の6枠が埋まったときに呼び出す関数 */
  onManualSelectionComplete?: () => void
  /** スマホ下部メニュー分の余白を確保するか */
  reserveMobileNavSpace?: boolean
  /** 点数設定パネルへ切り替える関数 */
  onSwitchToScoreSettings?: () => void
}

/**
 * 最適編成をサイドパネルまたはスマホオーバーレイとして表示する。
 *
 * @param props - パネル状態、一覧連携、点数設定、カードデータ
 * @returns 最適編成パネル。閉じている場合は何も返さない
 */
export default function UnitSimulatorPanel({
  isOpen,
  onClose,
  pinned,
  secondPanel,
  registerAddManualCard,
  registerIsCardEligible,
  cardListMode,
  countCustom,
  scoreSettings,
  allCards,
  allCardByName,
  cardUncaps,
  onManualSelectionComplete,
  reserveMobileNavSpace,
  onSwitchToScoreSettings,
}: UnitSimulatorPanelProps) {
  const { t } = useTranslation()
  const isUnitCardSelectMode = cardListMode.mode === enums.CardListInteractionModeType.UnitCardSelect
  const isCardExclusionEditMode = cardListMode.mode === enums.CardListInteractionModeType.CardExclusionEdit
  const simulator = useUnitSimulator(allCards, allCardByName, scoreSettings)
  const [isSettingsOpen, setIsSettingsOpen] = useState(true)

  const manualSelection = useManualUnitSelection({
    settings: simulator.settings,
    setSettings: simulator.setSettings,
    registerAddManualCard,
    registerIsCardEligible,
    isUnitCardSelectMode,
    setUnitCardSelectMode: cardListMode.setManualSelection,
    cardUncaps,
    useFixedUncap: scoreSettings.useFixedUncap,
    onClosePanel: onClose,
    onSelectionComplete: onManualSelectionComplete,
  })

  const customizedCardNames = useUnitResultSync({
    result: simulator.result,
    manualCards: simulator.settings.manualCards,
    cardCountCustom: countCustom.cardCountCustom,
    scoreSettings,
    recalculateScores: simulator.recalculateScores,
    evaluateCurrentCards: simulator.evaluateCurrentCards,
  })

  /** シナリオ既定値とユーザー上書きから、実際に使う上限を求める */
  const resolvedParamCap = useMemo(
    () =>
      data.resolveParamCap(
        scoreSettings.scenario,
        scoreSettings.difficulty ?? enums.DifficultyType.None,
        simulator.settings.paramCapOverride,
      ),
    [scoreSettings.scenario, scoreSettings.difficulty, simulator.settings.paramCapOverride],
  )

  // 手動選択を開始する前に除外設定を終了する
  const startManualSelection = (slotIndex: number) => {
    if (isCardExclusionEditMode) cardListMode.toggleExclusion()
    manualSelection.startSlotSelection(slotIndex)
  }

  if (!isOpen && !pinned && cardListMode.mode === enums.CardListInteractionModeType.None) return null

  return (
    <SidePanelLayout
      isOpen={isOpen}
      onClose={onClose}
      pinned={pinned}
      secondPanel={secondPanel}
      scrollStorageKey={constant.UNIT_SIMULATOR_PANEL_SCROLL_KEY}
      reserveMobileNavSpace={reserveMobileNavSpace}
    >
      {/* 最適編成パネルのヘッダーと切り替え操作 */}
      <div className={constant.PANEL_HEADER}>
        <div className={constant.PANEL_HEADER_INNER}>
          {/* 点数設定・最適編成切り替え操作 */}
          <PanelSwitcher
            activePanel={enums.SettingsPanelType.UnitSimulator}
            onSwitchToScore={onSwitchToScoreSettings}
          />
          <h2 className="hidden text-base font-black text-slate-900 md:block">{t('ui.settings.unit_simulator')}</h2>
          {/* 最適編成パネルを閉じるボタン */}
          <CloseButton onClick={onClose} size={enums.ButtonSizeType.Lg} className={constant.PANEL_HEADER_CLOSE} />
        </div>
      </div>

      {/* 最適編成の設定と計算結果のスクロール領域 */}
      <div className="space-y-5 px-5 pb-5 pt-0">
        <div className="pt-3">
          {/* 最適編成設定セクション */}
          <CollapsibleSection
            title={
              <>
                {t('unit.settings.title')} <HelpTooltip text={t('unit.settings.title_tip')} />
              </>
            }
            isOpen={isSettingsOpen}
            onToggle={() => setIsSettingsOpen((open) => !open)}
            variant={enums.CollapsibleVariantType.Panel}
          >
            <div className="mt-2">
              {/* 最適編成の設定項目 */}
              <UnitSettings
                settings={simulator.settings}
                onChange={simulator.setSettings}
                resolvedParamCap={resolvedParamCap}
                isCardExclusionEditMode={isCardExclusionEditMode}
                onToggleCardExclusionMode={cardListMode.toggleExclusion}
              />
            </div>
          </CollapsibleSection>
        </div>

        {/* 最適編成の計算操作と結果 */}
        <UnitOptimizationSection
          simulator={simulator}
          manualSelection={{
            active: isUnitCardSelectMode,
            setActive: cardListMode.setManualSelection,
            startSlotSelection: startManualSelection,
            clearTargetSlot: manualSelection.clearTargetSlot,
          }}
          scoreSettings={scoreSettings}
          countCustom={countCustom}
          customizedCardNames={customizedCardNames}
          allCardByName={allCardByName}
        />
      </div>
    </SidePanelLayout>
  )
}
