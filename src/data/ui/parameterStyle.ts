/**
 * パラメータ属性スタイルマスタ。
 *
 * Vocal / Dance / Visual のパラメータ属性に対応する
 * テキスト色などのスタイルクラスを提供する。
 */
import { ParameterType } from '../../types/enums'

const parameterTextColor: Record<ParameterType, string> = {
  [ParameterType.Vocal]: 'text-red-600',
  [ParameterType.Dance]: 'text-blue-600',
  [ParameterType.Visual]: 'text-yellow-700',
}

/**
 * パラメータ属性に対応するテキスト色クラスを返す。
 *
 * @param parameter - パラメータ属性
 * @returns Tailwind CSS テキスト色クラス文字列
 */
export function getParameterTextColor(parameter: ParameterType): string {
  return parameterTextColor[parameter]
}
