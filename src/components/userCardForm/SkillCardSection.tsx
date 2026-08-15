/**
 * ユーザーカードフォーム：スキルカードセクション
 *
 * スキルカードの種別（メンタル/アクティブ）とレアリティを入力する。
 */
import { useTranslation } from 'react-i18next'
import * as data from '../../data'
import type { UserCardFormState } from '../../hooks/formHelpers'
import * as enums from '../../types/enums'
import { isEnumValue } from '../../utils/valueValidation'
import { ToggleButton } from '../ui/ToggleButton'

import * as constant from '../../constant'

/** SkillCardSection コンポーネントに渡すプロパティ */
interface SkillCardSectionProps {
  /** フォーム状態 */
  form: UserCardFormState
  /** フィールド更新関数 */
  updateField: <K extends keyof UserCardFormState>(key: K, value: UserCardFormState[K]) => void
}

/** スキルカード入力セクション */
export default function SkillCardSection({ form, updateField }: SkillCardSectionProps) {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col gap-3">
      <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 flex flex-col gap-3">
        {/* 種別 */}
        <div>
          <label className={constant.USER_FORM_SECTION_LABEL}>{t('user_support.skillcard_type')}</label>
          <div className="flex gap-2">
            {data.SKILL_CARD_TYPE_OPTIONS.map((opt) => {
              const entry = data.getSkillTypeBadge(opt.value)
              return (
                <ToggleButton
                  key={opt.value}
                  isActive={form.skillCardType === opt.value}
                  onClick={() => updateField('skillCardType', opt.value)}
                  activeClass={`${entry.badge} border border-transparent`}
                  size={enums.ButtonSizeType.Sm}
                >
                  {t(opt.labelKey)}
                </ToggleButton>
              )
            })}
          </div>
        </div>

        {/* レアリティ */}
        <div>
          <label className={constant.USER_FORM_SECTION_LABEL}>{t('user_support.skillcard_rarity')}</label>
          <div className="flex gap-2">
            {data.SKILL_CARD_RARITY_OPTIONS.map((opt) => {
              const rarity = isEnumValue(opt.value, enums.RarityType) ? opt.value : enums.RarityType.SSR
              const entry = data.getRarityEntry(rarity)
              return (
                <ToggleButton
                  key={opt.value}
                  isActive={form.skillCardRarity === opt.value}
                  onClick={() => updateField('skillCardRarity', opt.value)}
                  activeClass={`${entry.color} border border-transparent bg-clip-padding`}
                  size={enums.ButtonSizeType.Sm}
                >
                  {t(opt.labelKey)}
                </ToggleButton>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
