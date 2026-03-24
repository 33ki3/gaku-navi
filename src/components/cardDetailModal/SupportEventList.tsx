/**
 * サポートイベント一覧コンポーネント
 *
 * カード詳細モーダル内でサポートイベントを解放順に一覧表示する。
 * 各イベントの効果・タイトル・スキルカード情報をまとめて表示する。
 */
import { useTranslation } from 'react-i18next'
import type { SupportCard } from '../../types/card'
import type { TypeDisplayEntry } from '../../data'
import * as data from '../../data'
import { EventEffectType } from '../../types/enums'
import { getEventEffectLabel } from '../../utils/display/effectLabels'

/** SupportEventList コンポーネントに渡すプロパティ */
interface SupportEventListProps {
  /** サポートカードデータ */
  card: SupportCard
  /** タイプ別の色設定 */
  colors: TypeDisplayEntry
}

/** サポートイベント一覧 */
export function SupportEventList({ card, colors }: SupportEventListProps) {
  const { t } = useTranslation()

  return (
    <div className="space-y-2">
      {/* イベントごとに解放条件・効果・コミュ名を表示 */}
      {card.events.map((evt, i) => (
        <div
          key={i}
          className={`flex items-start gap-3 p-3 rounded-xl ${colors.bg} border ${colors.border}`}
        >
          {/* 解放条件ラベル（「初期」「Lv20」「Lv40」等） */}
          <span className="shrink-0 text-[10px] font-bold text-slate-400 mt-0.5 w-10">
            {t(data.getEventReleaseLabelKey(evt.release))}
          </span>
          <div className="flex-1 min-w-0">
            {/* イベント効果テキスト（「Vo+5」「スキルカード獲得」など） */}
            {/* スキルカード獲得イベントの場合はレアリティ・種別バッジも併記 */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className={`text-sm font-bold ${colors.text}`}>{getEventEffectLabel(evt, t)}</p>
              {evt.effect_type === EventEffectType.SkillCard && card.skill_card && (
                (() => {
                  const rEntry = data.getRarityEntry(card.skill_card.rarity)
                  const sEntry = data.SkillTypeBadge[card.skill_card.type]
                  return (
                    <>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${rEntry.simple_color}`}
                      >
                        {t(rEntry.label)}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${sEntry.badge}`}
                      >
                        {t(sEntry.label)}
                      </span>
                    </>
                  )
                })()
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">{evt.title}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
