/**
 * カード詳細モーダルのボディ部分
 *
 * 凸数セレクター、サポートイベント、サポートアビリティ、
 * Pアイテム、スキルカードのセクションを縦に並べる。
 * 各セクションは折りたたみ可能。
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { SupportCard, CardCalculationResult } from '../../types/card'
import type { UncapType } from '../../types/enums'
import type { TypeDisplayEntry } from '../../data'
import * as data from '../../data'
import * as constant from '../../constant'
import { UncapSelectorVariantType } from '../../types/enums'
import CollapsibleSection from '../ui/CollapsibleSection'
import { UncapSelector } from '../ui/UncapSelector'
import { PItemDetail } from './PItemDetail'
import { SkillCardDetail } from './SkillCardDetail'
import { SupportAbilityList } from './SupportAbilityList'
import { SupportEventList } from './SupportEventList'
import { AbilityBreakdownList } from '../scoreDetailModal/AbilityBreakdownList'

/** CardDetailSections コンポーネントに渡すプロパティ */
interface CardDetailSectionsProps {
  /** サポートカードデータ */
  card: SupportCard
  /** タイプ別の色設定 */
  colors: TypeDisplayEntry
  /** 現在の凸数 */
  uncap: UncapType
  /** 凸数が変わったときに呼ばれる関数 */
  onUncapChange: (uncap: UncapType) => void
  /** スコア計算結果 */
  scoreResult: CardCalculationResult
}

/** カード詳細のボディセクション */
export function CardDetailSections({ card, colors, uncap, onUncapChange, scoreResult }: CardDetailSectionsProps) {
  const { t } = useTranslation()
  // 各セクションの開閉状態
  const [uncapOpen, setUncapOpen] = useState(true)
  const [eventsOpen, setEventsOpen] = useState(true)
  const [abilitiesOpen, setAbilitiesOpen] = useState(true)
  const [pItemOpen, setPItemOpen] = useState(true)
  const [skillCardOpen, setSkillCardOpen] = useState(true)
  const [scoreOpen, setScoreOpen] = useState(true)
  // 現在の凸数とレアリティから最大レベルを計算
  const maxLevel = data.getMaxLevel(card.rarity, uncap)

  return (
    <div className="p-6 space-y-6">
      {/* 凸数セレクター + 最大レベル表示 */}
      <CollapsibleSection
        title={`${t('ui.header.uncap')}${t('ui.format.summary_separator')}${t('ui.unit.level')}${maxLevel}`}
        isOpen={uncapOpen}
        onToggle={() => setUncapOpen(!uncapOpen)}
      >
        <UncapSelector
          value={uncap}
          onChange={onUncapChange}
          variant={UncapSelectorVariantType.Detail}
          showNotOwned={false}
          activeClass={`${colors.badge} shadow-md`}
          inactiveClass={constant.BTN_TOGGLE_INACTIVE}
        />
      </CollapsibleSection>

      {/* サポートイベント一覧 */}
      <CollapsibleSection
        title={t('ui.header.support_events')}
        isOpen={eventsOpen}
        onToggle={() => setEventsOpen(!eventsOpen)}
      >
        <SupportEventList card={card} colors={colors} />
      </CollapsibleSection>

      {/* サポートアビリティ一覧 */}
      <CollapsibleSection
        title={t('ui.header.support_abilities')}
        isOpen={abilitiesOpen}
        onToggle={() => setAbilitiesOpen(!abilitiesOpen)}
      >
        <SupportAbilityList card={card} colors={colors} uncap={uncap} />
      </CollapsibleSection>

      {/* Pアイテム（あるカードだけ） */}
      {card.p_item && (
        <CollapsibleSection
          title={t('ui.header.produce_item')}
          isOpen={pItemOpen}
          onToggle={() => setPItemOpen(!pItemOpen)}
        >
          <PItemDetail pItem={card.p_item} colors={colors} />
        </CollapsibleSection>
      )}

      {/* スキルカード（名前があるカードだけ） */}
      {card.skill_card && card.skill_card.name && (
        <CollapsibleSection
          title={t('ui.header.skill_card')}
          isOpen={skillCardOpen}
          onToggle={() => setSkillCardOpen(!skillCardOpen)}
        >
          <SkillCardDetail skillCard={card.skill_card} colors={colors} />
        </CollapsibleSection>
      )}

      {/* 点数内訳 */}
      <CollapsibleSection
          title={`${t('ui.header.score_breakdown')}${t('ui.format.summary_separator')}${scoreResult.totalIncrease}${t('ui.unit.score')}`}
          isOpen={scoreOpen}
          onToggle={() => setScoreOpen(!scoreOpen)}
        >
          <AbilityBreakdownList result={scoreResult} />
      </CollapsibleSection>
    </div>
  )
}
