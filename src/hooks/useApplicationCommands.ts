/** 通常UIとWebMCPへ同じ保存commandを公開するcontroller facade */
import { useCallback, useMemo } from 'react'
import {
  createCalculationCommand,
  createFilterCommand,
  createImportCommand,
  createPreferencesCommand,
  createPresetCommand,
  createUserSupportCommand,
} from '../application/command'
import type { CommandOptions } from '../application/command/ports'
import type { AppPreferences } from '../types/app'
import type { CommandResult } from '../types/application'
import type { ScoreSettings, SupportCard } from '../types/card'
import * as enums from '../types/enums'
import type { UnitSimulatorSettings } from '../types/unit'
import type { ApplicationCommandPorts, UseApplicationCommandPortsOptions } from './useApplicationCommandPorts'
import { useApplicationCommandPorts } from './useApplicationCommandPorts'

const UI_COMMAND_OPTIONS: CommandOptions = { waitForStateSync: false }

/** 通常UIからcommandを呼ぶための互換イベント関数 */
interface ApplicationCommandHandlers {
  /** 点数設定を保存commandへ渡す */
  updateScoreSettings: (settings: ScoreSettings) => void
  /** 最適編成設定を保存commandへ渡す */
  updateUnitSettings: (settings: UnitSimulatorSettings) => void
  /** 表示設定を保存commandへ渡す */
  updatePreferences: (preferences: AppPreferences) => void
  /** ユーザー定義サポートを保存commandへ渡す */
  saveUserSupport: (card: SupportCard) => void
  /** ユーザー定義サポートを保存commandから削除する */
  deleteUserSupport: DeleteUserSupportHandler
  /** カードの凸数を保存commandへ渡す */
  updateCardUncap: UpdateCardUncapHandler
}

/** ユーザー定義サポートを削除する画面handler */
export type DeleteUserSupportHandler = (cardName: string) => void

/** カードの凸数を更新する画面handler */
export type UpdateCardUncapHandler = (cardName: string, uncap: enums.UncapType) => void

/**
 * commandを組み立て、通常UI向けの薄いhandlerと合わせて返す
 *
 * @param options - 画面が保持する各domain状態と外部入力を反映する操作
 * @returns UI/WebMCPが共有するcommandと既存callback用handler
 */
export function useApplicationCommands({ state, ...portOptions }: UseApplicationCommandPortsOptions): {
  commands: ApplicationCommands
  handlers: ApplicationCommandHandlers
} {
  // 通常UIは画面状態の反映を待たず、失敗通知で操作を遮らない
  const handleUiCommand = useCallback(<T>(resultPromise: Promise<CommandResult<T>>, onFailure?: () => void) => {
    void resultPromise.then(
      (result) => {
        if (!result.ok) onFailure?.()
      },
      () => onFailure?.(),
    )
  }, [])

  // 画面stateから保存用portを作る処理を分け、command生成へ渡す
  const ports = useApplicationCommandPorts({ state, ...portOptions })
  const commands = useMemo(() => createCommands(ports), [ports])

  // 既存画面のcallback形を保ち、同期確認なしの保存commandへ接続する
  const handlers = useMemo<ApplicationCommandHandlers>(
    () => ({
      updateScoreSettings: (settings) => {
        handleUiCommand(
          commands.calculation.patch({ scoreSettings: settings }, UI_COMMAND_OPTIONS),
          state.scores.clearScoreSettingsPreview,
        )
      },
      updateUnitSettings: (settings) => {
        handleUiCommand(commands.calculation.patch({ unitSimulatorSettings: settings }, UI_COMMAND_OPTIONS))
      },
      updatePreferences: (preferences) => {
        handleUiCommand(commands.preferences.update(preferences, UI_COMMAND_OPTIONS))
      },
      saveUserSupport: (card) => {
        const editingCard = state.ui.editingUserCard
        const operation = editingCard
          ? commands.userSupports.update(editingCard.name, card, UI_COMMAND_OPTIONS)
          : commands.userSupports.add(card, UI_COMMAND_OPTIONS)
        handleUiCommand(operation)
      },
      deleteUserSupport: (cardName) => {
        handleUiCommand(commands.userSupports.remove(cardName, UI_COMMAND_OPTIONS))
      },
      updateCardUncap: (cardName, uncap) => {
        const current = commands.calculation.getSnapshot().value.cardUncaps
        handleUiCommand(
          commands.calculation.patch({ cardUncaps: { ...current, [cardName]: uncap } }, UI_COMMAND_OPTIONS),
        )
      },
    }),
    [commands, handleUiCommand, state.scores.clearScoreSettingsPreview, state.ui.editingUserCard],
  )

  return { commands, handlers }
}

function createCommands({
  calculationStatePort,
  filterStatePort,
  preferencesStatePort,
  presetStatePort,
  importStatePort,
  userSupportStatePort,
  getCurrentApplicationDigest,
}: ApplicationCommandPorts) {
  // 各commandは自分のdomain state portだけを所有する
  return {
    calculation: createCalculationCommand({ state: calculationStatePort }),
    filters: createFilterCommand({ state: filterStatePort }),
    preferences: createPreferencesCommand({ state: preferencesStatePort }),
    presets: createPresetCommand({ state: presetStatePort }),
    importData: createImportCommand({ state: importStatePort, getCurrentApplicationDigest }),
    userSupports: createUserSupportCommand({ state: userSupportStatePort }),
  }
}

/** 通常UIとWebMCPが共有する各domainのcommand */
export type ApplicationCommands = ReturnType<typeof createCommands>
