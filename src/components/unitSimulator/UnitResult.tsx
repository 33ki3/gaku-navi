/**
 * 最適編成計算結果の表示コンポーネント
 *
 * 最適編成の合計スコア、6枚のサポート一覧、
 * パラメータボーナス内訳を表示する。
 */
import { useTranslation } from 'react-i18next'
import { useCallback, useMemo, useState } from 'react'

import * as constant from '../../constant'
import UnitCardItem from './UnitCardItem'
import BreakdownRow from './BreakdownRow'
import { AbilityNameKeyType } from '../../types/enums'
import type { ActionIdType, ScenarioType, DifficultyType, ActivityIdType } from '../../types/enums'
import { SelectableTypeEntries } from '../../data/card'
import { getClassTotal, getExamData, getSpLessonTotal } from '../../data/score'
import type { CardCountCustom } from '../../hooks/useCardCountCustom'
import type { UnitResult as UnitResultType, ParameterValues } from '../../types/unit'

/** UnitResult に渡すプロパティ */
interface UnitResultProps {
  /** 計算結果 */
  result: UnitResultType
  /** 固定サポート名リスト */
  lockedCards: string[]
  /** カウント調整が設定されているサポート名 */
  customizedCardNames: ReadonlySet<string>
  /** 固定トグルコールバック */
  onToggleLock: (cardName: string) => void
  /** サポート削除コールバック */
  onRemove: (cardName: string) => void
  /** サポート別カウント調整 */
  cardCountCustom: CardCountCustom
  /** 自動カウント（selfBonus）のカウント調整を設定する */
  onSelfTriggerChange: (cardName: string, actionId: ActionIdType, count: number) => void
  /** 自動カウントのカウント調整を個別に削除する */
  onRemoveSelfTrigger: (cardName: string, actionId: ActionIdType) => void
  /** Pアイテム発動回数のカウント調整を設定する */
  onPItemCountChange: (cardName: string, actionId: ActionIdType, count: number) => void
  /** Pアイテム発動回数のカウント調整を個別に削除する */
  onRemovePItemCount: (cardName: string, actionId: ActionIdType) => void
  /** サポート別のカウント調整をリセットする */
  onClearCardCustom: (cardName: string) => void
  /** シナリオ種別（試験上昇量の算出に使用） */
  scenario: ScenarioType
  /** 難易度（試験上昇量の算出に使用） */
  difficulty: DifficultyType
  /** スケジュール選択（SPレッスン計算に使用） */
  scheduleSelections: Record<number, ActivityIdType>
  /** 初期パラメータ（プロデュース開始時のアイドルステータス） */
  initialParams: ParameterValues
  /** スロットごとのサポート名（null = 空き枠） */
  manualCards: (string | null)[]
  /** 一覧選択モードの開始コールバック（空き枠のスロットインデックスを渡す） */
  onStartSelect: (slotIndex: number) => void
  /** 一覧選択モード中か */
  selectMode: boolean
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
  initialParams,
  manualCards,
  onStartSelect,
  selectMode,
}: UnitResultProps) {
  const { t } = useTranslation()
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set())

  /** サポート展開のトグル */
  const handleToggleExpand = useCallback((name: string) => {
    setExpandedCards((prev) => {
      const next = new Set(prev)
      if (next.has(name)) {
        next.delete(name)
      } else {
        next.add(name)
      }
      return next
    })
  }, [])

  // スロット順でサポート/空き枠を表示する
  const displayItems = useMemo(() => {
    const byName = new Map(result.members.map((m) => [m.card.name, m]))
    const padded = [...manualCards]
    while (padded.length < constant.UNIT_SIZE) padded.push(null)
    return padded.map((name) => (name ? (byName.get(name) ?? null) : null))
  }, [result.members, manualCards])

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

  // サポートカードの初期値上昇合計（VoDaVi別）
  const supportInitialStat = useMemo(() => {
    const sum = { vocal: 0, dance: 0, visual: 0 }
    for (const m of result.members) {
      for (const ab of m.result.abilityBoosts) {
        if (ab.nameKey === AbilityNameKeyType.InitialStat && ab.parameterType) {
          const key = ab.parameterType as keyof typeof sum
          if (key in sum) {
            sum[key] += ab.total
          }
        }
      }
    }
    return sum
  }, [result.members])

  // サポート外初期パラメータ（ユーザー入力値からサポート初期値上昇分を差し引く）
  const outsideInitialParams = useMemo(
    () => ({
      vocal: Math.max(0, initialParams.vocal - supportInitialStat.vocal),
      dance: Math.max(0, initialParams.dance - supportInitialStat.dance),
      visual: Math.max(0, initialParams.visual - supportInitialStat.visual),
    }),
    [initialParams, supportInitialStat],
  )

  // SPレッスン上昇量（VoDaVi別）
  const spLesson = useMemo(
    () => getSpLessonTotal(scenario, difficulty, scheduleSelections),
    [scenario, difficulty, scheduleSelections],
  )

  // 授業パラメータ上昇量（単一値）
  const classTotal = useMemo(
    () => getClassTotal(scenario, difficulty, scheduleSelections),
    [scenario, difficulty, scheduleSelections],
  )

  // 試験上昇量（中間・最終 別）
  const examData = useMemo(() => getExamData(scenario, difficulty), [scenario, difficulty])

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

  // VoDaVi 合計（初期パラメータ + SPレッスン + 試験 + サポート + パラボ）
  const breakdownTotal = useMemo(() => {
    const breakdownTotal = pvSum(
      outsideInitialParams,
      spLesson,
      examData.mid,
      examData.final,
      supportScore,
      outsideParamBonus,
    )
    return breakdownTotal
  }, [outsideInitialParams, spLesson, examData, supportScore, outsideParamBonus])

  // 全合計（VoDaVi合計 + 授業）
  const grandTotal = breakdownTotal.vocal + breakdownTotal.dance + breakdownTotal.visual + classTotal

  return (
    <div className="space-y-3">
      {/* 合計スコア */}
      <div className="bg-slate-50 rounded-lg px-4 py-2.5 cursor-pointer" onClick={handleToggleBreakdown}>
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-400">
            {t('unit.result.total_score')}
            {classTotal > 0 && (
              <span className="text-[10px] font-bold text-slate-400 ml-0.5">
                （{t('unit.result.breakdown_class')}
                {t('ui.symbol.plus')}
                {classTotal.toLocaleString()}）
              </span>
            )}
          </span>
          <span className="text-lg font-black text-slate-800">{grandTotal.toLocaleString()}</span>
        </div>
        {/* スコア内訳（VoDaVi別） */}
        {showBreakdown && (
          <div className="mt-2 border-t border-slate-200 pt-2">
            {/* ヘッダー行 */}
            <div className="grid grid-cols-4 gap-1 mb-1">
              <span />
              {SelectableTypeEntries.map((entry) => (
                <span key={entry.parameterType} className={`text-[10px] font-bold text-center ${entry.text}`}>
                  {t(entry.displayLabel)}
                </span>
              ))}
            </div>
            {/* 初期パラ */}
            <BreakdownRow label={t('unit.result.breakdown_initial_params')} values={outsideInitialParams} />
            {/* サポート外パラボ */}
            <BreakdownRow label={t('unit.result.breakdown_param_bonus')} values={outsideParamBonus} />
            {/* SPレッスン */}
            <BreakdownRow label={t('unit.result.breakdown_sp_lesson')} values={spLesson} />
            {/* 中間試験 */}
            <BreakdownRow label={t('unit.result.breakdown_mid_exam')} values={examData.mid} />
            {/* 最終試験 */}
            <BreakdownRow label={t('unit.result.breakdown_final_exam')} values={examData.final} />
            {/* サポート */}
            <BreakdownRow label={t('unit.result.breakdown_support')} values={supportScore} />
            {/* 合計行 */}
            <div className="grid grid-cols-4 gap-1 border-t border-slate-200 pt-1 mt-1">
              <span className="text-[10px] font-bold text-slate-600 shrink-0">{t('unit.result.breakdown_total')}</span>
              {SelectableTypeEntries.map((entry) => (
                <span key={entry.parameterType} className="text-[10px] font-black text-slate-800 text-center">
                  {breakdownTotal[entry.parameterType].toLocaleString()}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

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
              expanded={expandedCards.has(member.card.name)}
              onToggleExpand={() => handleToggleExpand(member.card.name)}
              cardCustom={cardCountCustom[member.card.name] ?? {}}
              onSelfTriggerChange={(actionId, count) => onSelfTriggerChange(member.card.name, actionId, count)}
              onRemoveSelfTrigger={(actionId) => onRemoveSelfTrigger(member.card.name, actionId)}
              onPItemCountChange={(actionId, count) => onPItemCountChange(member.card.name, actionId, count)}
              onRemovePItemCount={(actionId) => onRemovePItemCount(member.card.name, actionId)}
              onClearCustom={() => onClearCardCustom(member.card.name)}
            />
          ) : (
            <button
              key={`empty-${i}`}
              onClick={() => onStartSelect(i)}
              className={`w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg border-2 border-dashed transition-colors ${
                selectMode
                  ? 'border-blue-300 bg-blue-50 text-blue-500'
                  : 'border-slate-200 bg-slate-50 text-slate-400 hover:border-slate-300 hover:bg-slate-100'
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              <span className="text-xs font-bold">{t('unit.slot_empty')}</span>
            </button>
          ),
        )}
      </div>
    </div>
  )
}
