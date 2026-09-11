/// <reference types="node" />

/**
 * 日本語ロケールJSONそのものを検証するテスト。
 *
 * JSON.parseでは重複キーが上書きされるため、TypeScriptのJSON構文木で重複を確認する。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import * as ts from 'typescript'
import { describe, expect, it } from 'vitest'
import ja from '../../i18n/locales/ja.json'

const localeFile = resolve(process.cwd(), 'src/i18n/locales/ja.json')
const locale = ja as Record<string, unknown>

/** JSONの各オブジェクトを走査し、重複キーのパスを集める */
function findDuplicateKeys(node: ts.Node, path: readonly string[] = [], duplicates: string[] = []): string[] {
  if (ts.isObjectLiteralExpression(node)) {
    const seen = new Set<string>()
    for (const property of node.properties) {
      if (!ts.isPropertyAssignment(property)) continue
      const key = ts.isIdentifier(property.name) || ts.isStringLiteral(property.name) ? property.name.text : undefined
      if (key === undefined) continue
      if (seen.has(key)) duplicates.push([...path, key].join('.'))
      seen.add(key)
      findDuplicateKeys(property.initializer, [...path, key], duplicates)
    }
    return duplicates
  }

  if (ts.isArrayLiteralExpression(node)) {
    node.elements.forEach((element, index) => findDuplicateKeys(element, [...path, String(index)], duplicates))
    return duplicates
  }

  ts.forEachChild(node, (child) => findDuplicateKeys(child, path, duplicates))
  return duplicates
}

/** ロケール内の空オブジェクトと値のないプレースホルダーを集める */
function findInvalidLocaleValues(value: unknown, path: readonly string[] = [], invalid: string[] = []): string[] {
  if (typeof value === 'string') {
    if (/\{\{\s*\}\}|\{\s*\}/.test(value)) invalid.push(path.join('.'))
    return invalid
  }

  if (value === null || typeof value !== 'object') return invalid
  if (!Array.isArray(value) && Object.keys(value).length === 0) invalid.push(path.join('.'))

  if (Array.isArray(value)) {
    value.forEach((item, index) => findInvalidLocaleValues(item, [...path, String(index)], invalid))
  } else {
    Object.entries(value).forEach(([key, item]) => findInvalidLocaleValues(item, [...path, key], invalid))
  }

  return invalid
}

describe('ja.json', () => {
  it('JSONの構文エラーと重複キーがない', () => {
    const source = readFileSync(localeFile, 'utf8')
    const jsonFile = ts.parseJsonText(localeFile, source)
    const diagnostics =
      (jsonFile as ts.JsonSourceFile & { parseDiagnostics?: readonly ts.Diagnostic[] }).parseDiagnostics ?? []

    expect(diagnostics).toEqual([])
    expect(findDuplicateKeys(jsonFile)).toEqual([])
  })

  it('空のオブジェクトと空のプレースホルダーがない', () => {
    expect(findInvalidLocaleValues(locale)).toEqual([])
  })
})
