/**
 * モーダルスタイルマスタ。
 *
 * モーダルの配置バリアント（center / end）に対応する
 * レイアウトクラスを提供する。
 */
import { ModalAlignType } from '../../types/enums'

const modalStyle: Record<ModalAlignType, string> = {
  [ModalAlignType.Center]: 'items-center justify-center',
  [ModalAlignType.End]: 'justify-end',
}

/**
 * ModalOverlay 配置に対応する Tailwind CSS クラスを返す。
 *
 * @param align - モーダルの配置種別
 * @returns Tailwind CSS クラス文字列
 */
export function getModalAlignClass(align: ModalAlignType): string {
  return modalStyle[align]
}
