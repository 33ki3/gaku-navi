/**
 * フィルター機能のヘルプセクション。
 *
 * フィルターの説明と、実際のバッジ表示を使った選択肢の例をまとめる
 */
import { useTranslation } from 'react-i18next'
import * as data from '../../data'
import * as enums from '../../types/enums'
import { Badge } from '../ui/Badge'
import { HelpSection } from './HelpSection'

/** FilterHelpSection に渡すプロパティ */
interface FilterHelpSectionProps {
  /** セクションが開いているか */
  isOpen: boolean
  /** セクションの開閉を切り替える関数 */
  onToggle: () => void
}

/**
 * フィルターの説明とバッジ例を表示する
 *
 * @param props - 開閉状態と開閉操作
 * @returns フィルター機能の折りたたみセクション
 */
export function FilterHelpSection({ isOpen, onToggle }: FilterHelpSectionProps) {
  const { t } = useTranslation()

  return (
    <HelpSection title={t('ui.help.filter_title')} isOpen={isOpen} onToggle={onToggle}>
      <p className="text-xs text-slate-600 leading-relaxed mb-3 whitespace-pre-line">{t('ui.help.filter_desc')}</p>

      {/* レアリティバッジ例 */}
      <div className="flex flex-wrap gap-1.5 mb-2">
        {Object.values(enums.RarityType).map((rarity) => {
          const entry = data.getRarityEntry(rarity)
          return (
            <Badge key={rarity} size={enums.BadgeSizeType.Sm} color={entry.color}>
              {t(entry.label)}
            </Badge>
          )
        })}
      </div>

      {/* タイプバッジ例 */}
      <div className="flex flex-wrap gap-1.5 mb-2">
        {Object.values(enums.CardType).map((type) => {
          const entry = data.getTypeEntry(type)
          return (
            <Badge key={type} size={enums.BadgeSizeType.Sm} color={entry.badge}>
              {t(entry.label)}
            </Badge>
          )
        })}
      </div>

      {/* プランバッジ例 */}
      <div className="flex flex-wrap gap-1.5 mb-2">
        {Object.values(enums.PlanType).map((plan) => {
          const entry = data.getPlanBadge(plan)
          return (
            <Badge key={plan} size={enums.BadgeSizeType.Sm} color={entry.badge}>
              {t(entry.label)}
            </Badge>
          )
        })}
      </div>

      {/* 入手種別バッジ例 */}
      <div className="flex flex-wrap gap-1.5">
        {Object.values(enums.SourceType).map((source) => {
          const entry = data.getSourceEntry(source)
          return (
            <Badge key={source} size={enums.BadgeSizeType.Sm} color={entry.badge}>
              {t(entry.label)}
            </Badge>
          )
        })}
      </div>
    </HelpSection>
  )
}
