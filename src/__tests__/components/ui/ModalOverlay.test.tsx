/**
 * 共通モーダルのダイアログ属性とフォーカス制御を検証する
 */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import ModalOverlay from '../../../components/ui/ModalOverlay'

afterEach(cleanup)

/** 開閉起点と2つの操作を持つ最小のモーダル */
function ModalHarness() {
  const [isOpen, setIsOpen] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setIsOpen(true)}>
        開く
      </button>
      {isOpen && (
        <ModalOverlay onClose={() => setIsOpen(false)} panelClassName="bg-white" ariaLabel="確認モーダル">
          <button type="button">最初</button>
          <button type="button">最後</button>
        </ModalOverlay>
      )}
    </>
  )
}

describe('ModalOverlay', () => {
  it('dialogとして公開し、表示時に最初の操作へフォーカスする', async () => {
    render(<ModalHarness />)
    fireEvent.click(screen.getByRole('button', { name: '開く' }))

    const dialog = screen.getByRole('dialog', { name: '確認モーダル' })
    expect(dialog.getAttribute('aria-modal')).toBe('true')
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('button', { name: '最初' })))
  })

  it('Escapeで閉じた後に開閉起点へフォーカスを戻す', async () => {
    render(<ModalHarness />)
    const openButton = screen.getByRole('button', { name: '開く' })
    openButton.focus()
    fireEvent.click(openButton)
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('button', { name: '最初' })))

    fireEvent.keyDown(document, { key: 'Escape' })

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(document.activeElement).toBe(openButton)
  })
})
