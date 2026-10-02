/**
 * 計算開始時点の条件のコピーと、比較用の一時条件の適用
 *
 * 計算開始時点の条件をコピーして保持し、比較用の変更は元の条件へ戻さずに
 * 新しい条件として返す。複数条件を比べても、前の条件が次へ混ざらない
 */
import * as constant from '../constant'
import * as data from '../data'
import type {
  CalculationSnapshot,
  CalculationSnapshotInput,
  CalculationVariantPatch,
  ScoreSettingsVariantPatch,
  UnitSettingsVariantPatch,
} from '../types/calculation'
import type {
  ActionCounts,
  CardCountCustom,
  CardCustomData,
  ParameterValues,
  ScoreSettings,
  SupportCard,
} from '../types/card'
import * as enums from '../types/enums'
import type { UnitSimulatorSettings } from '../types/unit'
import type { OptimizeInput } from '../types/unitOptimizer'
import { isActionCountRecord, isActionId, isEnumArray, isParameterValues } from './domainValueValidation'
import {
  isValidScheduleSelections,
  normalizeScoreSettingsDerived,
  resolveScoreSettingsDifficulty,
} from './scoreSettings'
import { isScoreSettings } from './scoreSettingsValidation'
import { isUnitSimulatorSettings } from './settingsValidation'
import { isCardCountCustom, isUncapRecord } from './storageCollectionValidation'
import { getProvidedActions } from './supportSynergy'
import { isEnumValue, isFiniteNumber } from './valueValidation'

/**
 * 計算に使う値をコピーして、開始時点の条件として固定する
 *
 * @param input - 現在の計算入力
 * @returns 呼び出し元と値を共有しない計算条件
 */
export function createCalculationSnapshot(input: CalculationSnapshotInput): CalculationSnapshot {
  // 計算開始時点の設定・凸数・回数調整をコピーし、
  // 後から画面が変わっても計算条件を変えない
  return {
    scoreSettings: cloneScoreSettings(input.scoreSettings),
    unitSettings: cloneUnitSettings(input.unitSettings),
    cardUncaps: { ...input.cardUncaps },
    cardCountCustom: sanitizeCardCountCustomForCalculation(input.cardCountCustom, input.cardByName),
    allCards: [...input.allCards],
    cardByName: new Map(input.cardByName),
  }
}

/**
 * 固定した計算条件を編成評価処理の入力へ変換する
 *
 * @param snapshot - 固定済みの計算条件
 * @returns 手動評価・最適化で共通利用する入力
 */
export function createOptimizeInput(snapshot: CalculationSnapshot): OptimizeInput {
  // 最適編成計算にはこの時点で固定した条件だけを渡し、
  // 比較中に画面の設定を読み直さない
  return {
    settings: snapshot.unitSettings,
    scoreSettings: snapshot.scoreSettings,
    cardUncaps: snapshot.cardUncaps,
    cardCountCustom: snapshot.cardCountCustom,
    allCards: snapshot.allCards,
    cardByName: snapshot.cardByName,
    excludedCardNames: snapshot.unitSettings.ignoreCardExclusions ? [] : snapshot.unitSettings.excludedCardNames,
  }
}

/**
 * 保存済みプリセットを計算へ渡す前に検証し、派生値を正規化する
 *
 * @param settings - 検証する保存値
 * @returns 計算へ渡せるスコア設定。不正ならnull
 */
export function validateScoreSettingsForCalculation(settings: unknown): ScoreSettings | null {
  // プリセットやインポート値は、計算へ渡す直前に
  // 保存形式とフォームの制約をもう一度確認する
  if (!isScoreSettings(settings)) return null

  // 保存値に含まれる画面非表示の合算値は使わず、フォームにあるアクションだけを取り出す
  const actionCounts: ActionCounts = {}
  for (const { id } of data.ActionCategoryList) {
    // 画面に存在するアクションだけを採用し、
    // 保存値に残った画面外の項目を計算へ渡さない
    const count = settings.actionCounts[id] ?? 0
    if (!isNonNegativeSafeInteger(count)) return null
    actionCounts[id] = count
  }

  const candidate: ScoreSettings = {
    // 後で合計値を作り直せるよう、配列や入れ子の値はすべてコピーする
    ...settings,
    actionCounts,
    scheduleSelections: { ...settings.scheduleSelections },
    parameterBonusBase: { ...settings.parameterBonusBase },
    customParamBonusRows: settings.customParamBonusRows.map((row) => ({ ...row })),
    customClassBonus: { ...settings.customClassBonus },
    customNonBonusGain: { ...settings.customNonBonusGain },
    hifExamRatios: settings.hifExamRatios.map((row) => ({ ...row })),
  }

  // シナリオ別スケジュールとフォームの値を検証し、通過した設定だけ合計値を整える
  return isValidScoreSettings(candidate, { scheduleSelections: candidate.scheduleSelections })
    ? normalizeScoreSettingsDerived(candidate)
    : null
}

/**
 * 点数・編成・凸数・回数調整の一時変更を、元の計算条件へ適用する
 *
 * 不正な選択肢、値の範囲外、存在しないカード名は計算を開始せずnullを返す
 * 各呼び出しは元の計算条件から始まるため、比較する順番で結果が変わらない
 *
 * @param snapshot - 基準となる計算条件
 * @param patch - 一時的に上書きする項目
 * @returns 一時変更後の新しい計算条件。入力が不正な場合は null
 */
export function applyCalculationVariant(
  snapshot: CalculationSnapshot,
  patch: CalculationVariantPatch,
): CalculationSnapshot | null {
  // 基準条件から一時条件を作り、設定を検証して不正な比較条件を除外する
  const nextScoreSettings = patch.scoreSettings
    ? mergeScoreSettingsVariant(snapshot.scoreSettings, patch.scoreSettings)
    : cloneScoreSettings(snapshot.scoreSettings)
  if (nextScoreSettings === null) return null

  // 編成条件もコピーし、指定されたカード名が現在のカード一覧にあることを確認する
  const nextUnitSettings = patch.unitSettings
    ? mergeUnitSettingsVariant(snapshot.unitSettings, patch.unitSettings, snapshot.cardByName)
    : cloneUnitSettings(snapshot.unitSettings)
  if (nextUnitSettings === null) return null

  // 凸数は既存値をコピーし、指定されたカードだけを差し替える
  const nextCardUncaps = { ...snapshot.cardUncaps }
  if (patch.cardUncapAll !== undefined) {
    // 全カード指定は、現在のカード一覧に同じ凸数を適用する
    if (!isEnumValue(patch.cardUncapAll, enums.UncapType)) return null
    for (const card of snapshot.allCards) nextCardUncaps[card.name] = patch.cardUncapAll
  }
  if (patch.cardUncaps !== undefined) {
    // 個別指定は現在の設定へ重ね、指定されていないカードの値を残す
    if (!isUncapRecord(patch.cardUncaps) || !hasKnownCardNames(patch.cardUncaps, snapshot.cardByName)) return null
    Object.assign(nextCardUncaps, patch.cardUncaps)
  }

  // カード別回数は形・値・カード名を検証してから、現在の設定へ重ねる
  const nextCardCountCustom = cloneCardCountCustom(snapshot.cardCountCustom)
  if (patch.cardCountCustom !== undefined) {
    if (
      !isCardCountCustom(patch.cardCountCustom) ||
      !isValidCardCountCustom(patch.cardCountCustom, snapshot.cardByName) ||
      !hasKnownCardNames(patch.cardCountCustom, snapshot.cardByName)
    ) {
      return null
    }
    Object.assign(nextCardCountCustom, cloneCardCountCustom(patch.cardCountCustom))
  }

  // すべての入力を新しい条件へまとめ、元の条件を変更せず返す
  return createCalculationSnapshot({
    scoreSettings: nextScoreSettings,
    unitSettings: nextUnitSettings,
    cardUncaps: nextCardUncaps,
    cardCountCustom: nextCardCountCustom,
    allCards: snapshot.allCards,
    cardByName: snapshot.cardByName,
  })
}

/**
 * 点数設定へ一時変更を適用し、検証済みの設定を作る
 *
 * 配列や入れ子の値はコピーしてから差し替え、元の条件と一時条件で値を共有しない
 * 自動計算で使う派生値は、最後に現在の設定から再計算する
 *
 * @param base - 一時変更を適用する前の点数設定
 * @param patch - 一時的に変更する項目
 * @returns 検証・正規化済みの点数設定。不正な場合はnull
 */
function mergeScoreSettingsVariant(base: ScoreSettings, patch: ScoreSettingsVariantPatch): ScoreSettings | null {
  // 単純な値は一時変更で上書きし、配列や入れ子の値は新しく作る
  const candidate: ScoreSettings = {
    // 単純な値と入れ子の値を分けてコピーし、元の条件へ変更を戻さない
    ...base,
    ...patch,
    parameterBonusBase: patch.parameterBonusBase ? { ...patch.parameterBonusBase } : { ...base.parameterBonusBase },
    actionCounts: { ...base.actionCounts, ...patch.actionCounts },
    scheduleSelections: { ...base.scheduleSelections, ...patch.scheduleSelections },
    customParamBonusRows: patch.customParamBonusRows
      ? patch.customParamBonusRows.map((row) => ({ ...row }))
      : base.customParamBonusRows.map((row) => ({ ...row })),
    customClassBonus: patch.customClassBonus ? { ...patch.customClassBonus } : { ...base.customClassBonus },
    customNonBonusGain: patch.customNonBonusGain ? { ...patch.customNonBonusGain } : { ...base.customNonBonusGain },
    hifExamRatios: patch.hifExamRatios
      ? patch.hifExamRatios.map((row) => ({ ...row }))
      : base.hifExamRatios.map((row) => ({ ...row })),
  }

  // シナリオ切替時は難易度なしをNoneへ寄せ、設定画面にない組み合わせを拒否する
  if (patch.scenario !== undefined) {
    // シナリオを変えたときの難易度・カスタムモードを画面の切替規則へ合わせる
    if (patch.difficulty === undefined) {
      candidate.difficulty = resolveScoreSettingsDifficulty(candidate.scenario, base.difficulty)
    }
    candidate.useCustomMode = patch.useCustomMode ?? candidate.scenario === enums.ScenarioType.Custom
  }

  const scheduleConfigurationChanged =
    patch.scenario !== undefined ||
    patch.difficulty !== undefined ||
    patch.scheduleSelections !== undefined ||
    patch.hifLessonSplitSub !== undefined
  if (scheduleConfigurationChanged && patch.scheduleSelections === undefined) {
    // シナリオ変更で前のシナリオの週を持ち越さず、切替後も使える選択だけを残す
    candidate.scheduleSelections = Object.fromEntries(
      Object.entries(candidate.scheduleSelections).filter(([weekRaw, activityId]) => {
        // 週番号と活動の組み合わせを、切替後のシナリオで使えるか確認する
        const week = data
          .getScheduleData(candidate.scenario, candidate.difficulty)
          .find((scheduleWeek) => scheduleWeek.week === Number(weekRaw))
        return (
          week !== undefined &&
          data.isScheduleActivityAllowed(week, activityId, candidate.scenario, candidate.hifLessonSplitSub)
        )
      }),
    )
  }

  // 選択肢・形・負数を確認してから、合計回数とパラメータを作り直す
  if (!isScoreSettings(candidate) || !isValidScoreSettings(candidate, patch)) return null
  // 画面の入力から自動計算される合計回数・パラメータも作り直す
  return normalizeScoreSettingsDerived(candidate)
}

/**
 * 最適編成設定へ一時変更を適用し、検証済みの設定を作る
 *
 * カード名を含む一時変更は現在のカード一覧と照合し、
 * 存在しないカードを編成計算へ渡さない
 *
 * @param base - 一時変更前の最適編成設定
 * @param patch - 一時的に変更する項目
 * @param cardByName - 利用可能なカードを名前で探す一覧
 * @returns 検証済みの最適編成設定。不正な場合はnull
 */
function mergeUnitSettingsVariant(
  base: UnitSimulatorSettings,
  patch: UnitSettingsVariantPatch,
  cardByName: ReadonlyMap<string, SupportCard>,
): UnitSimulatorSettings | null {
  // 配列やVo/Da/Viの値は、一時条件だけが変更できるコピーを作る
  const candidate = {
    // 配列と3軸の値を複製し、計算中の変更を基準条件へ戻さない
    ...base,
    ...patch,
    allowedTypes: patch.allowedTypes ? [...patch.allowedTypes] : [...base.allowedTypes],
    spConstraint: patch.spConstraint ? { ...patch.spConstraint } : { ...base.spConstraint },
    typeCountMin: patch.typeCountMin ? { ...patch.typeCountMin } : { ...base.typeCountMin },
    typeCountMax: patch.typeCountMax ? { ...patch.typeCountMax } : { ...base.typeCountMax },
    paramBonusPercent: patch.paramBonusPercent ? { ...patch.paramBonusPercent } : { ...base.paramBonusPercent },
    lockedCards: patch.lockedCards ? [...patch.lockedCards] : [...base.lockedCards],
    manualCards: patch.manualCards ? [...patch.manualCards] : [...base.manualCards],
    excludedCardNames: patch.excludedCardNames ? [...patch.excludedCardNames] : [...base.excludedCardNames],
    initialParams: patch.initialParams ? { ...patch.initialParams } : { ...base.initialParams },
  }

  // 形・範囲・カード名を検証し、画面で指定できる条件だけを返す
  if (
    !isUnitSimulatorSettings(candidate) ||
    !isValidUnitSettings(candidate) ||
    !hasKnownUnitPatchCardNames(patch, cardByName)
  ) {
    return null
  }
  return candidate
}

/**
 * 点数設定の数値項目と入れ子の配列が一時変更として有効か確認する
 *
 * @param settings - 検証対象の点数設定
 * @param patch - 検証対象の一時変更
 * @returns 計算へ渡せる値だけで構成されていればtrue
 */
function isValidScoreSettings(settings: ScoreSettings, patch: ScoreSettingsVariantPatch): boolean {
  // シナリオと難易度の組み合わせは、画面に存在する組み合わせだけを許可する
  const scoreConfigurationIsValid =
    (settings.scenario === enums.ScenarioType.Hif || settings.scenario === enums.ScenarioType.Custom
      ? settings.difficulty === enums.DifficultyType.None
      : settings.scenario === enums.ScenarioType.Hajime && settings.difficulty === enums.DifficultyType.Legend) &&
    settings.scenario !== enums.ScenarioType.Nia &&
    (settings.scenario === enums.ScenarioType.Custom) === settings.useCustomMode

  const scheduleSelectionsAreValid = isValidScheduleSelections(
    settings.scenario,
    settings.difficulty,
    settings.scheduleSelections,
    settings.hifLessonSplitSub,
  )
  const scheduleControlledPatchIsValid =
    // スケジュール連動中は、画面で直接編集できない回数を一時変更から入れさせない
    patch.actionCounts === undefined ||
    !settings.useScheduleLimits ||
    settings.useCustomMode ||
    Object.keys(patch.actionCounts).every(
      (actionId) => !isActionId(actionId) || !data.ScheduleControlledIds.has(actionId),
    )
  const parameterBonusPatchIsVisible =
    // 通常のスケジュール連動中に隠れている基礎ボーナスは直接変更させない
    patch.parameterBonusBase === undefined || (!settings.useScheduleLimits && !settings.useCustomMode)
  const customPatchIsVisible =
    // カスタム用の入力はカスタムモード以外では計算条件に入れない
    (patch.customParamBonusRows === undefined &&
      patch.customClassBonus === undefined &&
      patch.customNonBonusGain === undefined) ||
    settings.useCustomMode
  const hifPatchIsVisible =
    // HIF専用の試験比率・レッスン分割はHIF以外では無効な入力として拒否する
    (patch.hifExamRatios === undefined && patch.hifLessonSplitSub === undefined) ||
    settings.scenario === enums.ScenarioType.Hif
  const actionCountPatchIsVisible =
    // 点数設定の回数変更はフォーム表示中のアクションだけを受け付ける
    patch.actionCounts === undefined || Object.keys(patch.actionCounts).every(isVisibleScoreActionId)

  return (
    scoreConfigurationIsValid &&
    scheduleSelectionsAreValid &&
    scheduleControlledPatchIsValid &&
    actionCountPatchIsVisible &&
    parameterBonusPatchIsVisible &&
    customPatchIsVisible &&
    hifPatchIsVisible &&
    isNonNegativeParameterValues(settings.parameterBonusBase) &&
    isNonNegativeActionCounts(settings.actionCounts) &&
    settings.customParamBonusRows.length > 0 &&
    settings.customParamBonusRows.every(isNonNegativeParameterValues) &&
    isNonNegativeParameterValues(settings.customClassBonus) &&
    isNonNegativeParameterValues(settings.customNonBonusGain) &&
    settings.hifExamRatios.length === 3 &&
    settings.hifExamRatios.every(isNonNegativeParameterValues)
  )
}

/**
 * 最適編成設定の枚数・パラメータ・候補数が許容範囲内か確認する
 *
 * @param settings - 検証対象の最適編成設定
 * @returns 計算へ渡せる値だけで構成されていればtrue
 */
function isValidUnitSettings(settings: UnitSimulatorSettings): boolean {
  // SP制約とタイプ別枚数は、6枚編成の枚数として整数かつUNIT_SIZE以下に制限する
  // タイプ別枚数が編成枚数の範囲内か確認する
  const countValuesAreValid = (values: ParameterValues) =>
    hasExactParameterKeys(values) &&
    Object.values(values).every((value) => Number.isSafeInteger(value) && value >= 0 && value <= constant.UNIT_SIZE)
  const typeCountRangeIsValid = countValuesAreValid(settings.typeCountMin) && countValuesAreValid(settings.typeCountMax)

  // パラメータボーナスは画面で入力できる上限を超えないようにする
  const paramBonusIsValid =
    hasExactParameterKeys(settings.paramBonusPercent) &&
    Object.values(settings.paramBonusPercent).every(
      (value) =>
        isFiniteNumber(value) &&
        value >= 0 &&
        value <= constant.PARAMETER_BONUS_PERCENT_MAX &&
        isStepValue(value, constant.PARAMETER_BONUS_PERCENT_STEP),
    )
  // 初期パラメータはゲーム内の初期値上限を超えないようにする
  const initialParamsAreValid =
    hasExactParameterKeys(settings.initialParams) &&
    Object.values(settings.initialParams).every(
      (value) => Number.isSafeInteger(value) && value >= 0 && value <= constant.INITIAL_PARAMETER_MAX,
    )
  // 上限nullはシナリオ既定値を使う指定として許可する
  const paramCapIsValid =
    settings.paramCapOverride === null ||
    (settings.paramCapOverride !== undefined &&
      Number.isSafeInteger(settings.paramCapOverride) &&
      settings.paramCapOverride >= constant.PARAM_CAP_MIN &&
      settings.paramCapOverride <= constant.INITIAL_PARAMETER_MAX)
  // 総当たり候補数は探索負荷を制御するため、定数の範囲に制限する
  const candidateLimitIsValid =
    settings.exhaustiveCandidateLimit !== undefined &&
    Number.isSafeInteger(settings.exhaustiveCandidateLimit) &&
    settings.exhaustiveCandidateLimit >= constant.CANDIDATE_LIMIT_MIN &&
    settings.exhaustiveCandidateLimit <= constant.CANDIDATE_LIMIT_MAX

  return (
    // 列挙値の重複、枚数、探索負荷、カード名の重複を一括で確認する
    isEnumArray(settings.allowedTypes, enums.CardType) &&
    new Set(settings.allowedTypes).size === settings.allowedTypes.length &&
    countValuesAreValid(settings.spConstraint) &&
    typeCountRangeIsValid &&
    paramBonusIsValid &&
    initialParamsAreValid &&
    paramCapIsValid &&
    candidateLimitIsValid &&
    settings.manualCards.length <= constant.UNIT_SIZE &&
    hasUniqueStrings(settings.lockedCards) &&
    hasUniqueStrings(settings.excludedCardNames) &&
    hasUniqueNullableStrings(settings.manualCards) &&
    (!settings.manualRental || settings.rentalCardName !== null) &&
    (settings.rentalCardName === null || settings.rentalCardName.trim() !== '')
  )
}

/**
 * 最適編成の一時変更で指定されたカード名が、現在のカード一覧に存在するか確認する
 *
 * @param patch - カード名を含む可能性がある最適編成の一時変更
 * @param cardByName - 利用可能なカードを名前で探す一覧
 * @returns 指定されたカード名がすべて存在すればtrue
 */
function hasKnownUnitPatchCardNames(
  patch: UnitSettingsVariantPatch,
  cardByName: ReadonlyMap<string, SupportCard>,
): boolean {
  // 固定・手動・除外・レンタルのカード名を、同じ一覧で確認する
  return (
    (patch.lockedCards === undefined || hasKnownCardNames(patch.lockedCards, cardByName)) &&
    (patch.manualCards === undefined ||
      hasKnownCardNames(
        patch.manualCards.filter((name): name is string => name !== null),
        cardByName,
      )) &&
    (patch.excludedCardNames === undefined || hasKnownCardNames(patch.excludedCardNames, cardByName)) &&
    (patch.rentalCardName === undefined || patch.rentalCardName === null || cardByName.has(patch.rentalCardName))
  )
}

/**
 * Vo/Da/Viの数値が有限で0以上か確認する
 *
 * @param values - 検証対象のパラメータ値
 * @returns 3項目すべてが有効ならtrue
 */
function isNonNegativeParameterValues(values: ParameterValues): boolean {
  // 3軸が揃った安全な非負整数だけを、フォームの数値として扱う
  return (
    isParameterValues(values) && hasExactParameterKeys(values) && Object.values(values).every(isNonNegativeSafeInteger)
  )
}

/**
 * アクション回数が有効なActionIdTypeのキーで、すべて0以上か確認する
 *
 * @param value - 検証対象のアクション回数
 * @returns すべての回数が有効ならtrue
 */
function isNonNegativeActionCounts(value: ActionCounts): boolean {
  // アクションIDと回数上限は共通の検証処理で確認し、設定経路ごとの判定差をなくす
  return isActionCountRecord(value) && Object.values(value).every(isNonNegativeSafeInteger)
}

/**
 * カード別回数調整が、各カードのフォームに表示される項目だけで
 * 構成されているか確認する
 *
 * selfTrigger はカードが提供する表示対象アクション、pItemCount はPアイテムの
 * 発動トリガー1件だけを許可する。カードごとのフォームに存在しないアクションを
 * 直接注入しても計算へ渡さない
 *
 * @param custom - 検証対象のカード別回数調整
 * @param cardByName - 現在利用できるカードを名前から探す表
 * @returns フォームで指定できる回数調整だけならtrue
 */
function isValidCardCountCustom(custom: CardCountCustom, cardByName: ReadonlyMap<string, SupportCard>): boolean {
  return Object.entries(custom).every(([cardName, cardCustom]) => {
    // 保存されたカード名が現行一覧から消えていた場合は、
    // そのカードの調整を計算から除外する
    const card = cardByName.get(cardName)
    if (!card) return false

    const visibleSelfTriggerIds = new Set(
      // カードが提供するアクションのうち、
      // 点数設定フォームに表示されるものだけを対象にする
      Object.keys(getProvidedActions(card)).filter((actionId) => isVisibleScoreActionId(actionId)),
    )
    const selfTriggerKeysAreVisible =
      cardCustom.selfTrigger === undefined ||
      Object.keys(cardCustom.selfTrigger).every((actionId) => visibleSelfTriggerIds.has(actionId))

    const pItemActionId = card.p_item?.boost ? data.TriggerActionMap[card.p_item.boost.trigger_key] : undefined
    const pItemKeysAreValid =
      // Pアイテムは対応するトリガー1種類だけ、かつデータ上の最大回数まで許可する
      cardCustom.pItemCount === undefined ||
      (pItemActionId !== undefined &&
        Object.keys(cardCustom.pItemCount).every((actionId) => actionId === pItemActionId) &&
        (card.p_item?.boost?.max_count === undefined ||
          Object.values(cardCustom.pItemCount).every((count) => count <= card.p_item!.boost!.max_count!)))

    const selfTriggerIsValid =
      cardCustom.selfTrigger === undefined || Object.values(cardCustom.selfTrigger).every(isNonNegativeActionCount)
    const pItemCountIsValid =
      cardCustom.pItemCount === undefined || Object.values(cardCustom.pItemCount).every(isNonNegativeActionCount)
    return selfTriggerKeysAreVisible && pItemKeysAreValid && selfTriggerIsValid && pItemCountIsValid
  })
}

/**
 * 点数設定のアクション回数フォームに表示されるIDか確認する
 *
 * @param actionId - 確認するアクションID
 * @returns 点数設定で表示されるIDの場合はtrue
 */
function isVisibleScoreActionId(actionId: string): boolean {
  // 計算処理だけが使うアクションIDと、
  // ユーザーが点数設定で触れるアクションIDを分ける
  return data.ActionCategoryList.some((category) => category.id === actionId)
}

/**
 * 設定画面の3軸入力と同じキーだけを持つ値か確認する
 *
 * @param values - 確認するパラメータ値
 * @returns Vo/Da/Viの3軸だけを持つ場合はtrue
 */
function hasExactParameterKeys(values: ParameterValues): boolean {
  // 入力元の余分なキーや軸抜けを許さず、Vo/Da/Viの3軸を固定する
  return Object.keys(values).length === 3 && Object.values(enums.ParameterType).every((key) => key in values)
}

/**
 * 設定画面の非負整数入力として扱える値か確認する
 *
 * @param value - 確認する数値
 * @returns 非負の安全な整数の場合はtrue
 */
function isNonNegativeSafeInteger(value: number): boolean {
  // JSON経由の小数・Infinity・負数を計算へ入れない
  return Number.isSafeInteger(value) && value >= 0
}

/**
 * アクション回数として現実的な上限内の非負整数か確認する
 *
 * @param value - 確認するアクション回数
 * @returns アプリ共通上限内の場合はtrue
 */
function isNonNegativeActionCount(value: number): boolean {
  // 無限に大きい回数で計算負荷や結果を壊さないよう、アプリ共通上限を使う
  return isNonNegativeSafeInteger(value) && value <= constant.ACTION_COUNT_MAX
}

/**
 * 小数の入力刻みで指定できる値か確認する
 *
 * @param value - 確認する入力値
 * @param step - 入力欄の刻み
 * @returns 入力刻みの倍数として扱える場合はtrue
 */
function isStepValue(value: number, step: number): boolean {
  // 小数の入力刻みを、浮動小数点誤差込みで判定する
  const scaled = value / step
  return Math.abs(scaled - Math.round(scaled)) < 1e-9
}

/**
 * 文字列配列の重複と空文字を拒否する
 *
 * @param values - 確認する文字列配列
 * @returns 重複と空文字がない場合はtrue
 */
function hasUniqueStrings(values: readonly string[]): boolean {
  // 固定・除外リストの重複は編成条件の意味を曖昧にするため拒否する
  return values.every((value) => value.trim() !== '') && new Set(values).size === values.length
}

/**
 * 手動編成の文字列・null配列に重複と空文字がないか確認する
 *
 * @param values - 確認するカード名とnullの配列
 * @returns カード名に重複と空文字がない場合はtrue
 */
function hasUniqueNullableStrings(values: readonly (string | null)[]): boolean {
  // 空き枠nullは複数許可しつつ、実カード名だけは重複させない
  const names = values.filter((value): value is string => value !== null)
  return names.every((value) => value.trim() !== '') && new Set(names).size === names.length
}

/**
 * カード名のオブジェクトまたは配列が、現在のカード一覧に存在するか確認する
 *
 * @param value - 検証対象のカード名オブジェクトまたは配列
 * @param cardByName - 利用可能なカードを名前で探す一覧
 * @returns カード名がすべて存在すればtrue
 */
function hasKnownCardNames<T>(
  value: Record<string, T> | readonly string[],
  cardByName: ReadonlyMap<string, unknown>,
): boolean {
  const names = Array.isArray(value) ? value : Object.keys(value)
  // オブジェクトはキー、配列は要素をカード名として確認する
  return names.every((name) => typeof name === 'string' && cardByName.has(name))
}

/**
 * 点数設定の入れ子の値をコピーする
 *
 * @param settings - コピー元の点数設定
 * @returns 入れ子の参照を共有しない点数設定
 */
function cloneScoreSettings(settings: ScoreSettings): ScoreSettings {
  // 一時変更後に元の計算条件を変更しないよう、入れ子の値を複製する
  return {
    ...settings,
    parameterBonusBase: { ...settings.parameterBonusBase },
    actionCounts: { ...settings.actionCounts },
    scheduleSelections: { ...settings.scheduleSelections },
    customParamBonusRows: settings.customParamBonusRows.map((row) => ({ ...row })),
    customClassBonus: { ...settings.customClassBonus },
    customNonBonusGain: { ...settings.customNonBonusGain },
    hifExamRatios: settings.hifExamRatios.map((row) => ({ ...row })),
  }
}

/**
 * 最適編成設定の入れ子の値をコピーする
 *
 * @param settings - コピー元の最適編成設定
 * @returns 入れ子の参照を共有しない最適編成設定
 */
function cloneUnitSettings(settings: UnitSimulatorSettings): UnitSimulatorSettings {
  return {
    ...settings,
    allowedTypes: [...settings.allowedTypes],
    spConstraint: { ...settings.spConstraint },
    typeCountMin: { ...settings.typeCountMin },
    typeCountMax: { ...settings.typeCountMax },
    paramBonusPercent: { ...settings.paramBonusPercent },
    lockedCards: [...settings.lockedCards],
    manualCards: [...settings.manualCards],
    excludedCardNames: [...settings.excludedCardNames],
    initialParams: { ...settings.initialParams },
  }
}

/**
 * カード別回数調整の入れ子の値をコピーする
 *
 * @param custom - コピー元のカード別回数調整
 * @returns 入れ子の参照を共有しないカード別回数調整
 */
function cloneCardCountCustom(custom: CardCountCustom): CardCountCustom {
  const cloned: CardCountCustom = {}
  for (const [cardName, cardCustom] of Object.entries(custom)) {
    // 自動発動とPアイテムの回数は、指定されている場合だけ
    // 新しいオブジェクトへコピーする
    const entry: CardCustomData = {}
    if (cardCustom.selfTrigger) entry.selfTrigger = { ...cardCustom.selfTrigger }
    if (cardCustom.pItemCount) entry.pItemCount = { ...cardCustom.pItemCount }
    cloned[cardName] = entry
  }
  return cloned
}

/**
 * 現在の保存値から、カード別回数フォームに対応する調整だけを計算へ渡す
 *
 * 保存データに、カードが提供していないアクションやPアイテムと無関係な回数が
 * 残っていても、計算条件には含めない
 *
 * @param custom - 保存済みのカード別回数調整
 * @param cardByName - 現在存在するサポートを名前で探す一覧
 * @returns 現在のカードが提供する範囲へ絞った回数調整
 */
export function sanitizeCardCountCustomForCalculation(
  custom: CardCountCustom,
  cardByName: ReadonlyMap<string, SupportCard>,
): CardCountCustom {
  // 保存データに残った画面外の値は、計算へ入れる直前にもう一度絞り込む
  if (!isCardCountCustom(custom)) return {}

  const sanitized: CardCountCustom = {}
  for (const [cardName, cardCustom] of Object.entries(custom)) {
    // 現在存在しないカードの調整は計算から除外する
    const card = cardByName.get(cardName)
    if (!card) continue

    const visibleSelfTriggerIds = new Set(
      // カード提供アクションとフォーム表示対象の積集合だけを自動カウントへ残す
      Object.keys(getProvidedActions(card)).filter((actionId) => isVisibleScoreActionId(actionId)),
    )
    const selfTrigger = cardCustom.selfTrigger
      ? Object.fromEntries(
          Object.entries(cardCustom.selfTrigger).filter(
            ([actionId, count]) => visibleSelfTriggerIds.has(actionId) && isNonNegativeSafeInteger(count),
          ),
        )
      : undefined

    const pItemActionId = card.p_item?.boost ? data.TriggerActionMap[card.p_item.boost.trigger_key] : undefined
    // Pアイテムの発動トリガーに対応し、発動回数の上限を超えない値だけを残す
    const pItemCount =
      cardCustom.pItemCount && pItemActionId !== undefined
        ? Object.fromEntries(
            Object.entries(cardCustom.pItemCount).filter(
              ([actionId, count]) =>
                actionId === pItemActionId &&
                isNonNegativeSafeInteger(count) &&
                (card.p_item?.boost?.max_count === undefined || count <= card.p_item.boost.max_count),
            ),
          )
        : undefined

    const safeEntry: CardCustomData = {}
    if (selfTrigger && Object.keys(selfTrigger).length > 0) safeEntry.selfTrigger = selfTrigger
    if (pItemCount && Object.keys(pItemCount).length > 0) safeEntry.pItemCount = pItemCount
    if (Object.keys(safeEntry).length > 0) sanitized[cardName] = safeEntry
  }
  return sanitized
}
