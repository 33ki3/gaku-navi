/**
 * アクション回数セクションコンポーネント
 *
 * レッスン・イベント・お出かけなどのアクション回数を
 * グループ別に並べて入力する。
 * スケジュール自動計算が有効なカテゴリはロックされる。
 */
import { useCallback, useEffect, useLayoutEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import * as constant from '../../constant'
import type { ScheduleWeekData } from '../../data'
import * as data from '../../data'
import type { ScoreSettings } from '../../types/card'
import * as enums from '../../types/enums'
import { createDomainDigest } from '../../utils/domainRevision'
import { SpinnerInput } from '../ui/SpinnerInput'

const ACTION_COUNT_SAVE_DEBOUNCE_MS = 150

/** ActionCountsSection コンポーネントに渡すプロパティ */
interface ActionCountsSectionProps {
  /** 現在の設定値 */
  settings: ScoreSettings
  /** 保存済み設定の更新で保留入力を無効にするための値 */
  persistedSettings?: ScoreSettings
  /** 入力中に計算結果だけを即時更新する関数 */
  onSettingsPreviewChange?: (settings: ScoreSettings) => void
  /** 設定値が変わったときに呼ばれる関数 */
  onSettingsChange: (settings: ScoreSettings) => void
  /** スケジュールから計算した回数（無効時は null） */
  scheduleCounts: Partial<Record<enums.ActionIdType, number>> | null
  /** スケジュールデータ（無い時は null） */
  scheduleData: ScheduleWeekData[] | null
}

/** アクション回数入力セクション */
export function ActionCountsSection({
  settings,
  persistedSettings,
  onSettingsPreviewChange,
  onSettingsChange,
  scheduleCounts,
  scheduleData,
}: ActionCountsSectionProps) {
  const { t } = useTranslation()
  // デバウンス中の入力と、その値を反映した最新設定を親の再描画に依存せず保持する
  const latestSettingsRef = useRef(settings)
  const pendingActionCountsRef = useRef<Partial<Record<enums.ActionIdType, number>>>({})
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onSettingsChangeRef = useRef(onSettingsChange)

  // タイマー発火時に古いpropsのコールバックを呼ばないよう、最新関数を参照する
  useLayoutEffect(() => {
    onSettingsChangeRef.current = onSettingsChange
  }, [onSettingsChange])

  // 凸数など別の設定の保存で同じ点数設定が再発行されても、入力は取り消さない
  const persistedSettingsDigest = persistedSettings === undefined ? undefined : createDomainDigest(persistedSettings)
  // 別操作で設定が確定したら、入力中の古い回数を後から保存しない
  useLayoutEffect(() => {
    pendingActionCountsRef.current = {}
    if (saveTimeoutRef.current !== null) {
      clearTimeout(saveTimeoutRef.current)
      saveTimeoutRef.current = null
    }
  }, [persistedSettingsDigest])

  // 親から新しい設定が届いても、デバウンス中の未保存回数が上書きされないように重ねる
  useLayoutEffect(() => {
    latestSettingsRef.current = {
      ...settings,
      actionCounts: { ...settings.actionCounts, ...pendingActionCountsRef.current },
    }
  }, [settings])

  // デバウンス中の回数を一度だけ確定し、アンマウント時にも未保存入力を取りこぼさない
  const flushPendingActionCounts = useCallback(() => {
    if (saveTimeoutRef.current !== null) {
      clearTimeout(saveTimeoutRef.current)
      saveTimeoutRef.current = null
    }

    const pendingActionCounts = pendingActionCountsRef.current
    if (Object.keys(pendingActionCounts).length === 0) return

    const next = {
      ...latestSettingsRef.current,
      actionCounts: { ...latestSettingsRef.current.actionCounts, ...pendingActionCounts },
    }
    pendingActionCountsRef.current = {}
    latestSettingsRef.current = next
    onSettingsChangeRef.current(next)
  }, [])

  useEffect(() => () => flushPendingActionCounts(), [flushPendingActionCounts])

  // アクション回数を更新する（0未満にならないようにガード）
  const updateCount = (id: enums.ActionIdType, value: number) => {
    const current = latestSettingsRef.current
    const sanitized = Math.max(0, value)
    const next = {
      ...current,
      actionCounts: { ...current.actionCounts, [id]: sanitized },
    }
    pendingActionCountsRef.current = { ...pendingActionCountsRef.current, [id]: sanitized }
    latestSettingsRef.current = next
    onSettingsPreviewChange?.(next)
    if (saveTimeoutRef.current !== null) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(flushPendingActionCounts, ACTION_COUNT_SAVE_DEBOUNCE_MS)
  }

  return (
    <div className="mt-2 space-y-3">
      {/* アクションをグループ単位で縦に並べる（例: 「レッスン」「その他」） */}
      {Object.entries(data.ActionGroups).map(([groupName, categories]) => (
        <div key={groupName}>
          {/* グループ見出し（例: 「レッスン」「おでかけ・その他」） */}
          <h3 className={constant.FILTER_SECTION_LABEL}>
            {t(data.getActionGroupLabel(groupName as enums.ActionGroupType))}
          </h3>
          <div className="space-y-1">
            {categories.map((cat) => {
              const isControlled =
                settings.useScheduleLimits &&
                !settings.useCustomMode &&
                scheduleData != null &&
                data.ScheduleControlledIds.has(cat.id)
              // スケジュール制御下なら自動計算値、そうでなければ手動値
              const displayValue = isControlled ? (scheduleCounts?.[cat.id] ?? 0) : (settings.actionCounts[cat.id] ?? 0)

              return (
                <div key={cat.id} className="flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <label
                      className={`text-[11px] block truncate ${isControlled ? 'text-blue-600 font-bold' : 'text-slate-700'}`}
                    >
                      {/* アクション名（例: 「ボーカルレッスン」「おでかけ」「休む」） */}
                      {t(cat.label)}
                      {isControlled && <span className="ml-1 text-[9px] text-blue-600">{t('ui.settings.auto')}</span>}
                    </label>
                  </div>
                  {/* 数値入力: スケジュール自動計算有効時は自動値で固定され操作不可 */}
                  <SpinnerInput
                    value={displayValue}
                    onChange={(val) => updateCount(cat.id, val)}
                    disabled={isControlled}
                  />
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
