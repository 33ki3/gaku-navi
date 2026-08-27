/**
 * ユーザーサポートフォームのエラー種別マスタ。
 *
 * エラー種別と画面表示に使う翻訳キーの対応を、UI用マスタとしてまとめる。
 */
import type { TranslationKey } from '../../i18n'

/** ユーザーサポートフォームで発生するエラー種別 */
export const FormErrorType = {
  NameRequired: 'name_required',
  NameDuplicate: 'name_duplicate',
  AbilityRequired: 'ability_required',
  BodyCountRequired: 'body_count_required',
} as const
export type FormErrorType = (typeof FormErrorType)[keyof typeof FormErrorType]

/** 全エラー種別（テスト・一覧処理用） */
export const FORM_ERROR_TYPES: readonly FormErrorType[] = Object.values(FormErrorType)

const FORM_ERROR_TRANSLATION_KEYS: Record<FormErrorType, TranslationKey> = {
  [FormErrorType.NameRequired]: 'user_support.validation_name_required',
  [FormErrorType.NameDuplicate]: 'user_support.validation_name_duplicate',
  [FormErrorType.AbilityRequired]: 'user_support.validation_ability_required',
  [FormErrorType.BodyCountRequired]: 'user_support.validation_body_count_required',
}

/** エラー種別に対応する翻訳キーを返す */
export function getFormErrorTranslationKey(errorType: FormErrorType): TranslationKey {
  return FORM_ERROR_TRANSLATION_KEYS[errorType]
}
