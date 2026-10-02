/**
 * WebMCPの画面操作の入力形式と変換処理
 *
 * 外部入力を許可された画面操作だけへ変換し、画面へ渡す値を限定する
 */
import * as enums from '../types/enums'
import { isEnumValue, isRecord } from '../utils/valueValidation'
import type { WebMcpUiCommand, WebMcpUiState } from './types'
import * as webMcp from './types'

/**
 * WebMCPの画面操作ツールへ渡す操作注釈
 *
 * readOnlyHintは保存状態を変更しないこと、untrustedContentHintは外部入力を扱うこと、
 * consequentialHintは重大な結果を伴わないことを示す
 */
export const uiAnnotations = {
  /** 画面は変更するが、アプリの保存状態は変更しないことを示す */
  readOnlyHint: false,
  /** カード名などの入力を外部由来の内容として扱うことを示す */
  untrustedContentHint: true,
  /** 重大な結果を伴う操作ではないことを示す */
  consequentialHint: false,
}

/** WebMCPから受け付ける画面操作の一覧 */
const WEB_MCP_PUBLIC_UI_ACTIONS = [
  enums.ApplicationUiAction.OpenScoreSettings,
  enums.ApplicationUiAction.CloseScoreSettings,
  enums.ApplicationUiAction.OpenUnitSimulator,
  enums.ApplicationUiAction.CloseUnitSimulator,
  enums.ApplicationUiAction.OpenFilterSort,
  enums.ApplicationUiAction.CloseFilterSort,
  enums.ApplicationUiAction.ShowCard,
  enums.ApplicationUiAction.HideCard,
  enums.ApplicationUiAction.ShowCardScore,
  enums.ApplicationUiAction.HideCardScore,
  enums.ApplicationUiAction.OpenUserSupportForm,
  enums.ApplicationUiAction.EditUserSupportForm,
  enums.ApplicationUiAction.CloseUserSupportForm,
] as const

/** 画面操作ツールが受け取る入力形式 */
export const uiCommandSchema = {
  type: 'object',
  properties: {
    /** 実行する画面操作 */
    [webMcp.WebMcpSchemaField.Action]: {
      type: 'string',
      enum: WEB_MCP_PUBLIC_UI_ACTIONS,
    },
    /** 点数設定または最適編成パネルを固定するか */
    [webMcp.WebMcpSchemaField.Pinned]: { type: 'boolean' },
    /** フィルター・並び替えパネルで選ぶタブ */
    [webMcp.WebMcpSchemaField.Tab]: { type: 'string', enum: Object.values(enums.FilterSortTab) },
    /** カード一覧の表示モード */
    [webMcp.WebMcpSchemaField.Mode]: { type: 'string', enum: Object.values(enums.CardListInteractionModeType) },
    /** 凸数編集モードを有効にするか */
    [webMcp.WebMcpSchemaField.Enabled]: { type: 'boolean' },
    /** 表示または編集するカード名 */
    [webMcp.WebMcpSchemaField.CardName]: { type: 'string' },
  },
  required: [webMcp.WebMcpSchemaField.Action],
  additionalProperties: false,
}

/**
 * 画面操作の入力を型付き命令へ変換する
 *
 * @param value - 画面操作の外部入力
 * @returns 許可された画面操作。不正な場合はnull
 */
export function parseWebMcpUiCommand(value: unknown): WebMcpUiCommand | null {
  // 入力を許可した画面操作の形に絞ってから、操作ごとの追加情報を確認する
  if (!isRecord(value) || typeof value.action !== 'string') return null
  if (!WEB_MCP_PUBLIC_UI_ACTIONS.some((action) => action === value.action)) return null

  // 引数が不要な操作は操作名だけを返し、不要な値を画面へ渡さない
  switch (value.action) {
    case enums.ApplicationUiAction.OpenScoreSettings:
    case enums.ApplicationUiAction.CloseScoreSettings:
    case enums.ApplicationUiAction.OpenUnitSimulator:
    case enums.ApplicationUiAction.CloseUnitSimulator:
    case enums.ApplicationUiAction.OpenFilterSort:
    case enums.ApplicationUiAction.CloseFilterSort:
    case enums.ApplicationUiAction.HideCard:
    case enums.ApplicationUiAction.HideCardScore:
    case enums.ApplicationUiAction.OpenUserSupportForm:
    case enums.ApplicationUiAction.CloseUserSupportForm:
    case enums.ApplicationUiAction.OpenDataManagement:
    case enums.ApplicationUiAction.CloseDataManagement:
    case enums.ApplicationUiAction.OpenOptions:
    case enums.ApplicationUiAction.CloseOptions:
      return { action: value.action }
    case enums.ApplicationUiAction.SetScoreSettingsPinned:
    case enums.ApplicationUiAction.SetSimulatorPinned:
      return typeof value.pinned === 'boolean' ? { action: value.action, pinned: value.pinned } : null
    case enums.ApplicationUiAction.SetFilterSortTab: {
      const tab = isEnumValue(value.tab, enums.FilterSortTab) ? value.tab : null
      return tab === null ? null : { action: value.action, tab }
    }
    case enums.ApplicationUiAction.SetCardListMode: {
      const mode = isEnumValue(value.mode, enums.CardListInteractionModeType) ? value.mode : null
      return mode === null ? null : { action: value.action, mode }
    }
    case enums.ApplicationUiAction.SetUncapEditMode:
      return typeof value.enabled === 'boolean' ? { action: value.action, enabled: value.enabled } : null
    case enums.ApplicationUiAction.ShowCard:
    case enums.ApplicationUiAction.ShowCardScore:
    case enums.ApplicationUiAction.EditUserSupportForm:
      return typeof value.cardName === 'string' && value.cardName.trim() !== ''
        ? { action: value.action, cardName: value.cardName }
        : null
    default:
      return null
  }
}

/**
 * 画面操作が目的の状態まで反映されたか判定する
 *
 * @param command - 適用した画面操作
 * @param ui - 現在の表示状態
 * @returns 操作結果が反映済みならtrue
 */
export function isWebMcpUiCommandApplied(command: WebMcpUiCommand, ui: WebMcpUiState): boolean {
  switch (command.action) {
    case enums.ApplicationUiAction.OpenScoreSettings:
      return ui.scoreSettingsOpen
    case enums.ApplicationUiAction.CloseScoreSettings:
      return !ui.scoreSettingsOpen && !ui.settingsPinned
    case enums.ApplicationUiAction.SetScoreSettingsPinned:
      return ui.settingsPinned === command.pinned
    case enums.ApplicationUiAction.OpenUnitSimulator:
      return ui.simulatorOpen
    case enums.ApplicationUiAction.CloseUnitSimulator:
      return !ui.simulatorOpen && !ui.simulatorPinned
    case enums.ApplicationUiAction.SetSimulatorPinned:
      return ui.simulatorPinned === command.pinned
    case enums.ApplicationUiAction.OpenFilterSort:
      return ui.filterSortOpen
    case enums.ApplicationUiAction.CloseFilterSort:
      return !ui.filterSortOpen
    case enums.ApplicationUiAction.SetFilterSortTab:
      return ui.filterSortTab === command.tab
    case enums.ApplicationUiAction.SetCardListMode:
      return ui.cardListMode === command.mode
    case enums.ApplicationUiAction.SetUncapEditMode:
      return ui.uncapEditMode === command.enabled
    case enums.ApplicationUiAction.ShowCard:
      return ui.selectedCardName === command.cardName
    case enums.ApplicationUiAction.HideCard:
      return ui.selectedCardName === null
    case enums.ApplicationUiAction.ShowCardScore:
      return ui.scoreBreakdownCardName === command.cardName
    case enums.ApplicationUiAction.HideCardScore:
      return ui.scoreBreakdownCardName === null
    case enums.ApplicationUiAction.OpenUserSupportForm:
      return ui.userSupportFormOpen && ui.editingUserSupportName === null
    case enums.ApplicationUiAction.EditUserSupportForm:
      return ui.userSupportFormOpen && ui.editingUserSupportName === command.cardName
    case enums.ApplicationUiAction.CloseUserSupportForm:
      return !ui.userSupportFormOpen && ui.editingUserSupportName === null
    case enums.ApplicationUiAction.OpenDataManagement:
      return ui.dataManagementOpen
    case enums.ApplicationUiAction.CloseDataManagement:
      return !ui.dataManagementOpen
    case enums.ApplicationUiAction.OpenOptions:
      return ui.optionsOpen
    case enums.ApplicationUiAction.CloseOptions:
      return !ui.optionsOpen
  }
}
