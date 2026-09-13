/**
 * 最適編成から除外するサポートを管理するフック。
 *
 * 除外状態は最適編成設定へ含め、カード一覧と最適編成の両方から同じ状態を参照する。
 */
import { useCallback, useMemo } from 'react'

import { useUnitSimulatorSettingsState } from './useUnitSimulatorSettingsState'

/** useCardExclusions の返却型 */
interface CardExclusionsState {
  /** 最適編成から除外するサポート名の集合 */
  excludedCardNames: ReadonlySet<string>
  /** サポートが除外対象か判定する */
  isCardExcluded: (cardName: string) => boolean
  /** サポートの除外状態を切り替える */
  toggleCardExcluded: (cardName: string) => void
}

/**
 * サポートの最適編成除外状態を管理する
 *
 * @returns 除外対象と更新操作
 */
export function useCardExclusions(): CardExclusionsState {
  const { settings, setSettings, settingsRef } = useUnitSimulatorSettingsState()
  const excludedCardNames = useMemo(() => new Set(settings.excludedCardNames), [settings.excludedCardNames])

  const isCardExcluded = useCallback((cardName: string) => excludedCardNames.has(cardName), [excludedCardNames])

  const toggleCardExcluded = useCallback(
    (cardName: string) => {
      const nextExcludedCardNames = new Set(settingsRef.current.excludedCardNames)
      if (nextExcludedCardNames.has(cardName)) nextExcludedCardNames.delete(cardName)
      else nextExcludedCardNames.add(cardName)

      setSettings({
        ...settingsRef.current,
        excludedCardNames: [...nextExcludedCardNames],
      })
    },
    [setSettings, settingsRef],
  )

  return { excludedCardNames, isCardExcluded, toggleCardExcluded }
}
