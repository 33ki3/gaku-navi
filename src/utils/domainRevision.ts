/**
 * 設定内容の比較用の印と状態番号を作るユーティリティ
 *
 * オブジェクトの並び順に依存しない形へ変換してから内容の印を作る
 * 暗号用途ではなく、変更の有無と古い計算結果の検出に使う
 */
import type { ApplicationDomainType, DomainDigest, DomainRevision, DomainStateSnapshot } from '../types/application'

let revisionSequence = 0

/**
 * 比較用の文字列へ変換できるオブジェクトか判定する
 *
 * @param value - 判定対象の値
 * @returns オブジェクトの場合はtrue
 */
function isObject(value: unknown): value is object {
  return typeof value === 'object' && value !== null
}

/**
 * 循環参照も扱いながら、値を比較用の文字列へ変換する
 *
 * @param value - 直列化する値
 * @param activeObjects - 現在の再帰経路にあるオブジェクト集合
 * @returns 安定化した比較用文字列
 */
function serializeValue(value: unknown, activeObjects: WeakSet<object>): string {
  if (value === null) return 'null'

  // 型も文字列へ含め、見た目が同じでも種類の違う値を区別する
  switch (typeof value) {
    case 'undefined':
      return 'undefined'
    case 'string':
      return `string:${JSON.stringify(value)}`
    case 'boolean':
      return `boolean:${value ? 'true' : 'false'}`
    case 'number':
      if (Number.isNaN(value)) return 'number:NaN'
      if (value === Infinity) return 'number:Infinity'
      if (value === -Infinity) return 'number:-Infinity'
      if (Object.is(value, -0)) return 'number:-0'
      return `number:${value}`
    case 'bigint':
      return `bigint:${value.toString()}`
    case 'symbol':
      return `symbol:${String(value)}`
    case 'function':
      return `function:${value.name}`
    default:
      break
  }

  if (!isObject(value)) return 'unknown'
  if (activeObjects.has(value)) return 'circular'
  activeObjects.add(value)

  // 同じ内容なら作成順が違っても同じ印になるよう、
  // 集合やオブジェクトの順序をそろえる
  let serialized: string
  if (value instanceof Date) {
    serialized = Number.isNaN(value.getTime()) ? 'date:invalid' : `date:${value.toISOString()}`
  } else if (value instanceof Map) {
    const entries = [...value.entries()]
      .map(([key, entryValue]): readonly [string, string] => [
        serializeValue(key, activeObjects),
        serializeValue(entryValue, activeObjects),
      ])
      .sort(([leftKey, leftValue], [rightKey, rightValue]) => {
        const left = `${leftKey}:${leftValue}`
        const right = `${rightKey}:${rightValue}`
        return left < right ? -1 : left > right ? 1 : 0
      })
    serialized = `map:[${entries.map(([key, entryValue]) => `${key}=>${entryValue}`).join(',')}]`
  } else if (value instanceof Set) {
    const entries = [...value].map((entry) => serializeValue(entry, activeObjects)).sort()
    serialized = `set:[${entries.join(',')}]`
  } else if (Array.isArray(value)) {
    serialized = `array:[${value.map((entry) => serializeValue(entry, activeObjects)).join(',')}]`
  } else {
    const properties = Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${serializeValue(Reflect.get(value, key), activeObjects)}`)
    serialized = `object:{${properties.join(',')}}`
  }

  activeObjects.delete(value)
  return serialized
}

/**
 * 設定内容をキー順にそろえた比較用文字列へ変換する
 *
 * @param value - 比較対象の値
 * @returns 安定化した比較用文字列
 */
export function serializeDomainValue(value: unknown): string {
  return serializeValue(value, new WeakSet<object>())
}

/**
 * 比較用文字列から軽量な64bit FNV-1aの内容印を作る
 *
 * @param value - 内容印を作る値
 * @returns 値の比較用の印
 */
export function createDomainDigest(value: unknown): DomainDigest {
  const serialized = serializeDomainValue(value)
  let hash = 0xcbf29ce484222325n
  const prime = 0x100000001b3n
  // 比較用文字列を短い印へ変換する
  for (const byte of new TextEncoder().encode(serialized)) {
    hash ^= BigInt(byte)
    hash = BigInt.asUintN(64, hash * prime)
  }
  return hash.toString(16).padStart(16, '0')
}

/**
 * 内容の印から次の状態番号を作る。状態番号の形式自体は外部へ見せない
 *
 * @param domain - 状態番号を分ける対象
 * @param digest - 値から作った内容の印
 * @returns 新しい状態番号
 */
export function createDomainRevision(domain: ApplicationDomainType, digest: DomainDigest): DomainRevision {
  revisionSequence = revisionSequence === Number.MAX_SAFE_INTEGER ? 1 : revisionSequence + 1
  return `${encodeURIComponent(domain)}-${revisionSequence.toString(36)}-${digest}`
}

/**
 * 値と前回の状態から、状態番号を再利用または更新した現在値を作る
 *
 * @param domain - 状態番号を分ける対象
 * @param value - 現在値として保存する値
 * @param previous - 前回の状態。同じ値なら状態番号を再利用する
 * @returns 状態番号と内容の印を持つ現在値
 */
export function createDomainStateSnapshot<T>(
  domain: ApplicationDomainType,
  value: T,
  previous?: DomainStateSnapshot<T>,
): DomainStateSnapshot<T> {
  const digest = createDomainDigest(value)
  if (previous !== undefined && previous.digest === digest && previous.domain === domain) {
    return { domain, value, revision: previous.revision, digest }
  }

  return { domain, value, revision: createDomainRevision(domain, digest), digest }
}
