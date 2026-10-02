/** サポートカードの検索・詳細・点数取得を行うWebMCPツール */
import i18n from '../../i18n'
import * as webMcpConstant from '../constants'
import type { WebMcpToolFactoryContext } from '../context'
import { parseCardDetailSections, parseSearchLimit, parseSearchOffset } from '../input'
import {
  createCardDetail,
  createCardSearchText,
  createCardSummary,
  createPageInfo,
  createScoreResult,
} from '../results'
import { readOnlyAnnotations } from '../schemas'
import {
  WebMcpCardDetailSection,
  WebMcpErrorCode,
  WebMcpSchemaField,
  type WebMcpToolDefinition,
  WebMcpToolName,
} from '../types'

/**
 * カード検索・カード点数のツール定義を作成する
 *
 * @param context - 現在のカード・計算状態とエラー生成を含む共通の操作情報
 * @returns カード検索・詳細・点数取得のWebMCPツール定義
 */
export function createCardTools(context: WebMcpToolFactoryContext): WebMcpToolDefinition[] {
  return [
    {
      name: WebMcpToolName.SearchSupportCards,
      title: i18n.t('webmcp.tools.search_support_cards.title'),
      description: i18n.t('webmcp.tools.search_support_cards.description'),
      inputSchema: {
        type: 'object',
        properties: {
          [WebMcpSchemaField.Query]: { type: 'string', description: i18n.t('webmcp.schema.search_query') },
          [WebMcpSchemaField.Limit]: {
            type: 'integer',
            minimum: 1,
            maximum: webMcpConstant.WEB_MCP_MAX_SEARCH_LIMIT,
            default: webMcpConstant.WEB_MCP_DEFAULT_SEARCH_LIMIT,
          },
          [WebMcpSchemaField.Offset]: {
            type: 'integer',
            minimum: 0,
            maximum: webMcpConstant.WEB_MCP_MAX_PAGE_OFFSET,
            default: 0,
          },
        },
        additionalProperties: false,
      },
      annotations: readOnlyAnnotations,
      execute: (input) => {
        // 型を確認してから検索語と件数を正規化する
        const queryValue = input.query
        if (queryValue !== undefined && typeof queryValue !== 'string') {
          return context.createToolError(WebMcpErrorCode.InvalidInput, i18n.t('webmcp.messages.invalid_query'))
        }
        const limit = parseSearchLimit(input.limit)
        if (limit === null)
          return context.createToolError(
            WebMcpErrorCode.InvalidInput,
            i18n.t('webmcp.messages.invalid_search_limit', { max: webMcpConstant.WEB_MCP_MAX_SEARCH_LIMIT }),
          )
        const offset = parseSearchOffset(input.offset)
        if (offset === null)
          return context.createToolError(
            WebMcpErrorCode.InvalidInput,
            i18n.t('webmcp.messages.invalid_search_limit', { max: webMcpConstant.WEB_MCP_MAX_PAGE_OFFSET }),
          )
        const query = (queryValue ?? '').trim().toLocaleLowerCase('ja-JP')
        // 検索語をカード属性の連結テキストへ照合し、指定された件数だけ返す
        const cards = context
          .getRuntime()
          .getCards()
          .filter((card) => query === '' || createCardSearchText(card).includes(query))
        return {
          query: queryValue ?? '',
          total: cards.length,
          cards: cards.slice(offset, offset + limit).map(createCardSummary),
          pagination: createPageInfo(offset, limit, cards.length),
        }
      },
    },
    {
      name: WebMcpToolName.GetSupportCard,
      title: i18n.t('webmcp.tools.get_support_card.title'),
      description: i18n.t('webmcp.tools.get_support_card.description'),
      inputSchema: {
        type: 'object',
        properties: {
          [WebMcpSchemaField.Name]: { type: 'string', description: i18n.t('webmcp.schema.card_name') },
          [WebMcpSchemaField.Sections]: {
            type: 'array',
            maxItems: Object.values(WebMcpCardDetailSection).length,
            uniqueItems: true,
            items: { type: 'string', enum: Object.values(WebMcpCardDetailSection) },
          },
        },
        required: [WebMcpSchemaField.Name],
        additionalProperties: false,
      },
      annotations: readOnlyAnnotations,
      execute: (input) => {
        // 完全一致検索は、カード一覧に登録された名前をそのまま使う
        if (typeof input.name !== 'string' || input.name.trim() === '') {
          return context.createToolError(WebMcpErrorCode.InvalidInput, i18n.t('webmcp.messages.name_required'))
        }
        const card = context.getRuntime().getCardByName().get(input.name)
        if (!card) {
          return context.createToolError(
            WebMcpErrorCode.NotFound,
            i18n.t('webmcp.messages.card_not_found', { cardName: input.name }),
          )
        }
        const sections = parseCardDetailSections(input)
        if (sections === null) {
          return context.createToolError(
            WebMcpErrorCode.InvalidInput,
            i18n.t('webmcp.messages.card_detail_sections_invalid'),
          )
        }
        return { card: createCardDetail(card, sections) }
      },
    },
    {
      name: WebMcpToolName.GetSupportCardScore,
      title: i18n.t('webmcp.tools.get_support_card_score.title'),
      description: i18n.t('webmcp.tools.get_support_card_score.description'),
      inputSchema: {
        type: 'object',
        properties: {
          [WebMcpSchemaField.Name]: { type: 'string', description: i18n.t('webmcp.schema.card_name') },
        },
        required: [WebMcpSchemaField.Name],
        additionalProperties: false,
      },
      annotations: readOnlyAnnotations,
      execute: (input) => {
        // カードと計算条件を同じ開始時点でそろえ、読み取り途中の条件混在を防ぐ
        if (typeof input.name !== 'string' || input.name.trim() === '') {
          return context.createToolError(WebMcpErrorCode.InvalidInput, i18n.t('webmcp.messages.name_required'))
        }
        const snapshot = context.getRuntime().getCalculationSnapshot()
        const card = snapshot.cardByName.get(input.name)
        if (!card) {
          return context.createToolError(
            WebMcpErrorCode.NotFound,
            i18n.t('webmcp.messages.card_not_found', { cardName: input.name }),
          )
        }
        return { card: createCardSummary(card), ...createScoreResult(snapshot, card) }
      },
    },
  ]
}
