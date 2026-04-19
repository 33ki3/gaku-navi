/**
 * ユーザーサポートフォーム：基本情報セクション
 *
 * サポート名・レアリティ・タイプ・プランの入力欄を提供する。
 */
import { useTranslation } from 'react-i18next'
import type { UserCardFormState } from '../../hooks/formHelpers'
import type { FormValidation } from '../../hooks/useUserCardForm'
import * as enums from '../../types/enums'
import { ToggleButton } from '../ui/ToggleButton'
import * as data from '../../data'
import * as constant from '../../constant'

/** BasicInfoSection コンポーネントに渡すプロパティ */
interface BasicInfoSectionProps {
  /** フォーム状態 */
  form: UserCardFormState
  /** フィールド更新関数 */
  updateField: <K extends keyof UserCardFormState>(key: K, value: UserCardFormState[K]) => void
  /** レアリティ変更関数（イベント連動） */
  setRarity: (rarity: enums.RarityType) => void
  /** タイプ変更関数（パラメータ連動） */
  setType: (type: enums.CardType) => void
  /** イベントSSR変更関数（アビリティリセット連動） */
  setIsEventSource: (isEventSource: boolean) => void
  /** バリデーション結果 */
  validation: FormValidation
}

/** 基本情報入力セクション */
export default function BasicInfoSection({
  form,
  updateField,
  setRarity,
  setType,
  setIsEventSource,
  validation,
}: BasicInfoSectionProps) {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col gap-4">
      {/* サポート名 */}
      <div>
        <label className={constant.USER_FORM_SECTION_LABEL}>{t('userSupport.card_name')}</label>
        <input
          type="text"
          value={form.name}
          onChange={(e) => updateField('name', e.target.value)}
          placeholder={t('userSupport.card_name_placeholder')}
          className={`${constant.USER_FORM_INPUT} ${validation.nameError ? 'border-red-400 focus:ring-red-500' : ''}`}
        />
        {validation.nameError && <p className="text-xs text-red-500 mt-1">{t(validation.nameError)}</p>}
      </div>

      {/* レアリティ */}
      <div>
        <label className={constant.USER_FORM_SECTION_LABEL}>{t('userSupport.rarity')}</label>
        <div className="flex gap-2">
          {data.RARITY_SELECT_OPTIONS.map((opt) => {
            const entry = data.getRarityEntry(opt.value)
            return (
              <ToggleButton
                key={opt.value}
                isActive={form.rarity === opt.value}
                onClick={() => setRarity(opt.value)}
                activeClass={`${entry.color} border border-transparent bg-clip-padding`}
                size={enums.ButtonSizeType.Sm}
              >
                {t(opt.labelKey)}
              </ToggleButton>
            )
          })}
        </div>
        {/* イベントSSRチェック（SSR選択時のみ） */}
        {form.rarity === enums.RarityType.SSR && (
          <label className="flex items-center gap-2 text-xs text-slate-600 mt-1">
            <input
              type="checkbox"
              checked={form.isEventSource}
              onChange={(e) => setIsEventSource(e.target.checked)}
              className="rounded border-slate-300"
            />
            {t('userSupport.is_event_source')}
          </label>
        )}
      </div>

      {/* タイプ */}
      <div>
        <label className={constant.USER_FORM_SECTION_LABEL}>{t('userSupport.type')}</label>
        <div className="flex gap-2">
          {data.TYPE_SELECT_OPTIONS.map((opt) => {
            const entry = data.getTypeEntry(opt.value)
            return (
              <ToggleButton
                key={opt.value}
                isActive={form.type === opt.value}
                onClick={() => setType(opt.value)}
                activeClass={`${entry.badge} border border-transparent`}
                size={enums.ButtonSizeType.Sm}
              >
                {t(opt.labelKey)}
              </ToggleButton>
            )
          })}
        </div>
      </div>

      {/* プラン */}
      <div>
        <label className={constant.USER_FORM_SECTION_LABEL}>{t('userSupport.plan')}</label>
        <div className="flex gap-2">
          {data.PLAN_SELECT_OPTIONS.map((opt) => {
            const entry = data.getPlanBadge(opt.value)
            return (
              <ToggleButton
                key={opt.value}
                isActive={form.plan === opt.value}
                onClick={() => updateField('plan', opt.value)}
                activeClass={`${entry.activeColor} border border-transparent`}
                size={enums.ButtonSizeType.Sm}
              >
                {t(opt.labelKey)}
              </ToggleButton>
            )
          })}
        </div>
      </div>
    </div>
  )
}
