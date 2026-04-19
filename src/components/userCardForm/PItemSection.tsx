/**
 * ユーザーサポートフォーム：Pアイテムセクション
 *
 * Pアイテムの発動条件・パラメータ上昇値・発動回数・発動時効果を設定する。
 * 発動時効果は複数設定可能で、各効果に個別の回数を指定できる。
 */
import { useTranslation } from 'react-i18next'
import type { UserCardFormState, PItemEffectRow } from '../../hooks/formHelpers'
import type { FormValidation } from '../../hooks/useUserCardForm'
import * as enums from '../../types/enums'
import * as data from '../../data'
import * as constant from '../../constant'

/** PItemSection コンポーネントに渡すプロパティ */
interface PItemSectionProps {
  /** フォーム状態 */
  form: UserCardFormState
  /** フィールド更新関数 */
  updateField: <K extends keyof UserCardFormState>(key: K, value: UserCardFormState[K]) => void
  /** バリデーション */
  validation: FormValidation
}

/** Pアイテム入力セクション */
export default function PItemSection({ form, updateField, validation }: PItemSectionProps) {
  const { t } = useTranslation()

  /** 効果追加 */
  const addEffect = () => {
    updateField('pItemEffects', [...form.pItemEffects, { action: enums.ActionIdType.SkillEnhance, count: '1' }])
  }

  /** 効果更新 */
  const updateEffect = (index: number, row: PItemEffectRow) => {
    const effects = [...form.pItemEffects]
    effects[index] = row
    updateField('pItemEffects', effects)
  }

  /** 効果削除 */
  const removeEffect = (index: number) => {
    updateField(
      'pItemEffects',
      form.pItemEffects.filter((_, i) => i !== index),
    )
  }

  const isNoneTrigger = form.pItemTrigger === enums.TriggerKeyType.None

  return (
    <div className="flex flex-col gap-3">
      <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 flex flex-col gap-3">
        {/* 発動条件 */}
        <div>
          <label className={constant.USER_FORM_SECTION_LABEL}>{t('userSupport.pitem_trigger')}</label>
          <select
            value={form.pItemTrigger}
            onChange={(e) => updateField('pItemTrigger', e.target.value as enums.TriggerKeyType)}
            className={`${constant.USER_FORM_SELECT} ${validation.pItemTriggerError ? 'border-red-400 focus:ring-red-500' : ''}`}
          >
            {data.PITEM_TRIGGER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {t(opt.labelKey)}
              </option>
            ))}
          </select>
          {validation.pItemTriggerError && (
            <p className="text-xs text-red-500 mt-1">{t(validation.pItemTriggerError)}</p>
          )}
        </div>

        {/* 発動条件が「なし」以外の場合のみ詳細フォームを表示 */}
        {!isNoneTrigger && (
          <>
            {/* パラメータ上昇値 */}
            <div>
              <label className={constant.USER_FORM_SECTION_LABEL}>{t('userSupport.pitem_value')}</label>
              <input
                type="text"
                inputMode="numeric"
                value={form.pItemValue}
                onChange={(e) => {
                  if (e.target.value === '' || /^\d+$/.test(e.target.value)) updateField('pItemValue', e.target.value)
                }}
                placeholder="0"
                className={constant.USER_FORM_SELECT}
              />
            </div>

            {/* 発動回数 */}
            <div>
              <label className={constant.USER_FORM_SECTION_LABEL}>{t('userSupport.pitem_effect_count')}</label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const v = Number(form.pItemEffectCount) || 0
                    if (v > 0) updateField('pItemEffectCount', v === 1 ? '' : String(v - 1))
                  }}
                  className={constant.SPINNER_BTN + ' ' + constant.BTN_TOGGLE_INACTIVE}
                >
                  {t('ui.symbol.minus')}
                </button>
                <input
                  type="text"
                  inputMode="numeric"
                  value={form.pItemEffectCount}
                  onChange={(e) => {
                    const v = e.target.value
                    if (v === '' || /^\d+$/.test(v)) updateField('pItemEffectCount', v === '0' ? '' : v)
                  }}
                  placeholder={t('userSupport.pitem_effect_count_placeholder')}
                  className={`${constant.SPINNER_INPUT} border-slate-200`}
                />
                <button
                  type="button"
                  onClick={() => {
                    const v = Number(form.pItemEffectCount) || 0
                    updateField('pItemEffectCount', String(v + 1))
                  }}
                  className={constant.SPINNER_BTN + ' ' + constant.BTN_TOGGLE_INACTIVE}
                >
                  {t('ui.symbol.plus')}
                </button>
              </div>
            </div>

            {/* 発動時効果リスト */}
            <div>
              <label className={constant.USER_FORM_SECTION_LABEL}>{t('userSupport.pitem_actions')}</label>
              <div className="flex flex-col gap-2">
                {form.pItemEffects.map((effect, i) => (
                  <div key={i} className="bg-white rounded-lg p-2.5 border border-slate-200 relative">
                    {/* 削除ボタン */}
                    <button
                      type="button"
                      onClick={() => removeEffect(i)}
                      className="absolute top-1.5 right-1.5 text-slate-300 hover:text-red-500 text-xs leading-none"
                    >
                      {t('userSupport.pitem_remove_effect')}
                    </button>
                    {/* 条件（効果タイプ） */}
                    <div>
                      <label className="text-[10px] text-slate-400">{t('userSupport.pitem_effect_type')}</label>
                      <select
                        value={effect.action}
                        onChange={(e) => updateEffect(i, { ...effect, action: e.target.value as enums.ActionIdType })}
                        className={`${constant.USER_FORM_SELECT} pr-6`}
                      >
                        {data.PITEM_EFFECT_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {t(opt.labelKey)}
                          </option>
                        ))}
                      </select>
                    </div>
                    {/* 回数 */}
                    <div className="mt-1.5">
                      <label className="text-[10px] text-slate-400">{t('userSupport.pitem_effect_body_count')}</label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const v = Number(effect.count) || 0
                            if (v > 1) updateEffect(i, { ...effect, count: String(v - 1) })
                          }}
                          className={constant.SPINNER_BTN + ' ' + constant.BTN_TOGGLE_INACTIVE}
                        >
                          {t('ui.symbol.minus')}
                        </button>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={effect.count}
                          onChange={(e) => {
                            if (e.target.value === '' || /^\d+$/.test(e.target.value))
                              updateEffect(i, { ...effect, count: e.target.value })
                          }}
                          placeholder="1"
                          className={`${constant.SPINNER_INPUT} ${validation.pItemBodyCountError && !effect.count ? 'border-red-400 focus:ring-red-500' : 'border-slate-200'}`}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const v = Number(effect.count) || 0
                            updateEffect(i, { ...effect, count: String(v + 1) })
                          }}
                          className={constant.SPINNER_BTN + ' ' + constant.BTN_TOGGLE_INACTIVE}
                        >
                          {t('ui.symbol.plus')}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {validation.pItemBodyCountError && form.pItemEffects.some((e) => !e.count) && (
                <p className="text-xs text-red-500 mt-1">{t(validation.pItemBodyCountError)}</p>
              )}
              {/* 追加ボタン */}
              <button
                type="button"
                onClick={addEffect}
                className="mt-2 w-full py-2 rounded-lg border border-dashed border-slate-300 text-slate-400 hover:text-blue-600 hover:border-blue-400 transition-colors text-sm flex items-center justify-center"
              >
                {t('userSupport.pitem_add_icon')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
