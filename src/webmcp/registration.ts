/** アプリ全体のWebMCPツールに共通する登録・解除処理 */
import * as constant from '../constant'
import i18n from '../i18n'
import { createWebMcpRegistrationTool } from './manifest'
import type { WebMcpToolDefinition } from './types'

/**
 * 対応ブラウザへページツールを登録する
 *
 * @param tools - この登録期間に公開するページツール
 * @param signal - この登録を無効にする中断通知
 * @returns 非同期の登録処理
 */
export async function registerPageTools(tools: WebMcpToolDefinition[], signal: AbortSignal): Promise<void> {
  // SSRなどdocumentが存在しない実行環境では、登録処理自体を何もしない
  if (typeof document === 'undefined' || signal.aborted) return
  const modelContext = document.modelContext
  // 対応APIを持たないブラウザでも、アプリ本体の画面操作は継続できるようにする
  if (!modelContext) return

  // 一部だけ登録された状態を残さないよう、登録したツールをまとめて解除できるようにする
  const registrationController = new AbortController()
  // 外側の中断通知を、今回登録した全ツールの解除へ伝播する
  const abortRegistration = () => registrationController.abort()
  signal.addEventListener(constant.ABORT_EVENT_NAME, abortRegistration, { once: true })
  // 各ツールを独立して登録し、1件の失敗を記録したうえで全体を確認する
  const results = await Promise.allSettled(
    tools.map((tool) => {
      // 入力項目の型・制約は保ったまま、重複するschema説明を公開時だけ省く
      const registrationTool = createWebMcpRegistrationTool(tool)
      try {
        return Promise.resolve(
          modelContext.registerTool(registrationTool, { signal: registrationController.signal }),
        ).catch((error: unknown) => {
          if (!signal.aborted) {
            console.warn(i18n.t('webmcp.messages.registration_failed', { toolName: registrationTool.name }), error)
          }
          throw error
        })
      } catch (error) {
        if (!signal.aborted) {
          console.warn(i18n.t('webmcp.messages.registration_failed', { toolName: registrationTool.name }), error)
        }
        return Promise.reject(error)
      }
    }),
  )
  if (results.some((result) => result.status === constant.PROMISE_REJECTED_STATUS)) {
    // 1件でも失敗した場合は登録済みのツールをすべて解除し、次の読み込みで登録し直す
    registrationController.abort()
  }
}
