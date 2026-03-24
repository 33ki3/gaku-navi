/**
 * i18n（多言語対応）の設定ファイル
 *
 * i18next を使って日本語の翻訳リソースを読み込み、
 * アプリ全体で useTranslation() / t() が使えるようにする。
 */
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import type { ParseKeys } from 'i18next'

import ja from './locales/ja.json'

/** 翻訳キー型 */
export type TranslationKey = ParseKeys

/** デフォルト言語 */
const DEFAULT_LANG = 'ja'

/** デフォルト名前空間 */
const DEFAULT_NS = 'translation'

i18n.use(initReactI18next).init({
  resources: {
    ja: { [DEFAULT_NS]: ja },
  },
  lng: DEFAULT_LANG,
  fallbackLng: DEFAULT_LANG,
  ns: [DEFAULT_NS],
  defaultNS: DEFAULT_NS,
  interpolation: {
    escapeValue: false,
  },
})

export default i18n
