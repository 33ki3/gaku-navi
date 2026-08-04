/**
 * カウント対象のヘルプセクション。
 *
 * サポート効果と、その効果を数える契機の対応表を表示する
 */
import { useTranslation } from 'react-i18next'
import * as data from '../../data'
import { HelpSection } from './HelpSection'

/** CountTargetHelpSection に渡すプロパティ */
interface CountTargetHelpSectionProps {
  /** セクションが開いているか */
  isOpen: boolean
  /** セクションの開閉を切り替える関数 */
  onToggle: () => void
}

/**
 * カウント対象の説明と対応表を表示する
 *
 * @param props - 開閉状態と開閉操作
 * @returns カウント対象の折りたたみセクション
 */
export function CountTargetHelpSection({ isOpen, onToggle }: CountTargetHelpSectionProps) {
  const { t } = useTranslation()

  return (
    <HelpSection title={t('ui.help.count_target_title')} isOpen={isOpen} onToggle={onToggle}>
      <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line mb-3">
        {t('ui.help.count_target_desc')}
      </p>
      <table className="w-full text-[10px] text-slate-700 border-collapse">
        <thead>
          <tr className="bg-slate-100">
            <th className="px-2 py-1 text-left border border-slate-200 font-bold">
              {t('ui.help.count_target_table.header_effect')}
            </th>
            <th className="px-2 py-1 text-left border border-slate-200 font-bold">
              {t('ui.help.count_target_table.header_trigger')}
            </th>
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
      <p className="text-[10px] text-slate-500 mt-2">{t('ui.help.count_target_table.note_count')}</p>
    </HelpSection>
  )
}
