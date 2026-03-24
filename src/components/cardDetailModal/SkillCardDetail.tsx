/**
 * スキルカード詳細コンポーネント
 *
 * カード詳細モーダル内でスキルカードの名前・レアリティ・種別・
 * コスト・効果を表示する。「未強化」「強化」「カスタム」の3モード切替えあり。
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { SkillCardInfo } from '../../types/card'
import type { TypeDisplayEntry } from '../../data'
import * as data from '../../data'
import * as enums from '../../types/enums'
import { Badge } from '../ui/Badge'
import { ToggleButton } from '../ui/ToggleButton'
import { getSkillCardEffectLabel, getCustomSlotNameLabel, getCustomSlotEffectLabel, getCustomSlotStageLabel } from '../../utils/display/effectLabels'
import { parseSkillCardNotes } from '../../utils/cardQuery'

/** SkillCardDetail コンポーネントに渡すプロパティ */
interface SkillCardDetailProps {
  /** スキルカードデータ */
  skillCard: SkillCardInfo
  /** タイプ別の色設定 */
  colors: TypeDisplayEntry
}

/** スキルカードの詳細表示 */
export function SkillCardDetail({ skillCard, colors }: SkillCardDetailProps) {
  const { t } = useTranslation()
  // 現在の表示モード（未強化 / 強化 / カスタム）
  const [viewMode, setViewMode] = useState<enums.SkillCardViewModeType>(enums.SkillCardViewModeType.Enhanced)

  // 未強化ならベースレベル、強化ならプラスレベルの効果を取り出す
  const targetLevel =
    viewMode === enums.SkillCardViewModeType.Unenhanced
      ? enums.SkillCardLevelType.Base
      : enums.SkillCardLevelType.Plus
  // 通常モード（未強化/強化）では対象レベルの効果を取得、カスタムモードでは null
  const activeEffect =
    viewMode !== enums.SkillCardViewModeType.Custom
      ? (skillCard.effects.find((e) => e.level === targetLevel) ?? null)
      : null
  // スキルカードのレアリティ表示情報
  const skillRarityEntry = data.getRarityEntry(skillCard.rarity)
  const skillTypeEntry = data.SkillTypeBadge[skillCard.type]

  return (
    <div className={`p-4 rounded-xl ${colors.bg} border ${colors.border}`}>
      {/* スキルカード名 + バッジ群 */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* スキルカード名 */}
        <p className="text-sm font-black text-slate-800">{skillCard.name}</p>
        {/* レアリティバッジ（R / SR / SSR） */}
        <Badge color={skillRarityEntry.simple_color}>
          {t(skillRarityEntry.label)}
        </Badge>
        {/* 種別バッジ（アクティブ / メンタル） */}
        <Badge color={skillTypeEntry.badge}>
          {t(skillTypeEntry.label)}
        </Badge>
        {/* ノートバッジ（「レッスン中」「1回」などの付加情報） */}
        {parseSkillCardNotes(skillCard, t).map((note) => (
          <Badge key={note} color="bg-slate-200 text-slate-600">
            {note}
          </Badge>
        ))}
      </div>

      {/* 未強化/強化/カスタム のモード切替えボタン */}
      <div className="flex gap-1 mt-3">
        {([
            enums.SkillCardViewModeType.Unenhanced,
            enums.SkillCardViewModeType.Enhanced,
            ...(skillCard.custom_slot && skillCard.custom_slot.length > 0
              ? [enums.SkillCardViewModeType.Custom]
              : []),
            ]
        ).map((mode) => (
          <ToggleButton
            key={mode}
            isActive={viewMode === mode}
            onClick={() => setViewMode(mode)}
            activeClass="bg-slate-700 text-white shadow-sm"
            inactiveClass="bg-white/60 text-slate-500 hover:bg-white/80"
          >
            {t(data.getSkillCardViewModeLabel(mode))}
          </ToggleButton>
        ))}
      </div>

      {/* 未強化または強化モード選択時: コスト+効果テキストを表示 */}
      {activeEffect && (
        <div className="mt-2">
          <div className="flex items-start gap-2 text-xs">
            {/* コストバッジ（元気消費 / 体力消費 等。ノーコストの場合は非表示） */}
            {activeEffect.cost_type !== enums.CostType.None && (
              <span className="shrink-0 px-1.5 py-0.5 rounded bg-white/60 text-[10px] font-bold text-slate-500">
                {t(data.getCostTypeLabelKey(activeEffect.cost_type), { value: activeEffect.cost_value })}
              </span>
            )}
            {/* 効果テキスト（構造化された効果データをラベルに変換して表示） */}
            <span className="flex-1 text-slate-700 leading-relaxed">
              {activeEffect.effect ? getSkillCardEffectLabel(activeEffect.effect, t) : ''}
            </span>
          </div>
        </div>
      )}

      {/* カスタムモード選択時: カスタムスロット一覧を表示（スロットが存在する場合のみ） */}
      {viewMode === enums.SkillCardViewModeType.Custom &&
        skillCard.custom_slot &&
        skillCard.custom_slot.length > 0 && (
          <div className="mt-2 space-y-2">
            {/* カスタム枠上限の表示（0 より大きい場合のみ） */}
            {skillCard.custom_cap > 0 && (
              <p className="text-[10px] text-slate-500 font-bold">
                {t('card.custom_cap')} {skillCard.custom_cap}
              </p>
            )}
            {/* 各カスタムスロット: スロット名と段階別の効果（コスト・ポイント・効果テキスト）を表示 */}
            {skillCard.custom_slot.map((slot, i) => (
              <div key={i} className="bg-white/40 rounded-lg p-2">
                <p className="text-[11px] font-bold text-slate-700 mb-1">{getCustomSlotNameLabel(slot.name, t)}</p>
                {slot.stages.map((st, j) => (
                  <div key={j} className="flex items-center gap-2 text-[10px] text-slate-600 ml-2">
                    <span className="shrink-0 w-10 font-bold">{getCustomSlotStageLabel(st.stage, t)}</span>
                    <span className="shrink-0 w-10 text-slate-400">
                      {st.cost === 0 ? t('card.custom_slot_cost_none') : st.cost}
                      {t('ui.unit.p')}
                    </span>
                    <span className="flex-1">{getCustomSlotEffectLabel(st.effect, t)}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
    </div>
  )
}
