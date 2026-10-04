/**
 * 保存データ検証で共通利用する小さな型ガード。
 *
 * JSON.parse の戻り値は unknown のまま扱い、型キャストを使わずに
 * 一段ずつ構造を確認する
 */
/** enum 相当の定数オブジェクトが持つ値の型 */
type EnumValueMap = Readonly<Record<string, string | number>>

/**
 * 配列や null ではないオブジェクトか判定する
 *
 * @param value - 判定する値
 * @returns 文字列キーを持つオブジェクトなら true
 */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * 値が有限数か判定する
 *
 * @param value - 判定する値
 * @returns NaN と Infinity を除く数値なら true
 */
export function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

/**
 * 値が enum 相当の定数に含まれるか判定する
 *
 * @param value - 判定する値
 * @param enumValues - 比較対象の enum 相当定数
 * @returns enum に定義された値なら true
 */
export function isEnumValue<T extends EnumValueMap>(value: unknown, enumValues: T): value is T[keyof T] {
  return Object.values(enumValues).some((candidate) => candidate === value)
}

/**
 * 値が文字列配列か判定する
 *
 * @param value - 判定する値
 * @returns 全要素が文字列の配列なら true
 */
export function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

/**
 * 値が文字列または null の配列か判定する
 *
 * @param value - 判定する値
 * @returns 全要素が文字列または null の配列なら true
 */
export function isNullableStringArray(value: unknown): value is (string | null)[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string' || item === null)
}

/**
 * オブジェクトの全値が文字列か判定する
 *
 * @param value - 判定する値
 * @returns オブジェクトで、すべての値が文字列なら true
 */
export function isStringRecord(value: unknown): value is Record<string, string> {
  return isRecord(value) && Object.values(value).every((item) => typeof item === 'string')
}

/**
 * 任意プロパティが存在する場合だけ検証関数を適用する
 *
 * @param value - 判定する値
 * @param validate - undefined 以外の値へ適用する検証関数
 * @returns 未定義、または検証を通過した場合に true
 */
export function isOptional(value: unknown, validate: (candidate: unknown) => boolean): boolean {
  return value === undefined || validate(value)
}

/**
 * 保存値や数値入力を安全な非負整数へ揃える
 * @param value 有限数か確認する入力、負数や数値以外は受け付けない
 * @param maxValue 指定した場合に切り詰める上限
 * @returns 小数を切り捨てた範囲内の整数、不正入力はundefined
 * @example valueが12.8、maxValueが10なら10、負数やNaNならundefinedになる
 */
export function normalizeNonNegativeInteger(value: unknown, maxValue = Number.MAX_SAFE_INTEGER): number | undefined {
  if (!isFiniteNumber(value) || value < 0) return undefined
  return Math.min(Math.floor(value), Number.MAX_SAFE_INTEGER, maxValue)
}

/**
 * EXP補正など、負数を含む入力を安全な整数へ揃える
 * @param value 有限数か確認する入力
 * @returns 小数を0方向へ切り捨てた安全な整数、不正入力はundefined
 * @example -12.8は-12、NaNや文字列はundefinedになる
 */
export function normalizeInteger(value: unknown): number | undefined {
  if (!isFiniteNumber(value)) return undefined
  return Math.max(Number.MIN_SAFE_INTEGER, Math.min(Math.trunc(value), Number.MAX_SAFE_INTEGER))
}

/**
 * 有限で正確に保存できる非負整数かを確認する
 * @param value 保存値や外部入力から取得した値
 * @returns 0以上の安全な整数ならtrue、小数・負数・非数値ならfalse
 * @example 0や300はtrue、-1や1.5やNaNはfalseになる
 */
export function isNonNegativeSafeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
}

/**
 * オブジェクトのすべての値が安全な非負整数かを確認する
 * @param value IDごとの件数などを持つ保存値や外部入力
 * @returns 配列やnullではないオブジェクトで、全値が安全な非負整数ならtrue
 * @example { lessons: 20 }はtrue、{ lessons: -1 }や[20]はfalseになる
 */
export function isNonNegativeIntegerRecord(value: unknown): value is Record<string, number> {
  return isRecord(value) && Object.values(value).every(isNonNegativeSafeInteger)
}
