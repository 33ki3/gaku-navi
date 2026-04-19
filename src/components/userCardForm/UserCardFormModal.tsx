/**
 * ユーザー定義サポート追加・編集モーダル
 *
 * セクション形式で基本情報・アビリティ・イベント・Pアイテム・スキルカードを入力するフォーム。
 * 追加・更新時に SupportCard オブジェクトを生成して呼び出し元に返す。
 */
import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import type { SupportCard } from '../../types/card'
import * as enums from '../../types/enums'
import ModalOverlay from '../ui/ModalOverlay'
import CloseButton from '../ui/CloseButton'
import CollapsibleSection from '../ui/CollapsibleSection'
import * as constant from '../../constant'
import { useUserCardForm } from '../../hooks/useUserCardForm'
import { useAccordionState } from '../../hooks/useAccordionState'
import BasicInfoSection from './BasicInfoSection'
import AbilitySection from './AbilitySection'
import EventSection from './EventSection'
import PItemSection from './PItemSection'
import SkillCardSection from './SkillCardSection'

/** UserCardFormModal コンポーネントに渡すプロパティ */
interface UserCardFormModalProps {
  /** モーダルを閉じる関数 */
  onClose: () => void
  /** 保存時のコールバック（新規 or 更新後の SupportCard を受け取る） */
  onSave: (card: SupportCard) => void
  /** 編集時の元カード（新規作成時は undefined） */
  editingCard?: SupportCard
  /** 既存カード名の Set（重複チェック用） */
  existingNames: Set<string>
}

/** ユーザー定義サポート追加・編集モーダル */
export default memo(function UserCardFormModal({
  onClose,
  onSave,
  editingCard,
  existingNames,
}: UserCardFormModalProps) {
  const { t } = useTranslation()
  const formHook = useUserCardForm(editingCard, existingNames)
  const { state: accordion, toggle } = useAccordionState<enums.UserFormSectionKey>({
    [enums.UserFormSectionKey.Abilities]: true,
    [enums.UserFormSectionKey.Events]: true,
    [enums.UserFormSectionKey.PItem]: true,
    [enums.UserFormSectionKey.SkillCard]: true,
  })

  // イベント初回がPアイテムかスキルカードかで下部セクション表示を切替
  const firstEventIsPItem = formHook.form.events[0].effectType === enums.EventEffectType.PItem
  const firstEventIsSkillCard = formHook.form.events[0].effectType === enums.EventEffectType.SkillCard

  /** 初回イベント変更時にPアイテム/スキルカードを連動 */
  const handleFirstEventChange = (effectType: enums.EventEffectType) => {
    if (effectType === enums.EventEffectType.PItem) {
      formHook.updateField('hasPItem', true)
      formHook.updateField('hasSkillCard', false)
    } else if (effectType === enums.EventEffectType.SkillCard) {
      formHook.updateField('hasSkillCard', true)
      formHook.updateField('hasPItem', false)
    }
  }

  /** 保存ボタン押下 */
  const handleSave = () => {
    if (!formHook.isValid) return
    onSave(formHook.toSupportCard())
    onClose()
  }

  return (
    <ModalOverlay onClose={onClose} panelClassName={constant.MODAL_PANEL_USER_CARD}>
      {/* ヘッダー：タイトル + 閉じるボタン */}
      <div className="sticky top-0 bg-white z-10 border-b border-slate-200 px-5 py-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-black text-slate-800">
            {t(editingCard ? 'userSupport.edit_title' : 'userSupport.create_title')}
          </h2>
          <CloseButton onClick={onClose} size={enums.ButtonSizeType.Sm} />
        </div>
      </div>

      {/* セクションコンテンツ */}
      <div className="px-5 py-4 overflow-y-auto flex-1">
        {/* 基本情報 */}
        <BasicInfoSection
          form={formHook.form}
          updateField={formHook.updateField}
          setRarity={formHook.setRarity}
          setType={formHook.setType}
          setIsEventSource={formHook.setIsEventSource}
          validation={formHook.validation}
        />

        {/* アビリティ */}
        <div className={constant.USER_FORM_SECTION_DIVIDER}>
          <CollapsibleSection
            title={<span className="text-xs font-black text-slate-700">{t('userSupport.tab_abilities')}</span>}
            isOpen={accordion[enums.UserFormSectionKey.Abilities]}
            onToggle={() => toggle(enums.UserFormSectionKey.Abilities)}
          >
            <div className="mt-3">
              <AbilitySection
                form={formHook.form}
                addAbility={formHook.addAbility}
                updateAbility={formHook.updateAbility}
                removeAbility={formHook.removeAbility}
                abilityError={formHook.validation.abilityError}
              />
            </div>
          </CollapsibleSection>
        </div>

        {/* イベント */}
        <div className={constant.USER_FORM_SECTION_DIVIDER}>
          <CollapsibleSection
            title={<span className="text-xs font-black text-slate-700">{t('userSupport.tab_events')}</span>}
            isOpen={accordion[enums.UserFormSectionKey.Events]}
            onToggle={() => toggle(enums.UserFormSectionKey.Events)}
          >
            <div className="mt-3">
              <EventSection
                form={formHook.form}
                updateEvent={formHook.updateEvent}
                onFirstEventChange={handleFirstEventChange}
              />
            </div>
          </CollapsibleSection>
        </div>

        {/* Pアイテム（初回イベントがPアイテムの場合のみ） */}
        {firstEventIsPItem && (
          <div className={constant.USER_FORM_SECTION_DIVIDER}>
            <CollapsibleSection
              title={<span className="text-xs font-black text-slate-700">{t('userSupport.tab_pitem')}</span>}
              isOpen={accordion[enums.UserFormSectionKey.PItem]}
              onToggle={() => toggle(enums.UserFormSectionKey.PItem)}
            >
              <div className="mt-3">
                <PItemSection
                  form={formHook.form}
                  updateField={formHook.updateField}
                  validation={formHook.validation}
                />
              </div>
            </CollapsibleSection>
          </div>
        )}

        {/* スキルカード（初回イベントがスキルカードの場合のみ） */}
        {firstEventIsSkillCard && (
          <div className={constant.USER_FORM_SECTION_DIVIDER}>
            <CollapsibleSection
              title={<span className="text-xs font-black text-slate-700">{t('userSupport.tab_skillcard')}</span>}
              isOpen={accordion[enums.UserFormSectionKey.SkillCard]}
              onToggle={() => toggle(enums.UserFormSectionKey.SkillCard)}
            >
              <div className="mt-3">
                <SkillCardSection form={formHook.form} updateField={formHook.updateField} />
              </div>
            </CollapsibleSection>
          </div>
        )}
      </div>

      {/* フッター：保存・キャンセルボタン */}
      <div className="sticky bottom-0 bg-white border-t border-slate-200 px-5 py-3 flex justify-end gap-3">
        <button
          onClick={onClose}
          className="px-4 py-2 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
        >
          {t('userSupport.cancel')}
        </button>
        <button
          onClick={handleSave}
          disabled={!formHook.isValid}
          className={`px-4 py-2 rounded-lg text-xs font-bold text-white transition-colors ${
            formHook.isValid ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-300 cursor-not-allowed'
          }`}
        >
          {t('userSupport.save')}
        </button>
      </div>
    </ModalOverlay>
  )
})
