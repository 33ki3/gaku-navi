/**
 * アビリティ・Pアイテムの1行コンポーネント
 *
 * アビリティ名・発動回数・スコアを横に並べる。
 * スコアが0の場合はグレーアウト表示する。
 * extraCount を指定するとサポート間連携の追加回数を緑色で表示する。
 */
import { useTranslation } from 'react-i18next'
import type { CardCalculationResult } from '../../types/card'
import { getScoreStyles } from '../../utils/display/scoreStyles'
import { getAbilityDisplayName, getEffectDescription } from '../../utils/display/abilityRowHelpers'

/** AbilityRow コンポーネントに渡すプロパティ */
interface AbilityRowProps {
  /** アビリティ詳細データ */
  ab: CardCalculationResult['allAbilityDetails'][number]
  /** サポート間連携による追加回数（0 の場合は表示しない） */
  extraCount?: number
}

/** アビリティ/Pアイテムの内訳行 */
export function AbilityRow({ ab, extraCount = 0 }: AbilityRowProps) {
  const { t } = useTranslation()

  const displayName = getAbilityDisplayName(ab, t)
  const effectDescription = getEffectDescription(ab, t)

  // サポート間連携がある場合は合算スコアを使う
  const displayTotal = extraCount > 0 ? ab.total + Math.floor(ab.valuePerTrigger * extraCount) : ab.total
  const styles = getScoreStyles(displayTotal)

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
      {/* 発動回数（×N [+M]） */}
      <span className={`text-[10px] shrink-0 text-right mr-2 min-w-[3.5rem] pb-0.5 ${styles.subTextColor}`}>
        {t('ui.symbol.multiply')}
        {ab.count}
        {extraCount > 0 && (
          <span className="text-emerald-600">
            {t('ui.symbol.plus')}
            {extraCount}
          </span>
        )}
      </span>
      {/* スコア（+N） */}
      <span className={`shrink-0 text-right min-w-[3rem] pb-0.5 ${styles.scoreColor}`}>
        {t('ui.symbol.plus')}
        {displayTotal.toLocaleString()}
      </span>
    </div>
  )
}
