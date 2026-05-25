/**
 * エラーバウンダリーコンポーネント
 *
 * 子コンポーネントで発生した予期しないエラーをキャッチし、
 * 画面が真っ白になるのを防ぐ。
 */
import { Component, type ReactNode } from 'react'

import { ErrorFallback } from './ErrorFallback'

/** ErrorBoundary に渡すプロパティ */
interface ErrorBoundaryProps {
  /** 保護する子コンポーネント */
  children: ReactNode
  /** エラー時に表示するフォールバック UI（省略時はデフォルト UI） */
  fallback?: ReactNode
  /** 「リセットして再試行」ボタン押下時に呼ばれる追加コールバック（状態リセット等） */
  onReset?: () => void
  /** 「キャンセル」ボタン押下時のコールバック（省略時はキャンセルボタン非表示） */
  onCancel?: () => void
  /** リセット対象の説明テキスト（例: 「スケジュール設定」） */
  resetDescription?: string
}

/** ErrorBoundary の状態 */
interface ErrorBoundaryState {
  /** エラーが発生しているかどうか */
  hasError: boolean
  /** キャッチしたエラー */
  error: Error | null
}

/**
 * 子コンポーネントのエラーをキャッチしてフォールバック UI を表示する。
 *
 * class component として実装し、React の Error Boundary ライフサイクルを利用する。
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  /**
   * 子ツリーで発生したエラーを state に反映する。
   *
   * @param error - キャッチしたエラー
   * @returns 更新後の state
   */
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  /** エラー状態を解除して、必要なら外部リセット処理を実行する。 */
  handleReset = () => {
    this.props.onReset?.()
    this.setState({ hasError: false, error: null })
  }

  /** エラー表示のみを閉じ、必要なら外部キャンセル処理を実行する。 */
  handleCancel = () => {
    this.setState({ hasError: false, error: null })
    this.props.onCancel?.()
  }

  /** エラー有無に応じて children またはフォールバックUIを描画する。 */
  render() {
    if (!this.state.hasError) {
      return this.props.children
    }

    // カスタムフォールバックが指定されている場合はそれを表示する
    if (this.props.fallback) {
      return this.props.fallback
    }

    // デフォルトのフォールバック UI
    return (
      <ErrorFallback
        error={this.state.error}
        onReset={this.handleReset}
        hasExternalReset={!!this.props.onReset}
        onCancel={this.props.onCancel ? this.handleCancel : undefined}
        resetDescription={this.props.resetDescription}
      />
    )
  }
}
