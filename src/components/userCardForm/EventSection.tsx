/**
 * ユーザーサポートフォーム：サポートイベントセクション
 *
 * レアリティ別イベント構成:
 *   R:   パラメータ上昇(自動) + Pポイント獲得(自動)
 *   SR:  初回イベント(PItem/SkillCard) + パラメータ上昇(自動)
 *   SSR: 初回イベント(PItem/SkillCard) + パラメータ上昇(自動) + 追加イベント
 * パラメータ種別はカードタイプから自動決定する。
 */
import { useTranslation } from 'react-i18next'
import type { UserCardFormState, EventFormRow } from '../../hooks/formHelpers'
import * as enums from '../../types/enums'
import * as data from '../../data'

import * as constant from '../../constant'

/** EventSection コンポーネントに渡すプロパティ */
interface EventSectionProps {
  /** フォーム状態 */
  form: UserCardFormState
  /** イベント更新関数 */
  updateEvent: (index: number, row: EventFormRow) => void
  /** 初回イベント種別変更時のコールバック */
  onFirstEventChange?: (effectType: enums.EventEffectType) => void
}

/** イベント入力セクション */
export default function EventSection({ form, updateEvent, onFirstEventChange }: EventSectionProps) {
  const { t } = useTranslation()

  const paramType = form.parameterType ?? enums.ParameterType.Vocal

  /** 初回イベント変更 */
  const handleFirstChange = (value: string) => {
    const effectType = value as enums.EventEffectType
    updateEvent(0, {
      effectType,
      paramType,
      paramValue: '',
      title: '',
    })
    onFirstEventChange?.(effectType)
  }

  /** 追加イベント変更 */
  const handleThirdChange = (value: string) => {
    if (value === '') {
      updateEvent(2, {
        effectType: enums.EventEffectType.ParamBoost,
        paramType,
        paramValue: '',
        title: '',
      })
    } else {
      updateEvent(2, {
        effectType: value as enums.EventEffectType,
        paramType,
        paramValue: '',
        title: '',
      })
    }
  }

  /** イベント番号（1始まり）を表示する */
  let eventNumber = 0

  return (
    <div className="flex flex-col gap-2">
      {/* 初回イベント（SR/SSR のみ） */}
      {form.rarity !== enums.RarityType.R && (
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-slate-400 w-4 shrink-0 text-center">{++eventNumber}</span>
          <select
            value={form.events[0].effectType}
            onChange={(e) => handleFirstChange(e.target.value)}
            className={`${constant.USER_FORM_SELECT} flex-1`}
          >
            {data.FIRST_EVENT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {t(opt.labelKey)}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* パラメータ上昇（自動表示・選択不可） */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-bold text-slate-400 w-4 shrink-0 text-center">{++eventNumber}</span>
        <select
          disabled
          className={`${constant.USER_FORM_SELECT} flex-1 bg-slate-100 text-slate-500 cursor-not-allowed`}
        >
          <option>
            {t('userSupport.event_param_boost')} ({t(data.getParamLabel(paramType))}) +
            {data.EVENT_PARAM_VALUE[form.rarity]}
          </option>
        </select>
      </div>

      {/* Rカードの場合、Pポイント獲得を表示 */}
      {form.rarity === enums.RarityType.R && (
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-slate-400 w-4 shrink-0 text-center">{++eventNumber}</span>
          <select
            disabled
            className={`${constant.USER_FORM_SELECT} flex-1 bg-slate-100 text-slate-500 cursor-not-allowed`}
          >
            <option>{t('userSupport.event_pp_gain')}</option>
          </select>
        </div>
      )}

      {/* 追加イベント（SSR のみ） */}
      {form.rarity === enums.RarityType.SSR && (
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-slate-400 w-4 shrink-0 text-center">{++eventNumber}</span>
          <select
            value={
              form.events[2]?.effectType === enums.EventEffectType.ParamBoost ? '' : (form.events[2]?.effectType ?? '')
            }
            onChange={(e) => handleThirdChange(e.target.value)}
            className={`${constant.USER_FORM_SELECT} flex-1`}
          >
            {data.THIRD_EVENT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {t(opt.labelKey)}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  )
}
