/**
 * 汎用の確認ダイアログ。
 *
 * データ操作などの確認を親モーダルの上へ重ねて表示し、操作内容に応じた通常・警告トーンを共通化する。
 */
import * as constant from '../../constant'
/** 確認ダイアログへ渡すプロパティ */
interface ConfirmationDialogProps {
  /** 取り消し時の処理 */
  onCancel: () => void
  /** 確定時の処理 */
  onConfirm: () => void
  /** 確認タイトル */
  title: string
  /** 確認内容 */
  message: string
  /** 確定ボタンのラベル */
  confirmLabel: string
  /** 取り消しボタンのラベル */
  cancelLabel: string
  /** 確定操作を表示するか */
  canConfirm: boolean
  /** 警告・エラーとして表示するか */
  danger: boolean
}

/**
 * 確認内容と2つの操作ボタンを表示する
 *
 * @param props - 確認内容、表示トーン、操作
 * @returns 親モーダル内に重なる確認ダイアログ
 */
export function ConfirmationDialog({
  onCancel,
  onConfirm,
  title,
  message,
  confirmLabel,
  cancelLabel,
  canConfirm,
  danger,
}: ConfirmationDialogProps) {
  // 警告時だけ赤系へ切り替え、各スタイルは用途別の定数から取得する
  const titleClass = danger ? constant.CONFIRMATION_DANGER_TITLE : constant.CONFIRMATION_NORMAL_TITLE
  const messageClass = danger ? constant.CONFIRMATION_DANGER_MESSAGE : constant.CONFIRMATION_NORMAL_MESSAGE
  const panelClass = danger ? constant.CONFIRMATION_DANGER_PANEL : constant.CONFIRMATION_NORMAL_PANEL

  return (
    <div className={constant.CONFIRMATION_OVERLAY}>
      <div className={`${constant.CONFIRMATION_PANEL} ${panelClass}`}>
        <p className={`text-sm font-black ${titleClass}`}>{title}</p>
        <p
          className={`mt-1.5 max-h-[min(40dvh,16rem)] overflow-y-auto whitespace-pre-line break-words text-xs leading-relaxed ${messageClass}`}
        >
          {message}
        </p>
        <div className={`mt-4 grid gap-2 ${canConfirm ? 'grid-cols-2' : 'grid-cols-1'}`}>
          <button type="button" onClick={onCancel} className={constant.CONFIRMATION_SECONDARY_BUTTON}>
            {cancelLabel}
          </button>
          {canConfirm && (
            <button type="button" onClick={onConfirm} className={constant.CONFIRMATION_PRIMARY_BUTTON}>
              {confirmLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
