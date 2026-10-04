/** アチーブ計算機のセクション名と、右寄せの獲得済み／総EXPを揃える */
import { useTranslation } from 'react-i18next'
import { getExpTotalClass } from '../../utils/display/achievement'

/** True End・基本・Pアイドル・プロデュース・課題／パネルの見出し集計 */
interface AchievementSectionHeaderProps {
  /** 翻訳済みのセクション名 */
  title: string
  /** このセクションで獲得済みのEXP合計 */
  earnedExp: number
  /** このセクションに登録されたEXP報酬の総量 */
  totalExp: number
}

/**
 * 見出しとEXPを同じ行に配置し、全EXP獲得時は緑で示す
 * @param props セクション名と、獲得済みEXP・登録済み報酬の総量
 * @returns 名称とEXP比率を同じ行に揃えた見出し
 */
export function AchievementSectionHeader({ title, earnedExp, totalExp }: AchievementSectionHeaderProps) {
  const { t } = useTranslation()
  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
      <h2 className="min-w-0 text-sm font-black text-slate-900">{title}</h2>
      <span className={`shrink-0 text-right text-xs font-black tabular-nums ${getExpTotalClass(earnedExp, totalExp)}`}>
        {t('achievement_calculator.form.exp_total', {
          earned: earnedExp.toLocaleString(),
          total: totalExp.toLocaleString(),
        })}
      </span>
    </div>
  )
}
