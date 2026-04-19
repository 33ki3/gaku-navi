/**
 * ユーザーサポートフォーム：アビリティセクション
 *
 * 6スロット固定枠でアビリティを選択する。
 * スロット1・3・6は固定枠（選択肢が限定される）。
 * スロット2・4・5は自由枠（レアリティ別の全アビリティから選択）。
 * 値はレアリティ・スロット位置から自動導出されるため、手動入力は不要。
 */
import { useTranslation } from 'react-i18next'
import type { UserCardFormState, AbilityFormRow } from '../../hooks/formHelpers'
import { getRarityTier, cleanAbilityLabel, getSlotOptions } from '../../hooks/formHelpers'
import * as enums from '../../types/enums'
import type { TranslationKey } from '../../i18n'
import * as data from '../../data'
import * as constant from '../../constant'

/** AbilitySection コンポーネントに渡すプロパティ */
interface AbilitySectionProps {
  /** フォーム状態 */
  form: UserCardFormState
  /** アビリティ追加（未使用だが互換性のため保持） */
  addAbility: () => void
  /** アビリティ更新 */
  updateAbility: (index: number, row: AbilityFormRow) => void
  /** アビリティ削除（未使用だが互換性のため保持） */
  removeAbility: (index: number) => void
  /** アビリティバリデーションエラーの i18n キー */
  abilityError?: TranslationKey
}
/** アビリティ入力セクション（6スロット固定） */
export default function AbilitySection({ form, updateAbility, abilityError }: AbilitySectionProps) {
  const { t } = useTranslation()

  // アシストタイプの場合はアビリティ設定不可
  if (form.type === enums.CardType.Assist) {
    return <p className="text-xs text-slate-400">{t('userSupport.assist_no_ability')}</p>
  }

  // レアリティに応じた選択可能アビリティを取得
  const rarityTier = getRarityTier(form.rarity, form.isEventSource)
  const availableAbilities = data.getAvailableAbilities(rarityTier)

  // 固定スロット除外：自由スロット（2・4・5）では固定スロット専用アビリティを除外
  const fixedAbilities = new Set<enums.AbilityNameKeyType>([
    ...data.SLOT1_OPTIONS,
    ...data.SLOT3_OPTIONS,
    ...data.SLOT6_OPTIONS[rarityTier],
  ])
  const freeSlotAbilities = availableAbilities.filter((k) => !fixedAbilities.has(k))

  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: constant.SLOT_COUNT }, (_, slotIdx) => {
        const currentRow = form.abilities[slotIdx]
        const currentNameKey = currentRow?.nameKey ?? data.SLOT_NONE
        // スロット3（idx 2）と6（idx 5）は固定・選択不可
        const isFixed = slotIdx === 2 || slotIdx === 5

        return (
          <div key={slotIdx} className="flex items-center gap-2">
            {/* スロット番号 */}
            <span className="text-[10px] font-bold text-slate-400 w-4 shrink-0 text-center">{slotIdx + 1}</span>
            <select
              value={currentNameKey}
              disabled={isFixed}
              onChange={(e) => {
                const nameKey = e.target.value as enums.AbilityNameKeyType | ''
                if (nameKey === data.SLOT_NONE) {
                  updateAbility(slotIdx, {
                    nameKey: '' as enums.AbilityNameKeyType,
                    maxCount: '',
                  })
                } else {
                  const mc = data.ABILITY_MAX_COUNT[nameKey]
                  updateAbility(slotIdx, {
                    nameKey,
                    parameterType: form.parameterType,
                    maxCount: mc != null ? String(mc) : '',
                  })
                }
              }}
              className={`${constant.USER_FORM_SELECT} flex-1${isFixed ? ' bg-slate-100 text-slate-500 cursor-not-allowed' : ''}`}
            >
              <option value={data.SLOT_NONE}>-</option>
              {getSlotOptions(slotIdx, rarityTier, freeSlotAbilities).map((nameKey) => (
                <option key={nameKey} value={nameKey}>
                  {cleanAbilityLabel(
                    t(`card.ability_name.${nameKey}` as TranslationKey, { param: '', v: '', count: 0 }),
                  )}
                </option>
              ))}
            </select>
          </div>
        )
      })}
      {abilityError && <p className="text-xs text-red-500 mt-2">{t(abilityError)}</p>}
    </div>
  )
}
