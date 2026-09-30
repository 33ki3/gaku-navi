import type { ChangeEvent } from 'react'
import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useDataManagementController } from '../../../../components/header/dataManagement/useDataManagementController'
import * as constant from '../../../../constant'
import * as enums from '../../../../types/enums'

function createFileChangeEvent(file: File): ChangeEvent<HTMLInputElement> {
  return { target: { files: [file] } } as unknown as ChangeEvent<HTMLInputElement>
}

function createImportText(data: Record<string, unknown>): string {
  return JSON.stringify({
    version: constant.EXPORT_VERSION,
    exportedAt: '2026-08-16T00:00:00.000Z',
    data,
  })
}

describe('useDataManagementController', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('対象データとJSON文字列セクションを初期状態と再表示時に閉じる', () => {
    const { result } = renderHook(() => useDataManagementController({}))

    expect(result.current.isSelectionSectionOpen).toBe(false)
    expect(result.current.isFileSectionOpen).toBe(true)
    expect(result.current.isJsonSectionOpen).toBe(false)

    act(() => result.current.toggleSection(enums.DataManagementSectionKey.Selection))
    expect(result.current.isSelectionSectionOpen).toBe(true)

    act(() => result.current.openModal())
    expect(result.current.isSelectionSectionOpen).toBe(false)
    expect(result.current.isJsonSectionOpen).toBe(false)
  })

  it('不正JSONの編集中は対象キー変更を保留し、修正後に編集内容を引き継ぐ', () => {
    localStorage.setItem(constant.UNCAP_STORAGE_KEY, JSON.stringify({ カード: enums.UncapType.Three }))
    localStorage.setItem(constant.SCORE_PRESETS_STORAGE_KEY, JSON.stringify([]))
    const { result } = renderHook(() => useDataManagementController({}))

    act(() => result.current.openModal())
    act(() => result.current.toggleKey(constant.SCORE_PRESETS_STORAGE_KEY))

    const validText = result.current.jsonText
    const invalidText = `${validText},`
    act(() => result.current.setJsonText(invalidText))
    act(() => result.current.toggleKey(constant.SCORE_PRESETS_STORAGE_KEY))

    expect(result.current.selectedKeys).not.toContain(constant.SCORE_PRESETS_STORAGE_KEY)
    expect(result.current.jsonText).toBe(invalidText)
    expect(result.current.message?.type).toBe(enums.DataManagementMessageType.Error)

    act(() => result.current.setJsonText(validText))
    act(() => result.current.toggleKey(constant.SCORE_PRESETS_STORAGE_KEY))

    expect(result.current.selectedKeys).toContain(constant.SCORE_PRESETS_STORAGE_KEY)
    expect(JSON.parse(result.current.jsonText).data[constant.UNCAP_STORAGE_KEY]).toEqual({
      カード: enums.UncapType.Three,
    })
    expect(JSON.parse(result.current.jsonText).data[constant.SCORE_PRESETS_STORAGE_KEY]).toEqual([])
  })

  it('ファイルの読み込み完了時点の対象キーでプレビューを作る', async () => {
    localStorage.setItem(constant.UNCAP_STORAGE_KEY, JSON.stringify({ カード: enums.UncapType.Three }))
    localStorage.setItem(constant.SCORE_PRESETS_STORAGE_KEY, JSON.stringify([]))
    const { result } = renderHook(() => useDataManagementController({}))

    act(() => result.current.openModal())

    let resolveFileText: ((text: string) => void) | undefined
    const fileText = new Promise<string>((resolve) => {
      resolveFileText = resolve
    })
    const file = { text: vi.fn(() => fileText) } as unknown as File
    let importPromise = Promise.resolve()
    act(() => {
      importPromise = result.current.importFile(createFileChangeEvent(file))
    })

    act(() => result.current.toggleKey(constant.UNCAP_STORAGE_KEY))
    expect(result.current.selectedKeys).not.toContain(constant.UNCAP_STORAGE_KEY)

    if (!resolveFileText) throw new Error('ファイル読み込みの完了関数が設定されていません')
    await act(async () => {
      resolveFileText?.(
        createImportText({
          [constant.UNCAP_STORAGE_KEY]: { 読み込みカード: enums.UncapType.Four },
          [constant.SCORE_PRESETS_STORAGE_KEY]: [],
        }),
      )
      await importPromise
    })

    expect(result.current.pendingImport?.preview.entries?.map(([key]) => key)).toEqual([
      constant.SCORE_PRESETS_STORAGE_KEY,
    ])
  })
})
