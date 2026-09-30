/**
 * 遅延モジュールの共有ローダーと先読みを検証する。
 */
import { render, screen } from '@testing-library/react'
import { Suspense, createElement } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import * as lazyPreload from '../../utils/lazyPreload'
import { createPreloadedComponent } from '../../utils/preloadedComponent'

describe('lazyPreload', () => {
  afterEach(() => {
    document.body.innerHTML = ''
    vi.restoreAllMocks()
  })

  it('同じ遅延モジュールのPromiseを共有してimportを1回にする', async () => {
    const importer = vi.fn(() => Promise.resolve({ default: 'loaded' }))
    const load = lazyPreload.createLazyModuleLoader(importer)

    expect(load.getResolved()).toBeUndefined()
    const first = load()
    const second = load()

    expect(first).toBe(second)
    await first
    expect(importer).toHaveBeenCalledTimes(1)
    expect(load.getResolved()).toEqual({ default: 'loaded' })
  })

  it('登録した遅延モジュールをまとめて先読みする', async () => {
    const firstLoader = vi.fn(() => Promise.resolve('first'))
    const secondLoader = vi.fn(() => Promise.resolve('second'))

    await expect(lazyPreload.preloadAllLazyModules([firstLoader, secondLoader])).resolves.toBeUndefined()

    expect(firstLoader).toHaveBeenCalledOnce()
    expect(secondLoader).toHaveBeenCalledOnce()
  })

  it('先読み完了済みなら初回表示でSuspenseのフォールバックを経由しない', async () => {
    const importer = vi.fn(() => Promise.resolve({ default: () => createElement('span', null, 'ready') }))
    const load = lazyPreload.createLazyModuleLoader(importer)
    const PreloadedComponent = createPreloadedComponent(load)

    await load()
    const view = render(
      createElement(Suspense, { fallback: createElement('span', null, 'loading') }, createElement(PreloadedComponent)),
    )

    expect(screen.getByText('ready')).toBeTruthy()
    expect(screen.queryByText('loading')).toBeNull()
    view.unmount()
  })
})
