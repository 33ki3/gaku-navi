/**
 * 総当たり最適化の組み合わせ計算ユーティリティ
 *
 * SP制約とタイプ枚数制約を同時に満たす組み合わせの通数計算・列挙を担当する。
 */
import * as enums from '../../types/enums'
import * as constant from '../../constant'

/** 組み合わせ計算で扱う最小カード情報 */
interface OptimizerCardLike {
  card: {
    name: string
    type: string
  }
}

/** SPプールから k 枚選んだときのタイプ別内訳状態 */
interface SpTypeState {
  /** 選択枚数 */
  k: number
  /** 選択内の Vocal タイプ枚数 */
  vo: number
  /** 選択内の Dance タイプ枚数 */
  da: number
  /** 選択内の Visual タイプ枚数 */
  vi: number
  /** この内訳になる組み合わせ数 */
  ways: number
}

/** タイプ別枚数カウンター */
interface TypeCounter {
  vo: number
  da: number
  vi: number
}

/** SPカテゴリ別プール */
interface SpPools<T extends OptimizerCardLike> {
  voSpPool: T[]
  daSpPool: T[]
  viSpPool: T[]
}

/** SPなしカテゴリ別プール */
interface GenericPools<T extends OptimizerCardLike> {
  genVoPool: T[]
  genDaPool: T[]
  genViPool: T[]
  genAsPool: T[]
}

/** SPカテゴリ別の必要枚数制約 */
interface SpNeeds {
  neededVo: number
  neededDa: number
  neededVi: number
}

/** タイプ別の下限・上限制約 */
interface TypeBounds {
  typeVoMin: number
  typeDaMin: number
  typeViMin: number
  typeVoMax: number
  typeDaMax: number
  typeViMax: number
}

/** SP+タイプ制約の通数計算入力 */
interface SpTypeCountInput<T extends OptimizerCardLike> extends SpPools<T>, SpNeeds, TypeBounds {
  genVoCount: number
  genDaCount: number
  genViCount: number
  genAsCount: number
  totalSlots: number
}

/** SP+タイプ制約の列挙入力 */
interface SpTypeEnumerateInput<T extends OptimizerCardLike> extends SpPools<T>, GenericPools<T>, SpNeeds, TypeBounds {
  totalSlots: number
}

/** SPプール別のタイプ内訳状態キャッシュ */
const spTypeStatesCache = new Map<string, SpTypeState[]>()
/** SP+タイプ制約の組み合わせ数キャッシュ */
const spTypeCountCache = new Map<string, number>()

/**
 * C(n, k) を計算する
 *
 * @param n - 全要素数
 * @param k - 選択数
 * @returns 組み合わせの総数
 */
function countCombinations(n: number, k: number): number {
  if (k > n || k < 0) return 0
  if (k === 0 || k === n) return 1
  const r = Math.min(k, n - k)
  let result = 1
  // 桁あふれを抑えるため、分子・分母を逐次掛け割りして計算する。
  for (let i = 0; i < r; i++) {
    result = (result * (n - i)) / (i + 1)
  }
  return Math.round(result)
}

/**
 * 配列から k 個の要素を選ぶ全組み合わせを順次生成する
 *
 * @param arr - 入力配列
 * @param k - 選択する要素数
 */
function* combinations<T>(arr: T[], k: number): Generator<T[]> {
  const n = arr.length
  if (k === 0) {
    yield []
    return
  }
  if (k > n) return
  const indices = Array.from({ length: k }, (_, i) => i)
  while (true) {
    // 現在のインデックス組み合わせを要素配列へ写像して返す。
    yield indices.map((i) => arr[i])
    let i = k - 1
    // 右端から更新可能な位置を探し、辞書順で次の組み合わせへ進める。
    while (i >= 0 && indices[i] === n - k + i) i--
    if (i < 0) return
    indices[i]++
    for (let j = i + 1; j < k; j++) indices[j] = indices[j - 1] + 1
  }
}

/**
 * カード配列からキャッシュキーを作る
 *
 * @param pool - カード配列
 * @returns キャッシュキー
 */
function buildPoolKey<T extends OptimizerCardLike>(pool: T[]): string {
  // 呼び出し元でプール順は安定しているためソートを省略してキー生成コストを下げる
  return pool.map((c) => c.card.name).join('\u001f')
}

/**
 * コンボ内カードのタイプ別枚数を集計する
 *
 * @param combo - 集計対象のカード配列
 * @returns タイプ別枚数
 */
function countTypesInCombo<T extends OptimizerCardLike>(combo: T[]): TypeCounter {
  const counter: TypeCounter = { vo: 0, da: 0, vi: 0 }
  for (const c of combo) {
    if (c.card.type === enums.ParameterType.Vocal) counter.vo++
    else if (c.card.type === enums.ParameterType.Dance) counter.da++
    else if (c.card.type === enums.ParameterType.Visual) counter.vi++
  }
  return counter
}

/**
 * SPプールの「選択枚数 × タイプ内訳」の組み合わせ数を動的計画法で集計する
 *
 * @param pool - SPプール
 * @returns 内訳状態配列
 */
function buildSpTypeStates<T extends OptimizerCardLike>(pool: T[]): SpTypeState[] {
  // 同一プールを繰り返し評価するため、まずキャッシュヒットを確認する。
  const cacheKey = buildPoolKey(pool)
  const cached = spTypeStatesCache.get(cacheKey)
  if (cached) return cached

  // dp は「選択枚数|vo枚数|da枚数|vi枚数」をキーに、その状態へ到達する通数を持つ。
  // 初期状態は 0 枚選択・タイプ枚数 0・通数 1 通り。
  const dp = new Map<string, number>()
  dp.set('0|0|0|0', 1)

  // 各カードについて「選ばない/選ぶ」の遷移を積み上げ、状態ごとの通数を更新する。
  for (const c of pool) {
    // 現カード未選択の通数を保持したまま、選択した場合の通数を next へ加算する。
    const next = new Map(dp)
    const addVo = c.card.type === enums.ParameterType.Vocal ? 1 : 0
    const addDa = c.card.type === enums.ParameterType.Dance ? 1 : 0
    const addVi = c.card.type === enums.ParameterType.Visual ? 1 : 0
    for (const [key, ways] of dp.entries()) {
      const [kStr, voStr, daStr, viStr] = key.split('|')
      const k = Number(kStr)
      const vo = Number(voStr)
      const da = Number(daStr)
      const vi = Number(viStr)
      const nk = k + 1
      const nvo = vo + addVo
      const nda = da + addDa
      const nvi = vi + addVi
      const nkey = `${nk}|${nvo}|${nda}|${nvi}`
      next.set(nkey, (next.get(nkey) ?? 0) + ways)
    }
    // 次のカード処理のため、更新済み状態を dp へ反映する。
    dp.clear()
    for (const [k, v] of next.entries()) dp.set(k, v)
  }

  // 文字列キーを構造化データへ戻して返却する。
  const result: SpTypeState[] = []
  for (const [key, ways] of dp.entries()) {
    const [kStr, voStr, daStr, viStr] = key.split('|')
    result.push({ k: Number(kStr), vo: Number(voStr), da: Number(daStr), vi: Number(viStr), ways })
  }

  // キャッシュは上限超過時に全クリアし、メモリ使用量を一定に保つ。
  if (spTypeStatesCache.size >= constant.SP_TYPE_STATES_CACHE_MAX) spTypeStatesCache.clear()
  spTypeStatesCache.set(cacheKey, result)
  return result
}

/**
 * SP + タイプ制約を同時に満たす組み合わせ総数を厳密に計算する
 *
 * @param voSpPool - SP=Vocal カード配列
 * @param daSpPool - SP=Dance カード配列
 * @param viSpPool - SP=Visual カード配列
 * @param genVoCount - SP=None かつ type=Vocal の枚数
 * @param genDaCount - SP=None かつ type=Dance の枚数
 * @param genViCount - SP=None かつ type=Visual の枚数
 * @param genAsCount - SP=None かつ非パラメータ型の枚数
 * @param neededVo - 自由枠内で必要な VoSP 最低枚数
 * @param neededDa - 自由枠内で必要な DaSP 最低枚数
 * @param neededVi - 自由枠内で必要な ViSP 最低枚数
 * @param typeVoMin - 自由枠内の Vocal タイプ最低枚数
 * @param typeDaMin - 自由枠内の Dance タイプ最低枚数
 * @param typeViMin - 自由枠内の Visual タイプ最低枚数
 * @param typeVoMax - 自由枠内の Vocal タイプ最大枚数
 * @param typeDaMax - 自由枠内の Dance タイプ最大枚数
 * @param typeViMax - 自由枠内の Visual タイプ最大枚数
 * @param totalSlots - 選択する総枚数
 * @returns 制約後の総組み合わせ数
 */
export function countSpTypeConstrainedCombos<T extends OptimizerCardLike>(input: SpTypeCountInput<T>): number {
  const {
    voSpPool,
    daSpPool,
    viSpPool,
    genVoCount,
    genDaCount,
    genViCount,
    genAsCount,
    neededVo,
    neededDa,
    neededVi,
    typeVoMin,
    typeDaMin,
    typeViMin,
    typeVoMax,
    typeDaMax,
    typeViMax,
    totalSlots,
  } = input
  if (totalSlots < neededVo + neededDa + neededVi) return 0

  const voKey = buildPoolKey(voSpPool)
  const daKey = buildPoolKey(daSpPool)
  const viKey = buildPoolKey(viSpPool)
  const countCacheKey = [
    voKey,
    daKey,
    viKey,
    genVoCount,
    genDaCount,
    genViCount,
    genAsCount,
    neededVo,
    neededDa,
    neededVi,
    typeVoMin,
    typeDaMin,
    typeViMin,
    typeVoMax,
    typeDaMax,
    typeViMax,
    totalSlots,
  ].join('|')
  const countCached = spTypeCountCache.get(countCacheKey)
  if (countCached !== undefined) return countCached

  // SPプール側の「選択枚数 × タイプ内訳」状態を事前計算で取得する。
  const voStates = buildSpTypeStates(voSpPool)
  const daStates = buildSpTypeStates(daSpPool)
  const viStates = buildSpTypeStates(viSpPool)

  let total = 0

  for (const sVo of voStates) {
    // まず VoSP 必須枚数と総枠超過を除外する。
    if (sVo.k < neededVo || sVo.k > totalSlots) continue
    for (const sDa of daStates) {
      // 次に DaSP 必須枚数と総枠超過を除外する。
      if (sDa.k < neededDa || sVo.k + sDa.k > totalSlots) continue
      for (const sVi of viStates) {
        // 最後に ViSP 必須枚数を満たさない枝を除外する。
        if (sVi.k < neededVi) continue
        const spCount = sVo.k + sDa.k + sVi.k
        // SPカードだけで総枠を超える枝は成立しないため除外する。
        if (spCount > totalSlots) continue

        // 残り枠を汎用カード群で埋めるため、必要な残枠数とSP側タイプ枚数を計算する。
        const kGen = totalSlots - spCount
        const spVo = sVo.vo + sDa.vo + sVi.vo
        const spDa = sVo.da + sDa.da + sVi.da
        const spVi = sVo.vi + sDa.vi + sVi.vi
        // SP側だけでタイプ上限を超える枝は、この時点で打ち切る。
        if (spVo > typeVoMax || spDa > typeDaMax || spVi > typeViMax) continue

        // 汎用カード側に必要なタイプ下限/上限を、SP側消化分を差し引いて求める。
        const gvMin = Math.max(0, typeVoMin - spVo)
        const gvMax = Math.min(genVoCount, typeVoMax - spVo, kGen)
        const gdMin = Math.max(0, typeDaMin - spDa)
        const gdMax = Math.min(genDaCount, typeDaMax - spDa, kGen)
        const giMin = Math.max(0, typeViMin - spVi)
        const giMax = Math.min(genViCount, typeViMax - spVi, kGen)
        // 最小値が最大値を超えたら、その枝では制約充足が不可能。
        if (gvMax < gvMin || gdMax < gdMin || giMax < giMin) continue

        let genWays = 0
        // 汎用枠のタイプ配分を全列挙し、各配分の組み合わせ数を合算する。
        for (let kgv = gvMin; kgv <= gvMax; kgv++) {
          for (let kgd = gdMin; kgd <= Math.min(gdMax, kGen - kgv); kgd++) {
            for (let kgi = giMin; kgi <= Math.min(giMax, kGen - kgv - kgd); kgi++) {
              const kga = kGen - kgv - kgd - kgi
              if (kga < 0 || kga > genAsCount) continue
              genWays +=
                countCombinations(genVoCount, kgv) *
                countCombinations(genDaCount, kgd) *
                countCombinations(genViCount, kgi) *
                countCombinations(genAsCount, kga)
            }
          }
        }
        // SP側状態通数と汎用枠通数の積が、この枝の総通数になる。
        total += sVo.ways * sDa.ways * sVi.ways * genWays
      }
    }
  }

  // キャッシュは上限超過時に全クリアしてメモリを抑制する。
  if (spTypeCountCache.size >= constant.SP_TYPE_COUNT_CACHE_MAX) spTypeCountCache.clear()
  spTypeCountCache.set(countCacheKey, total)
  return total
}

/**
 * SP + タイプ制約を同時に満たす組み合わせを列挙する
 *
 * @param voSpPool - SP=Vocal カード配列
 * @param daSpPool - SP=Dance カード配列
 * @param viSpPool - SP=Visual カード配列
 * @param genVoPool - SP=None かつ type=Vocal カード配列
 * @param genDaPool - SP=None かつ type=Dance カード配列
 * @param genViPool - SP=None かつ type=Visual カード配列
 * @param genAsPool - SP=None かつ type=Assist（またはその他非パラメータ型）カード配列
 * @param neededVo - 自由枠内で必要な VoSP 最低枚数
 * @param neededDa - 自由枠内で必要な DaSP 最低枚数
 * @param neededVi - 自由枠内で必要な ViSP 最低枚数
 * @param typeVoMin - 自由枠内の Vocal タイプ最低枚数
 * @param typeDaMin - 自由枠内の Dance タイプ最低枚数
 * @param typeViMin - 自由枠内の Visual タイプ最低枚数
 * @param typeVoMax - 自由枠内の Vocal タイプ最大枚数
 * @param typeDaMax - 自由枠内の Dance タイプ最大枚数
 * @param typeViMax - 自由枠内の Visual タイプ最大枚数
 * @param totalSlots - 選択する総枚数
 */
export function* spTypeConstrainedCombos<T extends OptimizerCardLike>(input: SpTypeEnumerateInput<T>): Generator<T[]> {
  // まず入力制約を展開し、列挙ループ内でのプロパティ参照コストを下げる。
  const {
    voSpPool,
    daSpPool,
    viSpPool,
    genVoPool,
    genDaPool,
    genViPool,
    genAsPool,
    neededVo,
    neededDa,
    neededVi,
    typeVoMin,
    typeDaMin,
    typeViMin,
    typeVoMax,
    typeDaMax,
    typeViMax,
    totalSlots,
  } = input
  // 必須SP枚数の合計が総枠を超える場合は列挙不能。
  if (totalSlots < neededVo + neededDa + neededVi) return

  // VoSP 枚数を外側ループに置き、制約で早期に枝刈りしながら列挙する。
  const voMax = Math.min(voSpPool.length, totalSlots)
  for (let kVo = neededVo; kVo <= voMax; kVo++) {
    for (const voCombo of combinations(voSpPool, kVo)) {
      const voCounts = countTypesInCombo(voCombo)
      const slotsAfterVo = totalSlots - kVo

      // DaSP 枚数を決め、VoSP と合わせた残枠を更新する。
      const daMax = Math.min(daSpPool.length, slotsAfterVo)
      for (let kDa = neededDa; kDa <= daMax; kDa++) {
        for (const daCombo of combinations(daSpPool, kDa)) {
          const daCounts = countTypesInCombo(daCombo)
          const voDaCounts: TypeCounter = {
            vo: voCounts.vo + daCounts.vo,
            da: voCounts.da + daCounts.da,
            vi: voCounts.vi + daCounts.vi,
          }
          const slotsAfterDa = slotsAfterVo - kDa

          // ViSP 枚数まで確定したら、残りは汎用枠でタイプ制約を満たす配分を探索する。
          const viMax = Math.min(viSpPool.length, slotsAfterDa)
          for (let kVi = neededVi; kVi <= viMax; kVi++) {
            const kGen = slotsAfterDa - kVi
            if (kGen < 0) continue
            for (const viCombo of combinations(viSpPool, kVi)) {
              const viCounts = countTypesInCombo(viCombo)
              const spVo = voDaCounts.vo + viCounts.vo
              const spDa = voDaCounts.da + viCounts.da
              const spVi = voDaCounts.vi + viCounts.vi
              // SP側だけでタイプ上限を超える枝を除外する。
              if (spVo > typeVoMax || spDa > typeDaMax || spVi > typeViMax) continue

              // 汎用枠で必要になるタイプ枚数レンジを計算する。
              const gvMin = Math.max(0, typeVoMin - spVo)
              const gvMax = Math.min(genVoPool.length, typeVoMax - spVo)
              const gdMin = Math.max(0, typeDaMin - spDa)
              const gdMax = Math.min(genDaPool.length, typeDaMax - spDa)
              const giMin = Math.max(0, typeViMin - spVi)
              const giMax = Math.min(genViPool.length, typeViMax - spVi)
              // 到達不能なレンジはスキップする。
              if (gvMax < gvMin || gdMax < gdMin || giMax < giMin) continue

              // 汎用枠のタイプ配分（Vo/Da/Vi/Assist）を全列挙して最終コンボを生成する。
              for (let kgv = gvMin; kgv <= Math.min(gvMax, kGen); kgv++) {
                for (let kgd = gdMin; kgd <= Math.min(gdMax, kGen - kgv); kgd++) {
                  for (let kgi = giMin; kgi <= Math.min(giMax, kGen - kgv - kgd); kgi++) {
                    const kga = kGen - kgv - kgd - kgi
                    if (kga < 0 || kga > genAsPool.length) continue
                    // 各カテゴリの実カード組み合わせを展開し、制約を満たす1件をyieldする。
                    for (const gvCombo of combinations(genVoPool, kgv)) {
                      for (const gdCombo of combinations(genDaPool, kgd)) {
                        for (const giCombo of combinations(genViPool, kgi)) {
                          for (const gaCombo of combinations(genAsPool, kga)) {
                            yield [...voCombo, ...daCombo, ...viCombo, ...gvCombo, ...gdCombo, ...giCombo, ...gaCombo]
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}
