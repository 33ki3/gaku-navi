/**
 * ヘルプモーダル本文のセクション配置。
 *
 * 各機能の説明順を一か所にまとめ、固有表示を持つセクションと
 * 文章形式のセクションを組み合わせる
 */
import { useTranslation } from 'react-i18next'
import * as enums from '../../types/enums'
import { CountTargetHelpSection } from './CountTargetHelpSection'
import { DescriptionHelpSection } from './DescriptionHelpSection'
import { FilterHelpSection } from './FilterHelpSection'

/** HelpSections に渡すプロパティ */
interface HelpSectionsProps {
  /** 各セクションの開閉状態 */
  sections: Record<enums.HelpSectionKey, boolean>
  /** 指定したセクションの開閉を切り替える関数 */
  onToggle: (key: enums.HelpSectionKey) => void
}

/**
 * ヘルプセクションを機能の説明順に配置する
 *
 * @param props - 各セクションの開閉状態と開閉操作
 * @returns ヘルプモーダルの本文
 */
export function HelpSections({ sections, onToggle }: HelpSectionsProps) {
  const { t } = useTranslation()

  return (
    <>
      {/* 検索・絞り込みの操作例を、専用表示のセクションへ委譲する */}
      <FilterHelpSection
        isOpen={sections[enums.HelpSectionKey.Filter]}
        onToggle={() => onToggle(enums.HelpSectionKey.Filter)}
      />
      {/* サポート一覧・点数・凸数の共通文章説明 */}
      <DescriptionHelpSection
        title={t('ui.help.card_list_title')}
        description={t('ui.help.card_list_desc')}
        isOpen={sections[enums.HelpSectionKey.CardList]}
        onToggle={() => onToggle(enums.HelpSectionKey.CardList)}
      />
      {/* 点数設定の基本操作を文章形式で説明する */}
      <DescriptionHelpSection
        title={t('ui.help.score_title')}
        description={t('ui.help.score_desc')}
        isOpen={sections[enums.HelpSectionKey.Score]}
        onToggle={() => onToggle(enums.HelpSectionKey.Score)}
      />
      {/* 凸数の対象と設定方法を専用表示のセクションへ委譲する */}
      <CountTargetHelpSection
        isOpen={sections[enums.HelpSectionKey.CountTarget]}
        onToggle={() => onToggle(enums.HelpSectionKey.CountTarget)}
      />
      {/* 上限解放の扱いを文章形式で説明する */}
      <DescriptionHelpSection
        title={t('ui.help.uncap_title')}
        description={t('ui.help.uncap_desc')}
        isOpen={sections[enums.HelpSectionKey.Uncap]}
        onToggle={() => onToggle(enums.HelpSectionKey.Uncap)}
      />
      {/* データのインポート・エクスポートを文章形式で説明する */}
      <DescriptionHelpSection
        title={t('ui.help.data_title')}
        description={t('ui.help.data_desc')}
        isOpen={sections[enums.HelpSectionKey.Data]}
        onToggle={() => onToggle(enums.HelpSectionKey.Data)}
      />
      {/* 最適編成の操作と結果表示を文章形式で説明する */}
      <DescriptionHelpSection
        title={t('ui.help.unit_simulator_title')}
        description={t('ui.help.unit_simulator_desc')}
        isOpen={sections[enums.HelpSectionKey.UnitSimulator]}
        onToggle={() => onToggle(enums.HelpSectionKey.UnitSimulator)}
      />
      {/* サポート登録・編集の操作を文章形式で説明する */}
      <DescriptionHelpSection
        title={t('ui.help.user_support_title')}
        description={t('ui.help.user_support_desc')}
        isOpen={sections[enums.HelpSectionKey.UserSupport]}
        onToggle={() => onToggle(enums.HelpSectionKey.UserSupport)}
      />
    </>
  )
}
