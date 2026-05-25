/**
 * 最適編成計算結果の表示コンポーネント
 *
 * 最適編成の合計スコア、6枚のサポート一覧、
 * パラメータボーナス内訳を表示する。
 */
import { useTranslation } from 'react-i18next'
import { useCallback, useMemo, useState } from 'react'

import * as constant from '../../constant'
import { PlusIcon } from '../ui/icons'
import UnitCardItem from './UnitCardItem'
import * as enums from '../../types/enums'
import type { ActionIdType, ScenarioType, DifficultyType, ActivityIdType } from '../../types/enums'
import { getClassParameterTotal, getExamData, getHifSelectionExamData, getSpLessonTotal } from '../../data/score'
import { resolveParamCap } from '../../data/score/paramCap'
import type { CardCountCustom } from '../../hooks/useCardCountCustom'
import type { UnitResult as UnitResultType, ParameterValues } from '../../types/unit'
import { UnitResultBreakdown } from './UnitResultBreakdown'

/** UnitResult に渡すプロパティ */
interface UnitResultProps {
  /** 計算結果 */
  result: UnitResultType
  /** 固定サポート名リスト */
  lockedCards: string[]
  /** 回数調整が設定されているサポート名 */
  customizedCardNames: ReadonlySet<string>
  /** 固定トグルコールバック */
  onToggleLock: (cardName: string) => void
  /** サポート削除コールバック */
  onRemove: (cardName: string) => void
  /** サポート別回数調整 */
  cardCountCustom: CardCountCustom
  /** 自動カウント（selfBonus）の回数調整を設定する */
  onSelfTriggerChange: (cardName: string, actionId: ActionIdType, count: number) => void
  /** 自動カウントの回数調整を個別に削除する */
  onRemoveSelfTrigger: (cardName: string, actionId: ActionIdType) => void
  /** Pアイテム発動回数の回数調整を設定する */
  onPItemCountChange: (cardName: string, actionId: ActionIdType, count: number) => void
  /** Pアイテム発動回数の回数調整を個別に削除する */
  onRemovePItemCount: (cardName: string, actionId: ActionIdType) => void
  /** サポート別の回数調整をリセットする */
  onClearCardCustom: (cardName: string) => void
  /** シナリオ種別（試験上昇量の算出に使用） */
  scenario: ScenarioType
  /** 難易度（試験上昇量の算出に使用） */
  difficulty: DifficultyType
  /** スケジュール選択（SPレッスン計算に使用） */
  scheduleSelections: Record<number, ActivityIdType>
  /** HIF選抜試験3回分のVo:Da:Vi配分比率（x:y:z） */
  hifExamRatios?: ParameterValues[]
  /** カスタムモードか（true の場合は classTotal の代わりに customClassBonus を使う） */
  useCustomMode: boolean
  /** カスタムモードでの授業パラメータ上昇量 */
  customClassBonus: ParameterValues
  /** カスタムモードでの試験などパラメータボーナス対象外の上昇量 */
  customNonBonusGain: ParameterValues
  /** 初期パラメータ（プロデュース開始時のアイドルステータス） */
  initialParams: ParameterValues
  /** パラメータ上限の上書き設定 */
  paramCapOverride: number | null | undefined
  /** スロットごとのサポート名（null = 空き枠） */
  manualCards: (string | null)[]
  /** 一覧選択モードの開始コールバック（空き枠のスロットインデックスを渡す） */
  onStartSelect: (slotIndex: number) => void
  /** 一覧選択モード中か */
  selectMode: boolean
  /** 最適化計算中か（計算中は表示順をレンタル末尾で固定する） */
  isCalculating: boolean
}

/**
 * ユニット計算結果を表示する
 *
 * @param props - コンポーネントプロパティ
 * @returns 結果表示要素
 */
export default function UnitResult({
  result,
  lockedCards,
  customizedCardNames,
  onToggleLock,
  onRemove,
  cardCountCustom,
  onSelfTriggerChange,
  onRemoveSelfTrigger,
  onPItemCountChange,
  onRemovePItemCount,
  onClearCardCustom,
  scenario,
  difficulty,
  scheduleSelections,
  hifExamRatios,
  useCustomMode,
  customClassBonus,
  customNonBonusGain,
  initialParams,
  paramCapOverride,
  manualCards,
  onStartSelect,
  selectMode,
  isCalculating,
}: UnitResultProps) {
  const { t } = useTranslation()
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({})

  /** サポート展開のトグル */
  const handleToggleExpand = useCallback((name: string) => {
    setExpandedCards((prev) => {
      const next = { ...prev }
      if (next[name]) {
        delete next[name]
      } else {
        next[name] = true
      }
      return next
    })
  }, [])

  // スロット順でサポート/空き枠を表示する
  const displayItems = useMemo(() => {
    if (isCalculating) {
      const inOrder: Array<(typeof result.members)[number] | null> = [
        ...result.members.filter((m) => !m.isRental),
        ...result.members.filter((m) => m.isRental),
      ]
      while (inOrder.length < constant.UNIT_SIZE) inOrder.push(null)
      return inOrder
    }
    const byName = new Map(result.members.map((m) => [m.card.name, m]))
    const padded = [...manualCards]
    while (padded.length < constant.UNIT_SIZE) padded.push(null)
    return padded.map((name) => (name ? (byName.get(name) ?? null) : null))
  }, [result, manualCards, isCalculating])

  // サポート外パラボ（基礎値 × サポート外% で直接計算）
  const outsideParamBonus = useMemo(
    () => ({
      vocal: Math.floor(
        (result.parameterBonusBase.vocal * result.outsideParamBonusPercent.vocal) / constant.PERCENT_DIVISOR,
      ),
      dance: Math.floor(
        (result.parameterBonusBase.dance * result.outsideParamBonusPercent.dance) / constant.PERCENT_DIVISOR,
      ),
      visual: Math.floor(
        (result.parameterBonusBase.visual * result.outsideParamBonusPercent.visual) / constant.PERCENT_DIVISOR,
      ),
    }),
    [result.parameterBonusBase, result.outsideParamBonusPercent],
  )

  /** スコア内訳の展開トグル */
  const [showBreakdown, setShowBreakdown] = useState(false)
  const handleToggleBreakdown = useCallback(() => setShowBreakdown((prev) => !prev), [])

  // サポート点数合計（VoDaVi別）: サポートパラボを含む全効果 + サポート間連携を parameter_type で集計
  const supportScore = useMemo(() => {
    const sum = { vocal: 0, dance: 0, visual: 0 }
    for (const m of result.members) {
      const key = m.card.parameter_type as keyof typeof sum
      if (key in sum) {
        sum[key] += m.result.totalIncrease + m.supportSynergy
      }
    }
    return sum
  }, [result.members])

  // SPレッスン上昇量（VoDaVi別）
  const spLesson = useMemo(
    () => getSpLessonTotal(scenario, difficulty, scheduleSelections),
    [scenario, difficulty, scheduleSelections],
  )

  // カスタムモードでは手入力した対象上昇値、通常モードではSPレッスン上昇値を内訳表示に使う
  const targetGain = useMemo(
    () => (useCustomMode ? result.parameterBonusBase : spLesson),
    [useCustomMode, result.parameterBonusBase, spLesson],
  )

  // 授業パラメータ上昇量（VoDaVi別）
  const classParams = useMemo(
    () =>
      useCustomMode
        ? { vocal: 0, dance: 0, visual: 0 }
        : getClassParameterTotal(scenario, difficulty, scheduleSelections),
    [useCustomMode, scenario, difficulty, scheduleSelections],
  )

  // 試験上昇量（中間・最終 別）。HIF は選抜試験（hifSelectionExams）で管理するため 0 固定
  const examData = useMemo(
    () =>
      useCustomMode || scenario === enums.ScenarioType.Hif
        ? {
            mid: { vocal: 0, dance: 0, visual: 0 },
            final: { vocal: 0, dance: 0, visual: 0 },
          }
        : getExamData(scenario, difficulty),
    [useCustomMode, scenario, difficulty],
  )

  // HIF選抜試験（3回分）は通常試験と別表示するため、専用配列で合算用に保持する。
  const hifSelectionExams = useMemo(
    () => (useCustomMode || scenario !== enums.ScenarioType.Hif ? [] : getHifSelectionExamData(hifExamRatios)),
    [useCustomMode, scenario, hifExamRatios],
  )

  /** VoDaVi 3軸の合計を返す */
  const pvSum = (a: ParameterValues, ...rest: ParameterValues[]): ParameterValues => {
    const r = { ...a }
    for (const v of rest) {
      r.vocal += v.vocal
      r.dance += v.dance
      r.visual += v.visual
    }
    return r
  }

  // VoDaVi 合計（初期パラメータ + 対象上昇 + 授業 + 試験 + サポート + パラボ）
  const breakdownTotal = useMemo(() => {
    const customNonBonusTotal = useCustomMode ? pvSum(customClassBonus, customNonBonusGain) : classParams
    const hifExamTotal =
      !useCustomMode && scenario === enums.ScenarioType.Hif
        ? pvSum({ vocal: 0, dance: 0, visual: 0 }, ...hifSelectionExams)
        : { vocal: 0, dance: 0, visual: 0 }

    const breakdownTotal = pvSum(
      initialParams,
      targetGain,
      examData.mid,
      examData.final,
      hifExamTotal,
      supportScore,
      outsideParamBonus,
      customNonBonusTotal,
    )
    return breakdownTotal
  }, [
    initialParams,
    targetGain,
    examData,
    supportScore,
    outsideParamBonus,
    useCustomMode,
    customClassBonus,
    customNonBonusGain,
    classParams,
    scenario,
    hifSelectionExams,
  ])

  // シナリオ×難易度に応じたパラメータ上限キャップ
  const paramCap = useMemo(
    () => resolveParamCap(scenario, difficulty, paramCapOverride),
    [scenario, difficulty, paramCapOverride],
  )
  const cappedTotal = useMemo(() => {
    if (paramCap === null) return breakdownTotal
    return {
      vocal: Math.min(breakdownTotal.vocal, paramCap),
      dance: Math.min(breakdownTotal.dance, paramCap),
      visual: Math.min(breakdownTotal.visual, paramCap),
    }
  }, [paramCap, breakdownTotal])

  // 全合計（VoDaVi合計）
  const grandTotal = cappedTotal.vocal + cappedTotal.dance + cappedTotal.visual

  return (
    <div className="space-y-3">
      {/* 合計スコア・内訳テーブル */}
      <UnitResultBreakdown
        useCustomMode={useCustomMode}
        scenario={scenario}
        grandTotal={grandTotal}
        showBreakdown={showBreakdown}
        onToggleBreakdown={handleToggleBreakdown}
        initialParams={initialParams}
        outsideParamBonus={outsideParamBonus}
        targetGain={targetGain}
        customClassBonus={customClassBonus}
        classParams={classParams}
        customNonBonusGain={customNonBonusGain}
        hifSelectionExams={hifSelectionExams}
        examData={examData}
        supportScore={supportScore}
        breakdownTotal={breakdownTotal}
        cappedTotal={cappedTotal}
      />

      {/* サポート一覧（スロット順） */}
      <div className="grid grid-cols-1 gap-1.5">
        {displayItems.map((member, i) =>
          member ? (
            <UnitCardItem
              key={member.card.name}
              member={member}
              isLocked={lockedCards.includes(member.card.name)}
              hasCustom={customizedCardNames.has(member.card.name)}
              onToggleLock={onToggleLock}
              onRemove={onRemove}
              expanded={!!expandedCards[member.card.name]}
              onToggleExpand={handleToggleExpand}
              cardCustom={cardCountCustom[member.card.name] ?? {}}
              onSelfTriggerChange={onSelfTriggerChange}
              onRemoveSelfTrigger={onRemoveSelfTrigger}
              onPItemCountChange={onPItemCountChange}
              onRemovePItemCount={onRemovePItemCount}
              onClearCustom={onClearCardCustom}
            />
          ) : (
            <button
              key={`empty-${i}`}
              onClick={() => onStartSelect(i)}
              className={`w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg border-2 border-dashed transition-colors ${
                selectMode
                  ? 'border-blue-300 bg-blue-50 text-blue-600'
                  : 'border-slate-200 bg-slate-50 text-slate-400 hover:border-slate-300 hover:bg-slate-100'
              }`}
            >
              <PlusIcon className="w-4 h-4" />
              <span className="text-xs font-bold">{t('unit.slot_empty')}</span>
            </button>
          ),
        )}
      </div>
    </div>
  )
}
