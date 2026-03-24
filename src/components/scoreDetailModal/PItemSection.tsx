/**
 * Pアイテムセクションコンポーネント
 *
 * スコア内訳の「Pアイテム」セクション。
 * Pアイテムの各効果を AbilityRow で並べる。
 */
import { useTranslation } from 'react-i18next'
import type { CardCalculationResult } from '../../types/card'
import * as constant from '../../constant'
import { AbilityRow } from './AbilityRow'

/** Pアイテムセクション */
export function PItemSection({ pItems }: { pItems: CardCalculationResult['allAbilityDetails'] }) {
  const { t } = useTranslation()

  return (
    <div>
      <h4 className={constant.SECTION_HEADING_SM_PX}>{t('ui.header.produce_item')}</h4>
      <div className="space-y-0.5">
        {/* アビリティの各行 */}
        {pItems.map((ab, i) => (
          <AbilityRow key={i} ab={ab} />
        ))}
      </div>
    </div>
  )
}
