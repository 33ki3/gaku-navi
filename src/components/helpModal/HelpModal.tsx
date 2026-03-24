/**
 * ヘルプモーダルコンポーネント
 *
 * アプリの使い方ガイドを表示するモーダル。
 * 各機能（フィルター、点数設定、凸数、データ管理）の説明を
 * 折りたたみセクション形式で表示する。
 * 実際のBadgeコンポーネントを埋め込み、視覚的に説明する。
 */
import { useTranslation } from 'react-i18next'
import * as constant from '../../constant'
import * as data from '../../data'
import { BadgeSizeType, ButtonSizeType, RarityType, CardType, PlanType, HelpSectionKey } from '../../types/enums'
import ModalOverlay from '../ui/ModalOverlay'
import CloseButton from '../ui/CloseButton'
import { Badge } from '../ui/Badge'
import { HelpSection } from './HelpSection'
import { useAccordionState } from '../../hooks'

/** HelpModal コンポーネントに渡すプロパティ */
interface HelpModalProps {
  /** モーダルを閉じる関数 */
  onClose: () => void
  /** 点数設定パネルがピン留めされているか */
  settingsPinned: boolean
}

/** 各セクションの初期開閉状態（すべて閉じた状態） */
const initialSections: Record<HelpSectionKey, boolean> = {
  [HelpSectionKey.Filter]: false,
  [HelpSectionKey.CardList]: false,
  [HelpSectionKey.Score]: false,
  [HelpSectionKey.CountTarget]: false,
  [HelpSectionKey.Uncap]: false,
  [HelpSectionKey.Data]: false,
}

/** 各セクションの初期開閉状態（すべて閉じた状態） */
export default function HelpModal({ onClose, settingsPinned }: HelpModalProps) {
  const { t } = useTranslation()
  const { state: sections, toggle } = useAccordionState(initialSections)

  return (
    <ModalOverlay onClose={onClose} panelClassName={constant.MODAL_PANEL_DETAIL} className={settingsPinned ? 'md:right-96' : ''}>
      {/* ヘッダー */}
      <div className="sticky top-0 bg-white z-10 px-5 py-3 border-b border-slate-200 flex items-center justify-between">
        <h2 className="text-sm font-black text-slate-800">{t('ui.help.title')}</h2>
        <CloseButton onClick={onClose} size={ButtonSizeType.Sm} />
      </div>

      <div className="px-5 py-4 space-y-3">
        {/* フィルター */}
        <HelpSection
          title={t('ui.help.filter_title')}
          isOpen={sections.filter}
          onToggle={() => toggle(HelpSectionKey.Filter)}
        >
          <p className="text-xs text-slate-600 leading-relaxed mb-3 whitespace-pre-line">
            {t('ui.help.filter_desc')}
          </p>
          {/* レアリティバッジ例 */}
          <div className="flex flex-wrap gap-1.5 mb-2">
            {Object.values(RarityType).map((r) => {
              const entry = data.getRarityEntry(r)
              return (
                <Badge key={r} size={BadgeSizeType.Sm} color={entry.gradient_color}>
                  {t(entry.label)}
                </Badge>
              )
            })}
          </div>
          {/* タイプバッジ例 */}
          <div className="flex flex-wrap gap-1.5 mb-2">
            {Object.values(CardType).map((type) => {
              const entry = data.getTypeEntry(type)
              return (
                <Badge key={type} size={BadgeSizeType.Sm} color={entry.badge}>
                  {t(entry.label)}
                </Badge>
              )
            })}
          </div>
          {/* プランバッジ例 */}
          <div className="flex flex-wrap gap-1.5">
            {Object.values(PlanType).map((plan) => {
              const entry = data.PlanBadge[plan]
              return (
                <Badge key={plan} size={BadgeSizeType.Sm} color={entry.badge}>
                  {t(entry.label)}
                </Badge>
              )
            })}
          </div>
        </HelpSection>

        {/* カード一覧の見方 */}
        <HelpSection
          title={t('ui.help.card_list_title')}
          isOpen={sections.cardList}
          onToggle={() => toggle(HelpSectionKey.CardList)}
        >
          <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">
            {t('ui.help.card_list_desc')}
          </p>
        </HelpSection>

        {/* 点数設定 */}
        <HelpSection
          title={t('ui.help.score_title')}
          isOpen={sections.score}
          onToggle={() => toggle(HelpSectionKey.Score)}
        >
          <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">
            {t('ui.help.score_desc')}
          </p>
        </HelpSection>

        {/* カウント対象の対応表 */}
        <HelpSection
          title={t('ui.help.count_target_title')}
          isOpen={sections.countTarget}
          onToggle={() => toggle(HelpSectionKey.CountTarget)}
        >
          <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line mb-3">
            {t('ui.help.count_target_desc')}
          </p>
          <table className="w-full text-[10px] text-slate-700 border-collapse">
            <thead>
              <tr className="bg-slate-100">
                <th className="px-2 py-1 text-left border border-slate-200 font-bold">{t('ui.help.count_target_table.header_effect')}</th>
                <th className="px-2 py-1 text-left border border-slate-200 font-bold">{t('ui.help.count_target_table.header_trigger')}</th>
              </tr>
            </thead>
            <tbody>
              {data.CountTargetRows.map((row) => (
                <tr key={row.effect}>
                  <td className="px-2 py-1 border border-slate-200">{t(row.effect)}</td>
                  <td className="px-2 py-1 border border-slate-200">{t(row.trigger)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-[10px] text-slate-500 mt-2">
            {t('ui.help.count_target_table.note_count')}
          </p>
        </HelpSection>

        {/* 凸数 */}
        <HelpSection
          title={t('ui.help.uncap_title')}
          isOpen={sections.uncap}
          onToggle={() => toggle(HelpSectionKey.Uncap)}
        >
          <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">
            {t('ui.help.uncap_desc')}
          </p>
        </HelpSection>

        {/* データ管理 */}
        <HelpSection
          title={t('ui.help.data_title')}
          isOpen={sections.data}
          onToggle={() => toggle(HelpSectionKey.Data)}
        >
          <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">
            {t('ui.help.data_desc')}
          </p>
        </HelpSection>
      </div>
    </ModalOverlay>
  )
}
