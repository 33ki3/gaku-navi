/**
 * アビリティ・Pアイテムの1行コンポーネント
 *
 * アビリティ名・発動回数・スコアを横に並べる。
 * スコアが0の場合はグレーアウト表示する。
 */
import { useTranslation } from 'react-i18next'
import type { CardCalculationResult } from '../../types/card'
import { getScoreStyles } from '../../utils/display/scoreStyles'
import { getAbilityDisplayName, getEffectDescription } from '../../utils/display/abilityRowHelpers'

/** AbilityRow コンポーネントに渡すプロパティ */
interface AbilityRowProps {
  /** アビリティ詳細データ */
  ab: CardCalculationResult['allAbilityDetails'][number]
}

/** アビリティ/Pアイテムの内訳行 */
export function AbilityRow({ ab }: AbilityRowProps) {
  const { t } = useTranslation()

  const displayName = getAbilityDisplayName(ab, t)
  const effectDescription = getEffectDescription(ab, t)
  const styles = getScoreStyles(ab.total)

  // 行のレイアウト: [名前] [×回数] [スコア]
  return (
    <div className={`flex items-end text-xs rounded px-2 py-1 ${styles.rowBackground}`}>
      {/* 名前表示エリア（折り返し可能） */}
      <span className={`flex-1 mr-2 leading-snug break-words ${styles.textColor}`}>
        <span>{displayName}</span>
        {/* Pアイテムの効果全文を名前の下に表示 */}
        {effectDescription && (
          <>
            <br />
            <span className={`text-[10px] ${styles.subTextColor}`}>{effectDescription}</span>
          </>
        )}
      </span>
      {/* 発動回数（×N） */}
      <span className={`text-[10px] shrink-0 text-right mr-2 min-w-[3.5rem] pb-0.5 ${styles.subTextColor}`}>
        {t('ui.symbol.multiply')}
        {ab.count}
      </span>
      {/* スコア（+N） */}
      <span className={`shrink-0 text-right min-w-[3rem] pb-0.5 ${styles.scoreColor}`}>
        {`${t('ui.symbol.plus')}${ab.total}`}
      </span>
    </div>
  )
}
