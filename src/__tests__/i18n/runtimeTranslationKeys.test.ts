/**
 * マスタとカードデータから生成される翻訳キーを検証するテスト。
 *
 * 静的な `t('...')` はi18next-cliが確認するため、ここでは実行時に組み立てるキーだけを扱う。
 */
import { describe, expect, it } from 'vitest'
import ja from '../../i18n/locales/ja.json'
import {
  collectCardTranslationKeys,
  collectFormErrorTranslationKeys,
  collectMasterTranslationKeys,
  collectRuntimeTranslationKeys,
} from '../../i18n/runtimeTranslationKeys'

type LocaleResource = Record<string, unknown>

const locale = ja as LocaleResource

/** ドット区切りのキーから翻訳JSONの値を取得する */
function getLocaleValue(key: string): unknown {
  return key.split('.').reduce<unknown>((current, segment) => {
    if (current === null || typeof current !== 'object') return undefined
    return (current as Record<string, unknown>)[segment]
  }, locale)
}

const keySources = [
  ['カードデータ', collectCardTranslationKeys],
  ['マスタデータ', collectMasterTranslationKeys],
  ['フォームエラー', collectFormErrorTranslationKeys],
] as const

describe('実行時に生成する翻訳キー', () => {
  it.each(keySources)('%sのキーが翻訳JSONに存在する', (_label, collectKeys) => {
    const invalidKeys = collectKeys().filter((key) => typeof getLocaleValue(key) !== 'string')

    expect(invalidKeys).toEqual([])
  })

  it('結合した実行時キーが翻訳JSONに存在する', () => {
    const invalidKeys = collectRuntimeTranslationKeys().filter((key) => typeof getLocaleValue(key) !== 'string')

    expect(invalidKeys).toEqual([])
  })
})
