/**
 * i18n（多言語対応）の設定ファイル
 *
 * i18next を使って日本語の翻訳リソースを読み込み、
 * アプリ全体で useTranslation() / t() が使えるようにする。
 */
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import type { ParseKeys } from 'i18next'

/** 翻訳キー型 */
export type TranslationKey = ParseKeys

/** デフォルト言語 */
const DEFAULT_LANG = 'ja'

/** デフォルト名前空間 */
const DEFAULT_NS = 'translation'

/** 翻訳JSONをi18nextへ登録する */
export function initializeI18n(ja: Record<string, unknown>): Promise<void> {
  return i18n
    .use(initReactI18next)
    .init({
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
    .then(() => undefined)
}

export default i18n
