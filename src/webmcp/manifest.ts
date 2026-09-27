/**
 * WebMCPの公開manifestを安定したJSONへ変換し、容量を測る
 *
 * execute関数を除いた登録情報だけを扱い、ブラウザへ公開する定義の大きさを検査する
 */
import type { WebMcpToolAnnotations, WebMcpToolDefinition } from './types'
import { WebMcpSchemaKeyword, WebMcpToolName } from './types'

/** 登録対象を追跡するための、現在公開しているツール名の一覧 */
export const WEB_MCP_TOOL_MANIFEST_NAMES = [
  WebMcpToolName.SearchSupportCards,
  WebMcpToolName.GetSupportCard,
  WebMcpToolName.GetSupportCardScore,
  WebMcpToolName.GetCalculationCapabilities,
  WebMcpToolName.GetCurrentAppState,
  WebMcpToolName.UpdateCardFilters,
  WebMcpToolName.UpdateAppPreferences,
  WebMcpToolName.UpdateCalculationSettings,
  WebMcpToolName.GetScorePresets,
  WebMcpToolName.UpsertScorePreset,
  WebMcpToolName.LoadScorePreset,
  WebMcpToolName.PreviewDeleteScorePreset,
  WebMcpToolName.DeleteScorePreset,
  WebMcpToolName.CompareSupportCardScores,
  WebMcpToolName.CompareUnitOptimizations,
  WebMcpToolName.GetUserSupportCards,
  WebMcpToolName.UpsertUserSupportCard,
  WebMcpToolName.PreviewDeleteUserSupportCard,
  WebMcpToolName.DeleteUserSupportCard,
  WebMcpToolName.GetUserDataExport,
  WebMcpToolName.DownloadUserDataExport,
  WebMcpToolName.PreviewUserDataImport,
  WebMcpToolName.ApplyUserDataImport,
  WebMcpToolName.ControlAppUi,
  WebMcpToolName.UndoLastChange,
] as const

/** 点数・編成設定の入れ子schema境界を公開するツール */
const WEB_MCP_SETTING_PATCH_SCHEMA_TOOL_NAMES = new Set<string>([
  WebMcpToolName.UpdateCalculationSettings,
  WebMcpToolName.CompareSupportCardScores,
  WebMcpToolName.CompareUnitOptimizations,
])

/** 実行関数を除いた、ブラウザへ公開するツール情報の1項目 */
interface WebMcpToolManifestEntry {
  /** ツールの識別名 */
  name: string
  /** ツールの表示名 */
  title: string
  /** ツールの説明文 */
  description: string
  /** ツールが受け付ける入力形式 */
  inputSchema: Record<string, unknown>
  /** ツールの安全性注釈 */
  annotations?: WebMcpToolAnnotations
}

/**
 * 公開schemaから説明文と既定値を除き、設定patch境界の追加項目制約を保って複製する
 *
 * 説明文はツール単位のdescriptionへ集約し、入力項目の型・enum・必要な境界制約は残す
 * @param value - 複製対象のschema値
 * @returns 公開用に縮小したJSON値
 */
function compactWebMcpSchema(value: unknown, preserveNestedRestrictions: boolean, depth = 0): unknown {
  if (Array.isArray(value)) return value.map((item) => compactWebMcpSchema(item, preserveNestedRestrictions, depth + 1))
  if (typeof value !== 'object' || value === null) return value

  const compacted: Record<string, unknown> = {}
  for (const [key, child] of Object.entries(value)) {
    // これらのツールではscoreSettings/unitSettingsがschemaの深さ2にあるため、その閉じ方は公開する
    const isPreservedSettingBoundary = preserveNestedRestrictions && depth === 2
    if (
      key === WebMcpSchemaKeyword.Description ||
      key === WebMcpSchemaKeyword.Default ||
      (!isPreservedSettingBoundary && key === WebMcpSchemaKeyword.AdditionalProperties && child === false && depth > 0)
    )
      continue
    compacted[key] = compactWebMcpSchema(child, preserveNestedRestrictions, depth + 1)
  }
  return compacted
}

/**
 * ブラウザへ登録するWebMCPツールを公開schemaへ縮小する
 *
 * @param tool - 実行関数を含む内部ツール定義
 * @returns 公開schemaへ変換したツール定義
 */
export function createWebMcpRegistrationTool(tool: WebMcpToolDefinition): WebMcpToolDefinition {
  const preserveNestedRestrictions = WEB_MCP_SETTING_PATCH_SCHEMA_TOOL_NAMES.has(tool.name)
  return {
    ...tool,
    inputSchema: compactWebMcpSchema(tool.inputSchema, preserveNestedRestrictions) as Record<string, unknown>,
  }
}

/**
 * ツール定義からブラウザへ公開する情報だけを取り出す
 *
 * @param tools - 公開一覧へ変換するツール定義
 * @returns 実行関数を除いた公開ツール情報
 */
export function createWebMcpManifest(tools: readonly WebMcpToolDefinition[]): WebMcpToolManifestEntry[] {
  return tools.map((tool) => {
    const { name, title, description, inputSchema, annotations } = createWebMcpRegistrationTool(tool)
    return {
      name,
      title,
      description,
      inputSchema,
      ...(annotations === undefined ? {} : { annotations }),
    }
  })
}
