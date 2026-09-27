import { renderHook, waitFor } from '@testing-library/react'
import { type PropsWithChildren, StrictMode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { useWebMcp } from '../../hooks/useWebMcp'
import { WEB_MCP_TOOL_MANIFEST_NAMES } from '../../webmcp/manifest'
import type { WebMcpRuntime } from '../../webmcp/types'

const runtime: WebMcpRuntime = {
  getCards: () => [],
  getCardByName: () => new Map(),
  getCalculationSnapshot: () => {
    throw new Error('テストでは計算snapshotを使わない')
  },
  getFilterState: () => {
    throw new Error('テストではフィルター状態を使わない')
  },
  getPreferences: () => {
    throw new Error('テストでは表示設定を使わない')
  },
  getUserSupports: () => [],
  refreshFromStorage: () => Promise.resolve(),
  getUiState: () => {
    throw new Error('テストではUI状態を使わない')
  },
  controlUi: () => undefined,
}

function StrictModeWrapper({ children }: PropsWithChildren) {
  return <StrictMode>{children}</StrictMode>
}

afterEach(() => {
  Reflect.deleteProperty(document, 'modelContext')
})

describe('useWebMcp', () => {
  it('非対応ブラウザではツール登録を開始しない', async () => {
    const { unmount } = renderHook(() => useWebMcp(runtime))
    await Promise.resolve()
    unmount()
    expect(document.modelContext).toBeUndefined()
  })

  it('StrictModeでも現行世代だけを登録し、unmount時に全登録を解除する', async () => {
    const registerTool = vi.fn((tool: unknown, options?: { signal?: AbortSignal }): Promise<void> => {
      void tool
      void options
      return Promise.resolve()
    })
    Object.defineProperty(document, 'modelContext', {
      configurable: true,
      value: { registerTool },
    })

    const { unmount } = renderHook(() => useWebMcp(runtime), { wrapper: StrictModeWrapper })

    await waitFor(() => expect(registerTool).toHaveBeenCalledTimes(WEB_MCP_TOOL_MANIFEST_NAMES.length), {
      timeout: 5000,
    })
    const signals = registerTool.mock.calls
      .map((call) => call[1]?.signal)
      .filter((signal): signal is AbortSignal => signal !== undefined)
    expect(new Set(signals).size).toBe(1)
    const [signal] = signals
    if (!signal) throw new Error('登録signalが見つからない')
    expect(signal.aborted).toBe(false)

    unmount()
    expect(signal.aborted).toBe(true)
  })
})
