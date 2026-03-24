/**
 * アビリティセクションコンポーネント
 *
 * スコア内訳の「サポートアビリティ」セクション。
 * パラメータボーナス行 + 各アビリティ行を縦に並べる。
 */
import { useTranslation } from 'react-i18next'
import type { CardCalculationResult } from '../../types/card'
import * as constant from '../../constant'
import { getScoreStyles } from '../../utils/display/scoreStyles'
import { AbilityRow } from './AbilityRow'

/** AbilitySection コンポーネントに渡すプロパティ */
interface AbilitySectionProps {
  /** スコア計算結果 */
  result: CardCalculationResult
  /** アビリティ詳細の配列 */
  abilities: CardCalculationResult['allAbilityDetails']
  /** パラメータボーナスがあるか */
  hasParamBonus: boolean
}

/** サポートアビリティセクション */
export function AbilitySection({ result, abilities, hasParamBonus }: AbilitySectionProps) {
  const { t } = useTranslation()
  const paramBonusStyles = getScoreStyles(result.parameterBonus)

  return (
    <div>
      <h4 className={constant.SECTION_HEADING_SM_PX}>{t('ui.header.support_abilities')}</h4>
      <div className="space-y-0.5">
        {/* パラメータボーナス行（ある場合のみ） */}
        {hasParamBonus && (
          <div
            className={`flex items-end text-xs px-2 py-1 rounded ${paramBonusStyles.rowBackground}`}
          >
            {/* パラメータボーナス名（「パラボ +基礎値」） */}
            <span className={`flex-1 mr-2 leading-snug break-words ${paramBonusStyles.textColor}`}>
              {t('ui.settings.param_bonus_label')}
            </span>
            {/* 計算式: 基礎値 × ボーナス率% */}
            <span
              className={`text-[10px] shrink-0 text-right mr-2 min-w-[3.5rem] pb-0.5 ${paramBonusStyles.subTextColor}`}
            >
              {result.paramBonusBase}
              {` ${t('ui.symbol.multiply')} `}
              {result.paramBonusPercent}
              {t('ui.symbol.percent')}
            </span>
            {/* 最終スコア */}
            <span
              className={`shrink-0 text-right min-w-[3rem] pb-0.5 ${paramBonusStyles.scoreColor}`}
            >
              {`${t('ui.symbol.plus')}${result.parameterBonus}`}
            </span>
          </div>
        )}
        {/* アビリティの各行 */}
        {abilities.map((ab, i) => (
          <AbilityRow key={i} ab={ab} />
        ))}
      </div>
    </div>
  )
}
