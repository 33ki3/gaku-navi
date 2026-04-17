/**
 * アクション回数セクションコンポーネント
 *
 * レッスン・イベント・お出かけなどのアクション回数を
 * グループ別に並べて入力する。
 * スケジュール自動計算が有効なカテゴリはロックされる。
 */
import { useTranslation } from 'react-i18next'
import type { ScoreSettings } from '../../types/card'
import type { ScheduleWeekData } from '../../data'
import { SpinnerInput } from '../ui/SpinnerInput'
import * as constant from '../../constant'
import * as enums from '../../types/enums'
import * as data from '../../data'

/** ActionCountsSection コンポーネントに渡すプロパティ */
interface ActionCountsSectionProps {
  /** 現在の設定値 */
  settings: ScoreSettings
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
  onSettingsChange,
  scheduleCounts,
  scheduleData,
}: ActionCountsSectionProps) {
  const { t } = useTranslation()

  // アクション回数を更新する（0未満にならないようにガード）
  const updateCount = (id: enums.ActionIdType, value: number) => {
    onSettingsChange({
      ...settings,
      actionCounts: { ...settings.actionCounts, [id]: Math.max(0, value) },
    })
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
                settings.useScheduleLimits && scheduleData != null && data.ScheduleControlledIds.has(cat.id)
              // スケジュール制御下なら自動計算値、そうでなければ手動値
              const displayValue = isControlled ? (scheduleCounts?.[cat.id] ?? 0) : (settings.actionCounts[cat.id] ?? 0)

              return (
                <div key={cat.id} className="flex items-center gap-2">
                  <label
                    className={`text-[11px] flex-1 min-w-0 truncate ${isControlled ? 'text-blue-600 font-bold' : 'text-slate-700'}`}
                  >
                    {/* アクション名（例: 「ボーカルレッスン」「おでかけ」「休む」） */}
                    {t(cat.label)}
                    {isControlled && <span className="ml-1 text-[9px] text-blue-600">{t('ui.settings.auto')}</span>}
                  </label>
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
