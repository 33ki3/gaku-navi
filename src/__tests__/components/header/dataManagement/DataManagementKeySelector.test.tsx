import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import DataManagementKeySelector from '../../../../components/header/dataManagement/DataManagementKeySelector'
import * as constant from '../../../../constant'
import * as data from '../../../../data/ui'
import i18n from '../../../../i18n'

function renderSelector(selectedKeys: data.ExportKey[] = [...data.EXPORT_KEYS]) {
  return render(
    <I18nextProvider i18n={i18n}>
      <DataManagementKeySelector
        isOpen
        onToggle={vi.fn()}
        selectedKeys={selectedKeys}
        onToggleKey={vi.fn()}
        onSelectAll={vi.fn()}
        onClearAll={vi.fn()}
      />
    </I18nextProvider>,
  )
}

describe('DataManagementKeySelector', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    cleanup()
  })

  it('保存項目をトグルボタンで選択状態と未保存状態つきで表示する', () => {
    localStorage.setItem(constant.UNCAP_STORAGE_KEY, '{}')
    renderSelector([constant.UNCAP_STORAGE_KEY])

    expect(screen.getByRole('button', { name: '凸数設定' }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('button', { name: '点数設定保存なし' }).getAttribute('aria-pressed')).toBe('false')
    expect(screen.getAllByText('保存なし').length).toBeGreaterThan(0)
    expect(screen.getByText('1 / 10 件選択中')).toBeTruthy()
  })

  it('セクションの開閉を呼び出し元へ通知する', () => {
    const onToggle = vi.fn()
    render(
      <I18nextProvider i18n={i18n}>
        <DataManagementKeySelector
          isOpen
          onToggle={onToggle}
          selectedKeys={[]}
          onToggleKey={vi.fn()}
          onSelectAll={vi.fn()}
          onClearAll={vi.fn()}
        />
      </I18nextProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: /対象データ/ }))

    expect(onToggle).toHaveBeenCalledOnce()
  })

  it('全選択と全解除を呼び出し元へ通知する', () => {
    const onSelectAll = vi.fn()
    const onClearAll = vi.fn()
    render(
      <I18nextProvider i18n={i18n}>
        <DataManagementKeySelector
          isOpen
          onToggle={vi.fn()}
          selectedKeys={[constant.UNCAP_STORAGE_KEY]}
          onToggleKey={vi.fn()}
          onSelectAll={onSelectAll}
          onClearAll={onClearAll}
        />
      </I18nextProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: '全選択' }))
    fireEvent.click(screen.getByRole('button', { name: '全解除' }))

    expect(onSelectAll).toHaveBeenCalledOnce()
    expect(onClearAll).toHaveBeenCalledOnce()
  })

  it('個別項目のトグルで保存キーを呼び出し元へ渡す', () => {
    const onToggleKey = vi.fn()
    localStorage.setItem(constant.UNCAP_STORAGE_KEY, '{}')
    render(
      <I18nextProvider i18n={i18n}>
        <DataManagementKeySelector
          isOpen
          onToggle={vi.fn()}
          selectedKeys={[]}
          onToggleKey={onToggleKey}
          onSelectAll={vi.fn()}
          onClearAll={vi.fn()}
        />
      </I18nextProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: '凸数設定' }))

    expect(onToggleKey).toHaveBeenCalledOnce()
    expect(onToggleKey).toHaveBeenCalledWith(constant.UNCAP_STORAGE_KEY)
  })
})
