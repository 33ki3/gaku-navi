/**
 * 最適編成計算結果の表示コンポーネント
 *
 * 最適編成の合計スコア、6枚のサポート一覧、パラメータボーナス内訳を表示する
 */
import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import * as constant from '../../constant'
import * as scoreData from '../../data/score'
import * as paramCapData from '../../data/score/paramCap'
import type { CardCountCustom, ParameterValues } from '../../types/card'
import type { ActionIdType, ActivityIdType, DifficultyType, ScenarioType } from '../../types/enums'
import * as enums from '../../types/enums'
import type { UnitResult as UnitResultType } from '../../types/unit'
import { PlusIcon } from '../ui/icons'
import UnitCardItem from './UnitCardItem'
import { UnitResultBreakdown } from './UnitResultBreakdown'

/** 最適編成結果の表示と操作 */
interface UnitResultProps {
  /** 計算結果 */
  result: UnitResultType
  /** 固定するサポート名一覧 */
  lockedCards: string[]
  /** 回数調整が設定されているサポート名 */
  customizedCardNames: ReadonlySet<string>
  /** 固定状態を切り替える操作 */
  onToggleLock: (cardName: string) => void
  /** 編成からサポートを外す操作 */
  onRemove: (cardName: string) => void
  /** サポート別回数調整 */
  cardCountCustom: CardCountCustom
  /** サポート自身が提供するアクションの回数を変更する操作 */
  onSelfTriggerChange: (cardName: string, actionId: ActionIdType, count: number) => void
  /** サポート自身が提供するアクションの回数設定を削除する操作 */
  onRemoveSelfTrigger: (cardName: string, actionId: ActionIdType) => void
  /** Pアイテムの発動回数を変更する操作 */
  onPItemCountChange: (cardName: string, actionId: ActionIdType, count: number) => void
  /** Pアイテムの発動回数設定を削除する操作 */
  onRemovePItemCount: (cardName: string, actionId: ActionIdType) => void
  /** サポートの回数設定をすべて戻す操作 */
  onClearCardCustom: (cardName: string) => void
  /** シナリオ種別（試験の上昇量を計算するために使う） */
  scenario: ScenarioType
  /** 難易度（試験の上昇量を計算するために使う） */
  difficulty: DifficultyType
  /** スケジュール選択（SPレッスンの計算に使う） */
  scheduleSelections: Record<number, ActivityIdType>
  /** HIF選抜試験3回分のVo:Da:Vi配分比率（x:y:z） */
  hifExamRatios?: ParameterValues[]
  /** HIF公開レッスンをメイン属性だけで選ぶか */
  hifLessonSplitSub?: boolean
  /** カスタムモードか（有効ならカスタムの授業上昇量を使う） */
  useCustomMode: boolean
  /** カスタムモードでの授業パラメータ上昇量 */
  customClassBonus: ParameterValues
  /** カスタムモードでの試験などパラメータボーナス対象外の上昇量 */
  customNonBonusGain: ParameterValues
  /** 初期パラメータ（プロデュース開始時のアイドルステータス） */
  initialParams: ParameterValues
  /** パラメータ上限の上書き設定 */
  paramCapOverride: number | null | undefined
  /** 手動編成の各枠に入っているサポート名（空き枠はnull） */
  selectedCards: (string | null)[]
  /** 一覧から手動編成へ追加する対象スロットを指定する操作 */
  onStartSelect: (slotIndex: number) => void
  /** 一覧からサポートを選択中か */
  selectMode: boolean
  /** 最適化中か（計算結果の表示順をレンタル枠に合わせる） */
  isCalculating: boolean
}

/**
 * ユニット計算結果を表示する
 *
 * @param props - 編成結果、表示条件、固定・削除・回数調整の操作
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
  hifLessonSplitSub = true,
  useCustomMode,
  customClassBonus,
  customNonBonusGain,
  initialParams,
  paramCapOverride,
  selectedCards,
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
    const padded = [...selectedCards]
    while (padded.length < constant.UNIT_SIZE) padded.push(null)
    return padded.map((name) => (name ? (byName.get(name) ?? null) : null))
  }, [result, selectedCards, isCalculating])

  /** スコア内訳の展開トグル */
  const [showBreakdown, setShowBreakdown] = useState(false)
  const handleToggleBreakdown = useCallback(() => setShowBreakdown((prev) => !prev), [])

  // 個別計算のパラボを除き、サポート効果と連携だけを属性別に合計する
  // パラボは編成全体の率で各回を丸めた result.parameterBonus に集約する
  const supportScore = useMemo(() => {
    const sum = { vocal: 0, dance: 0, visual: 0 }
    for (const m of result.members) {
      const key = m.card.parameter_type as keyof typeof sum
      if (key in sum) {
        sum[key] += m.result.totalIncrease - m.result.parameterBonus + m.supportSynergy
      }
    }
    return sum
  }, [result.members])

  // SPレッスン上昇量（VoDaVi別）
  const spLesson = useMemo(
    // HIFのレッスン分割設定を含め、点数設定パネルと同じSPレッスン値を使う
    () => scoreData.getSpLessonTotal(scenario, difficulty, scheduleSelections, hifLessonSplitSub),
    [scenario, difficulty, scheduleSelections, hifLessonSplitSub],
  )

  // カスタムモードでは手入力した上昇値を使う
  // 通常モードではSPレッスンの上昇値を内訳に使う
  const targetGain = useMemo(
    () => (useCustomMode ? result.parameterBonusBase : spLesson),
    [useCustomMode, result.parameterBonusBase, spLesson],
  )

  // 授業パラメータ上昇量（VoDaVi別）
  const classParams = useMemo(
    () =>
      useCustomMode
        ? { vocal: 0, dance: 0, visual: 0 }
        : scoreData.getClassParameterTotal(scenario, difficulty, scheduleSelections),
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
        : scoreData.getExamData(scenario, difficulty),
    [useCustomMode, scenario, difficulty],
  )

  // HIF選抜試験（3回分）は通常試験と別表示するため、専用配列で合算用に保持する
  const hifSelectionExams = useMemo(
    () =>
      useCustomMode || scenario !== enums.ScenarioType.Hif ? [] : scoreData.getHifSelectionExamData(hifExamRatios),
    [useCustomMode, scenario, hifExamRatios],
  )

  // VoDaVi 3軸の合計を返す
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
      result.parameterBonus,
      customNonBonusTotal,
    )
    return breakdownTotal
  }, [
    initialParams,
    targetGain,
    examData,
    supportScore,
    result.parameterBonus,
    useCustomMode,
    customClassBonus,
    customNonBonusGain,
    classParams,
    scenario,
    hifSelectionExams,
  ])

  // シナリオ×難易度に応じたパラメータ上限キャップ
  const paramCap = useMemo(
    () => paramCapData.resolveParamCap(scenario, difficulty, paramCapOverride),
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

  return (
    <div className="space-y-3">
      {/* 合計スコアとパラメータ内訳 */}
      <UnitResultBreakdown
        useCustomMode={useCustomMode}
        scenario={scenario}
        grandTotal={result.totalScore}
        showBreakdown={showBreakdown}
        onToggleBreakdown={handleToggleBreakdown}
        initialParams={initialParams}
        parameterBonus={result.parameterBonus}
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

      {/* スロット順のサポート一覧 */}
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
