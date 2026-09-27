import { act, renderHook } from '@testing-library/react'
import { useCallback, useState } from 'react'
import { describe, expect, it } from 'vitest'

import { useCommandStatePort } from '../../hooks/useCommandStatePort'
import { ApplicationDomain } from '../../types/application'

describe('useCommandStatePort', () => {
  it('Reactへ反映されたrevisionだけを同期完了として返す', async () => {
    const { result } = renderHook(() => {
      const [value, setValue] = useState({ count: 0 })
      return { value, port: useCommandStatePort(ApplicationDomain.Calculation, value, setValue) }
    })
    const initialRevision = result.current.port.getSnapshot().revision
    let commandResult = await result.current.port.commit({ count: 0 })
    expect(commandResult).toMatchObject({ ok: true, changed: false, revision: initialRevision })

    await act(async () => {
      commandResult = await result.current.port.commit({ count: 1 }, { expectedRevision: initialRevision })
    })
    if (!commandResult.ok) throw new Error('command should succeed')

    expect(result.current.value).toEqual({ count: 1 })
    await expect(result.current.port.waitForRevision?.(commandResult.revision, 20)).resolves.toBe(true)
  })

  it('古いrevisionのcommitではReact stateを変更しない', async () => {
    const { result } = renderHook(() => {
      const [value, setValue] = useState({ count: 0 })
      return { value, port: useCommandStatePort(ApplicationDomain.Calculation, value, setValue) }
    })
    const staleRevision = result.current.port.getSnapshot().revision

    await act(async () => {
      await result.current.port.commit({ count: 1 })
    })
    await act(async () => {
      const stale = await result.current.port.commit({ count: 2 }, { expectedRevision: staleRevision })
      expect(stale).toMatchObject({ ok: false, error: { code: 'stale_revision' } })
    })

    expect(result.current.value).toEqual({ count: 1 })
  })

  it('公開した値より古いReact stateでcommand revisionを上書きしない', async () => {
    const { result } = renderHook(() => {
      const [value, setValue] = useState({ count: 0 })
      const publish = useCallback((nextValue: { count: number }) => {
        setValue({ count: 0 })
        window.setTimeout(() => setValue(nextValue), 20)
      }, [])
      return { value, port: useCommandStatePort(ApplicationDomain.Calculation, value, publish) }
    })
    let commandRevision: string | undefined
    await act(async () => {
      const commandResult = await result.current.port.commit({ count: 1 })
      if (!commandResult.ok) throw new Error('command should succeed')
      commandRevision = commandResult.revision
    })
    const stateAfterStaleRender = result.current.port.getSnapshot().value
    let synchronized = false
    const waiting = commandRevision ? result.current.port.waitForRevision?.(commandRevision, 100) : undefined

    await act(async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 40))
    })
    synchronized = (await waiting) === true

    expect(stateAfterStaleRender).toEqual({ count: 1 })
    expect(synchronized).toBe(true)
    expect(result.current.value).toEqual({ count: 1 })
  })
})
