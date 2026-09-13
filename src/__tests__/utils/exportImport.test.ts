import { beforeEach, describe, expect, it } from 'vitest'
import * as constant from '../../constant'
import * as enums from '../../types/enums'
import { loadAppPreferences } from '../../utils/appPreferences'
import {
  applyImportPreview,
  filterImportJsonText,
  getUserDataJson,
  importUserDataText,
  mergeImportJsonText,
  prepareImportText,
} from '../../utils/exportImport'
import { loadPresets } from '../../utils/presetHelpers'
import { createDefaultSettings } from '../../utils/scoreSettings'

/**
 * テスト用のエクスポートJSONを作る
 *
 * @param data - エクスポート対象キーとJSON値
 * @param version - エクスポート形式のバージョン
 * @returns インポートへ渡すJSON文字列
 */
function makeImportData(data: Record<string, unknown>, version = constant.EXPORT_VERSION): string {
  return JSON.stringify({
    version,
    exportedAt: '2026-07-30T00:00:00.000Z',
    data,
  })
}

// プレビュー、正常反映、部分的な欠損、構文エラーの各経路で
// 保存文字列と画面用の補完値を確認する
describe('importUserDataText', () => {
  beforeEach(() => {
    // 各ケースを空のlocalStorageから始め、前のインポート結果を持ち越さない
    localStorage.clear()
  })

  it('確認前のプレビューでは保存せず、確定時だけ反映する', () => {
    // 既存の凸数を保存し、新しい凸数を含むJSONをプレビューする
    localStorage.setItem(constant.UNCAP_STORAGE_KEY, JSON.stringify({ 既存カード: 2 }))
    const preview = prepareImportText(
      makeImportData({
        [constant.UNCAP_STORAGE_KEY]: JSON.stringify({ 新しいカード: 4 }),
      }),
    )

    // プレビューは読み込み可能と判定するが、この時点ではlocalStorageを変更しない
    expect(preview.canImport).toBe(true)
    expect(localStorage.getItem(constant.UNCAP_STORAGE_KEY)).toBe(JSON.stringify({ 既存カード: 2 }))

    // 確定操作を呼んだ段階で初めて新しい凸数を保存する
    const result = applyImportPreview(preview)

    // 確定結果は成功となり、対象キーだけが新しい値へ置き換わる
    expect(result.success).toBe(true)
    expect(localStorage.getItem(constant.UNCAP_STORAGE_KEY)).toBe(JSON.stringify({ 新しいカード: 4 }))
  })

  it('一部エラーのプレビューでも保存せず、確定時に読み込み可能な項目だけ反映する', () => {
    // 凸数は正常、追加サポートは配列ではない不正値として混在させる
    localStorage.setItem(constant.UNCAP_STORAGE_KEY, JSON.stringify({ 既存カード: 2 }))
    const preview = prepareImportText(
      makeImportData({
        [constant.UNCAP_STORAGE_KEY]: JSON.stringify({ 新しいカード: 4 }),
        [constant.USER_SUPPORTS_STORAGE_KEY]: JSON.stringify({ name: '配列ではない' }),
      }),
    )

    // 正常な凸数が残るためインポート自体は可能だが、不正項目の警告を保持する
    expect(preview.canImport).toBe(true)
    expect(preview.warnings.length).toBeGreaterThan(0)
    expect(localStorage.getItem(constant.UNCAP_STORAGE_KEY)).toBe(JSON.stringify({ 既存カード: 2 }))

    // 確定時には正常な凸数だけを保存し、不正な追加サポートは書き込まない
    const result = applyImportPreview(preview)

    // 部分成功なのでsuccessはtrue、未検証の追加サポートキーは存在しない
    expect(result.success).toBe(true)
    expect(localStorage.getItem(constant.UNCAP_STORAGE_KEY)).toBe(JSON.stringify({ 新しいカード: 4 }))
    expect(localStorage.getItem(constant.USER_SUPPORTS_STORAGE_KEY)).toBeNull()
  })

  it('読み込み可能な項目がないプレビューは確定しても保存しない', () => {
    // 既存値を置いたうえで、保存対象が空のエクスポートをプレビューする
    localStorage.setItem(constant.UNCAP_STORAGE_KEY, JSON.stringify({ 既存カード: 2 }))
    const preview = prepareImportText('{"version":1,"data":{}}')

    // 保存可能なエントリがないため、確定操作自体も失敗扱いになる
    expect(preview.canImport).toBe(false)
    expect(applyImportPreview(preview).success).toBe(false)
    // 読み込み対象がない場合は既存値を変更しない
    expect(localStorage.getItem(constant.UNCAP_STORAGE_KEY)).toBe(JSON.stringify({ 既存カード: 2 }))
  })

  it('対応範囲内の過去バージョンを受け入れ、将来バージョンを拒否する', () => {
    const legacyPreview = prepareImportText(
      makeImportData(
        {
          [constant.UNCAP_STORAGE_KEY]: JSON.stringify({ 旧形式カード: enums.UncapType.Four }),
        },
        constant.MIN_SUPPORTED_EXPORT_VERSION,
      ),
    )
    const futurePreview = prepareImportText(
      makeImportData(
        {
          [constant.UNCAP_STORAGE_KEY]: { 将来形式カード: enums.UncapType.Four },
        },
        constant.EXPORT_VERSION + 1,
      ),
    )

    expect(legacyPreview.canImport).toBe(true)
    expect(futurePreview.canImport).toBe(false)
  })

  it('正しい項目はまとめて反映する', () => {
    // 凸数と空のプリセット配列という、検証を通る2キーをまとめて作る
    const result = importUserDataText(
      makeImportData({
        [constant.UNCAP_STORAGE_KEY]: JSON.stringify({ テストカード: 4 }),
        [constant.SCORE_PRESETS_STORAGE_KEY]: JSON.stringify([]),
      }),
    )

    // 2キーとも保存され、importedKeysも2になる
    expect(result.success).toBe(true)
    expect(result.importedKeys).toBe(2)
    expect(localStorage.getItem(constant.UNCAP_STORAGE_KEY)).toBe(JSON.stringify({ テストカード: 4 }))
    expect(localStorage.getItem(constant.SCORE_PRESETS_STORAGE_KEY)).toBe(JSON.stringify([]))
  })

  it('凸数が定義外なら読み込まない', () => {
    const preview = prepareImportText(
      makeImportData({
        [constant.UNCAP_STORAGE_KEY]: { テストカード: enums.UncapType.Four + 1 },
      }),
    )

    expect(preview.canImport).toBe(false)
    expect(preview.message).toContain('凸数設定')
    expect(preview.message).toContain('読み込めるデータがありませんでした')
  })

  it('新形式のJSON値を読み込み、localStorageへコンパクトに保存する', () => {
    const result = importUserDataText(
      makeImportData({
        [constant.UNCAP_STORAGE_KEY]: { テストカード: 4 },
        [constant.SETTINGS_PINNED_KEY]: true,
      }),
    )

    expect(result.success).toBe(true)
    expect(localStorage.getItem(constant.UNCAP_STORAGE_KEY)).toBe('{"テストカード":4}')
    expect(localStorage.getItem(constant.SETTINGS_PINNED_KEY)).toBe('true')
  })

  it('一部の保存値が壊れていても、正しい項目は反映して警告する', () => {
    // 既存値を用意し、凸数は正常・プリセットはJSON構文エラーの入力にする
    localStorage.setItem(constant.UNCAP_STORAGE_KEY, JSON.stringify({ 既存カード: 2 }))
    localStorage.setItem(constant.SCORE_PRESETS_STORAGE_KEY, JSON.stringify([{ name: '既存' }]))

    const result = importUserDataText(
      makeImportData({
        [constant.UNCAP_STORAGE_KEY]: JSON.stringify({ 新しいカード: 4 }),
        [constant.SCORE_PRESETS_STORAGE_KEY]: '[{"name":"壊れたプリセット"',
      }),
    )

    // 正常キーは反映できるため成功だが、壊れたプリセットの種類と原因を警告する
    expect(result.success).toBe(true)
    expect(result.message).toContain('点数設定プリセット')
    expect(result.message).toContain('JSONの構文が正しくありません')
    // 凸数は新しい値へ更新され、壊れたプリセットは既存値を保持する
    expect(localStorage.getItem(constant.UNCAP_STORAGE_KEY)).toBe(JSON.stringify({ 新しいカード: 4 }))
    expect(localStorage.getItem(constant.SCORE_PRESETS_STORAGE_KEY)).toBe(JSON.stringify([{ name: '既存' }]))
  })

  it('設定に合わないデータ形式をスキップし、正しい項目は反映する', () => {
    // 凸数は正常なJSON、追加サポートは配列ではないJSONとして入力する
    localStorage.setItem(constant.UNCAP_STORAGE_KEY, JSON.stringify({ 既存カード: 2 }))

    const result = importUserDataText(
      makeImportData({
        [constant.UNCAP_STORAGE_KEY]: JSON.stringify({ 新しいカード: 4 }),
        [constant.USER_SUPPORTS_STORAGE_KEY]: JSON.stringify({ name: '配列ではない' }),
      }),
    )

    // 正常キーだけで部分成功し、追加サポートの形式エラーがメッセージに含まれる
    expect(result.success).toBe(true)
    expect(result.message).toContain('追加サポート')
    expect(result.message).toContain('配列形式または配列内のデータが正しくありません')
    // 凸数は反映され、形式不正の追加サポートキーは保存されない
    expect(localStorage.getItem(constant.UNCAP_STORAGE_KEY)).toBe(JSON.stringify({ 新しいカード: 4 }))
    expect(localStorage.getItem(constant.USER_SUPPORTS_STORAGE_KEY)).toBeNull()
  })

  it('最適編成設定の入れ子をスキップし、正しい項目は反映する', () => {
    // 最適編成設定のspConstraintだけをnullにし、設定全体の検証を失敗させる
    localStorage.setItem(constant.UNCAP_STORAGE_KEY, JSON.stringify({ 既存カード: 2 }))
    const invalidSettings = {
      ...constant.DEFAULT_UNIT_SIMULATOR_SETTINGS,
      spConstraint: null,
    }

    const result = importUserDataText(
      makeImportData({
        [constant.UNCAP_STORAGE_KEY]: JSON.stringify({ 新しいカード: 4 }),
        [constant.UNIT_SIMULATOR_STORAGE_KEY]: JSON.stringify(invalidSettings),
      }),
    )

    // 凸数は反映できるため全体は部分成功だが、最適編成設定は保存しない
    expect(result.success).toBe(true)
    expect(result.message).toContain('最適編成設定')
    expect(localStorage.getItem(constant.UNCAP_STORAGE_KEY)).toBe(JSON.stringify({ 新しいカード: 4 }))
    expect(localStorage.getItem(constant.UNIT_SIMULATOR_STORAGE_KEY)).toBeNull()
  })

  it('最適編成設定の配列内の不正要素だけを除外する', () => {
    // 各配列へ正常値と異常値を混ぜ、配列全体ではなく
    // 要素単位で救済できることを確認する
    const invalidSettings = {
      ...constant.DEFAULT_UNIT_SIMULATOR_SETTINGS,
      allowedTypes: [...constant.DEFAULT_UNIT_SIMULATOR_SETTINGS.allowedTypes, 'invalid-type'],
      lockedCards: ['正常固定カード', null],
      manualCards: [null, '正常手動カード', 42],
    }

    const result = importUserDataText(
      makeImportData({
        [constant.UNIT_SIMULATOR_STORAGE_KEY]: JSON.stringify(invalidSettings),
      }),
    )

    // 配列要素の警告を出しつつ、インポート自体は成功する
    expect(result.success).toBe(true)
    expect(result.message).toContain('最適編成設定')
    expect(result.message).toContain('許可タイプ')
    expect(result.message).toContain('固定サポート')
    expect(result.message).toContain('手動編成サポート')
    // 保存後は許可タイプ・固定カード・手動カードの不正要素だけが除外される
    expect(JSON.parse(localStorage.getItem(constant.UNIT_SIMULATOR_STORAGE_KEY) ?? 'null')).toEqual({
      ...constant.DEFAULT_UNIT_SIMULATOR_SETTINGS,
      allowedTypes: constant.DEFAULT_UNIT_SIMULATOR_SETTINGS.allowedTypes,
      lockedCards: ['正常固定カード'],
      manualCards: [null, '正常手動カード'],
    })
  })

  it('点数設定の必須配列が壊れていれば一切上書きしない', () => {
    // 点数設定の必須配列をnullにし、設定全体を読み込めない状態にする
    const invalidSettings = {
      ...createDefaultSettings(),
      customParamBonusRows: null,
    }

    const result = importUserDataText(
      makeImportData({
        [constant.SCORE_SETTINGS_STORAGE_KEY]: JSON.stringify(invalidSettings),
      }),
    )

    // 有効な保存エントリがないため失敗し、壊れた点数設定は保存しない
    expect(result.success).toBe(false)
    expect(result.message).toContain('点数設定')
    expect(result.message).toContain('読み込めるデータがありませんでした')
    expect(localStorage.getItem(constant.SCORE_SETTINGS_STORAGE_KEY)).toBeNull()
  })

  it('点数設定の配列内の不正要素だけを除外する', () => {
    // カスタム行とHIF比率に正常値とnullを混ぜ、要素単位の除外を確認する
    const validRow = { vocal: 10, dance: 20, visual: 30 }
    const invalidSettings = {
      ...createDefaultSettings(),
      customParamBonusRows: [validRow, null],
      hifExamRatios: [null, validRow],
    }

    const result = importUserDataText(
      makeImportData({
        [constant.SCORE_SETTINGS_STORAGE_KEY]: JSON.stringify(invalidSettings),
      }),
    )

    // 両方の配列で警告を出しながら、有効な行だけを保存できる
    expect(result.success).toBe(true)
    expect(result.message).toContain('点数設定')
    expect(result.message).toContain('カスタムパラメータ行')
    expect(result.message).toContain('HIF配分比率')
    // 保存文字列ではnull要素が取り除かれ、正常な行の順序は保たれる
    expect(JSON.parse(localStorage.getItem(constant.SCORE_SETTINGS_STORAGE_KEY) ?? 'null')).toEqual({
      ...invalidSettings,
      customParamBonusRows: [validRow],
      hifExamRatios: [validRow],
    })
  })

  it('一覧フィルターの配列内の不正要素だけを除外する', () => {
    // 各フィルター配列へenum値と不正な文字列を1つずつ入れる
    const invalidFilter = {
      searchTerm: 'テスト',
      rarities: [enums.RarityType.SSR, 'invalid-rarity'],
      types: [enums.CardType.Vocal, 'invalid-type'],
      plans: [enums.PlanType.Free, 'invalid-plan'],
      spOnly: false,
      abilityKeywords: [enums.AbilityKeywordType.ParameterBonus, 'invalid-ability'],
      eventFilters: [enums.EventFilterType.Enhance, 'invalid-event'],
      sources: [enums.SourceType.User, 'invalid-source'],
      uncaps: [enums.UncapType.Four, 'invalid-uncap'],
      countCustom: [enums.CountCustomFilter.Adjusted, 'invalid-count'],
      sortMode: enums.SortModeType.Rarity,
      sortReverse: false,
    }

    const result = importUserDataText(
      makeImportData({
        [constant.FILTER_STORAGE_KEY]: JSON.stringify(invalidFilter),
      }),
    )

    // フィルター全体は読み込み可能で、除外した項目名を警告する
    expect(result.success).toBe(true)
    expect(result.message).toContain('検索・絞り込み・並び順設定')
    expect(result.message).toContain('レアリティ')
    expect(result.message).toContain('回数調整')
    // 保存後は各配列の正しいenum値だけが残り、単純値やソート設定は変更されない
    expect(JSON.parse(localStorage.getItem(constant.FILTER_STORAGE_KEY) ?? 'null')).toEqual({
      ...invalidFilter,
      rarities: [enums.RarityType.SSR],
      types: [enums.CardType.Vocal],
      plans: [enums.PlanType.Free],
      abilityKeywords: [enums.AbilityKeywordType.ParameterBonus],
      eventFilters: [enums.EventFilterType.Enhance],
      sources: [enums.SourceType.User],
      uncaps: [enums.UncapType.Four],
      countCustom: [enums.CountCustomFilter.Adjusted],
    })
  })

  it('正しい追加サポートは復元できる', () => {
    // 追加サポートの必須フィールドをすべて正しい値で作る
    const support = {
      name: 'テストサポート',
      rarity: enums.RarityType.SSR,
      plan: enums.PlanType.Free,
      type: enums.CardType.Vocal,
      parameter_type: enums.ParameterType.Vocal,
      source: enums.SourceType.User,
      release_date: '2026/07/31',
      abilities: [],
      events: [],
      p_item: null,
      skill_card: null,
    }

    const result = importUserDataText(
      makeImportData({
        [constant.USER_SUPPORTS_STORAGE_KEY]: JSON.stringify([support]),
      }),
    )

    // 正常なサポート1件を成功として保存し、JSON文字列も入力値を維持する
    expect(result.success).toBe(true)
    expect(localStorage.getItem(constant.USER_SUPPORTS_STORAGE_KEY)).toBe(JSON.stringify([support]))
  })

  it('追加サポートの必須配列が欠けていれば一切上書きしない', () => {
    // abilitiesをnullにして、配列が必須という検証に失敗するデータを作る
    const invalidSupport = {
      name: '壊れたサポート',
      rarity: 'ssr',
      plan: 'free',
      type: 'vocal',
      parameter_type: 'vocal',
      source: 'user',
      release_date: '2026/07/31',
      abilities: null,
      events: [],
      p_item: null,
      skill_card: null,
    }

    const result = importUserDataText(
      makeImportData({
        [constant.USER_SUPPORTS_STORAGE_KEY]: JSON.stringify([invalidSupport]),
      }),
    )

    // 不正なサポートしかないため失敗し、保存キーを作らない
    expect(result.success).toBe(false)
    expect(result.message).toContain('追加サポート')
    expect(result.message).toContain('読み込めるデータがありませんでした')
    expect(localStorage.getItem(constant.USER_SUPPORTS_STORAGE_KEY)).toBeNull()
  })

  it('配列内の壊れた追加サポートだけを除外し、正常な要素を反映する', () => {
    // 正常なサポートと、abilitiesがnullの壊れたサポートを同じ配列へ入れる
    const validSupport = {
      name: '正常サポート',
      rarity: enums.RarityType.SSR,
      plan: enums.PlanType.Free,
      type: enums.CardType.Vocal,
      parameter_type: enums.ParameterType.Vocal,
      source: enums.SourceType.User,
      release_date: '2026/08/01',
      abilities: [],
      events: [],
      p_item: null,
      skill_card: null,
    }
    const invalidSupport = {
      name: '壊れたサポート',
      abilities: null,
    }

    const result = importUserDataText(
      makeImportData({
        [constant.USER_SUPPORTS_STORAGE_KEY]: JSON.stringify([validSupport, invalidSupport]),
      }),
    )

    // 配列自体は読み込めるため成功し、2件目の名前を含む除外警告を出す
    expect(result.success).toBe(true)
    expect(result.message).toContain('追加サポート')
    expect(result.message).toContain('2件目（壊れたサポート）')
    expect(result.message).toContain('読み込めるデータだけ反映します')
    // 保存されるのは正常な1件だけで、配列の順序も維持される
    expect(JSON.parse(localStorage.getItem(constant.USER_SUPPORTS_STORAGE_KEY) ?? 'null')).toEqual([validSupport])
  })

  it('配列内の壊れた点数設定プリセットだけを除外し、正常な要素を反映する', () => {
    // 正常なプリセットと、settingsがnullの壊れたプリセットを混在させる
    const validPreset = { name: '正常プリセット', settings: createDefaultSettings() }
    const invalidPreset = { name: '壊れたプリセット', settings: null }

    const result = importUserDataText(
      makeImportData({
        [constant.SCORE_PRESETS_STORAGE_KEY]: JSON.stringify([validPreset, invalidPreset]),
      }),
    )

    // 有効なプリセットだけを反映し、壊れた2件目を警告する
    expect(result.success).toBe(true)
    expect(result.message).toContain('点数設定プリセット')
    expect(result.message).toContain('2件目（壊れたプリセット）')
    // 保存結果は正常なプリセット1件だけになる
    expect(JSON.parse(localStorage.getItem(constant.SCORE_PRESETS_STORAGE_KEY) ?? 'null')).toEqual([validPreset])
  })

  it('未対応のキーをスキップし、正しい項目は反映する', () => {
    // 対応済みの凸数キーと、アプリが扱わない未知キーを同時に入力する
    localStorage.setItem(constant.UNCAP_STORAGE_KEY, JSON.stringify({ 既存カード: 2 }))

    const result = importUserDataText(
      makeImportData({
        [constant.UNCAP_STORAGE_KEY]: JSON.stringify({ 新しいカード: 4 }),
        'gaku-navi-unknown-data': JSON.stringify({ value: true }),
      }),
    )

    // 未知キーの警告を出しつつ、対応済みキーの反映は成功する
    expect(result.success).toBe(true)
    expect(result.message).toContain('gaku-navi-unknown-data')
    expect(result.message).toContain('対応していない項目')
    // 対応済みキーだけが更新され、未知キーはインポート対象にならない
    expect(localStorage.getItem(constant.UNCAP_STORAGE_KEY)).toBe(JSON.stringify({ 新しいカード: 4 }))
  })

  it('不足項目がある点数設定プリセットを初期値補完し、保存文字列は変更しない', () => {
    // 後から追加されたキーがない保存データを作り、インポート時の既定値補完を確認する
    const partialSettings = {
      name: '一部項目欠落プリセット',
      scenario: enums.ScenarioType.Hajime,
      difficulty: enums.DifficultyType.Legend,
      parameterBonusBase: { vocal: 10, dance: 20, visual: 30 },
      actionCounts: { [enums.ActionIdType.ClassWork]: 2 },
      useScheduleLimits: true,
      includeSelfTrigger: true,
      includePItem: true,
    }
    const rawPresets = JSON.stringify([{ name: '一部項目欠落プリセット', settings: partialSettings }])

    const result = importUserDataText(
      makeImportData({
        [constant.SCORE_PRESETS_STORAGE_KEY]: rawPresets,
      }),
    )

    // 不足項目がある設定でも読み込みは成功し、補完が行われたことをメッセージで知らせる
    expect(result.success).toBe(true)
    expect(result.message).toContain('初期値で補完')
    expect(localStorage.getItem(constant.SCORE_PRESETS_STORAGE_KEY)).toBe(rawPresets)

    // localStorageの生文字列は変えず、読み込み時だけ不足項目を補完する
    const loaded = loadPresets()
    // 現在のアクションIDは保持され、追加された既定値だけが読み込み時に補完される
    expect(loaded).toHaveLength(1)
    expect(loaded[0].settings.useFixedUncap).toBe(false)
    expect(loaded[0].settings.customParamBonusRows).toEqual([{ vocal: 0, dance: 0, visual: 0 }])
    expect(loaded[0].settings.actionCounts[enums.ActionIdType.ClassWork]).toBe(2)
  })

  it('全項目が揃った点数設定プリセットには補完警告を出さない', () => {
    // 現行の既定値をすべて持つプリセットを作り、誤って不足扱いされないことを確認する
    const settings = createDefaultSettings(enums.ScenarioType.Hif)
    const rawPresets = JSON.stringify([{ name: '完全なプリセット', settings }])

    const result = importUserDataText(
      makeImportData({
        [constant.SCORE_PRESETS_STORAGE_KEY]: rawPresets,
      }),
    )

    // 完全な設定は補完なしで読み込まれるため、初期値補完の警告を出さない
    expect(result.success).toBe(true)
    expect(result.message).not.toContain('初期値で補完')
    expect(localStorage.getItem(constant.SCORE_PRESETS_STORAGE_KEY)).toBe(rawPresets)
  })

  it('不足項目がある一般オプションを初期値補完し、保存文字列は変更しない', () => {
    // keepMobileBottomNavFixedがない保存データをそのまま保存する
    const rawPreferences = JSON.stringify({ showMobileBottomNav: false })
    const result = importUserDataText(
      makeImportData({
        [constant.APP_PREFERENCES_STORAGE_KEY]: rawPreferences,
      }),
    )

    // インポートは成功し、不足項目を補完したことをメッセージに含める
    expect(result.success).toBe(true)
    expect(result.message).toContain('一般オプション')
    expect(result.message).toContain('初期値で補完')
    expect(localStorage.getItem(constant.APP_PREFERENCES_STORAGE_KEY)).toBe(rawPreferences)
    // 生データは変更せず、アプリから読む時だけ新しい項目を既定値falseで補完する
    expect(loadAppPreferences()).toEqual({ showMobileBottomNav: false, keepMobileBottomNavFixed: false })
  })

  it('JSON全体が壊れていれば、エラー位置を表示する', () => {
    // dataの値を欠落させ、JSON.parseできない構文エラーを作る
    const result = importUserDataText('{\n  "version": 1,\n  "data": }')

    // インポートを失敗扱いにし、利用者が修正できる行・文字位置を
    // メッセージへ含める
    expect(result.success).toBe(false)
    expect(result.message).toContain('JSON全体の構文が正しくありません')
    expect(result.message).toMatch(/3行目、\d+文字目付近/)
  })
})

// JSONエクスポート日時の表記を確認する
describe('getUserDataJson', () => {
  beforeEach(() => {
    // エクスポート対象を空にして、日時フィールドだけを検証する
    localStorage.clear()
  })

  it('エクスポート日時をJSTのISO 8601形式で記録する', () => {
    // UTCの16時03分24秒は、JSTでは翌日01時03分24秒になる日時を使う
    const exported = JSON.parse(getUserDataJson(new Date('2026-08-04T16:03:24.673Z'))) as { exportedAt: string }

    // JSONへ記録する日時がUTC表記ではなく、日本標準時のオフセット付きになることを確認する
    expect(exported.exportedAt).toBe('2026-08-05T01:03:24.673+09:00')
  })

  it('エクスポートJSONは整形済み文字列で出力する', () => {
    localStorage.setItem(constant.UNCAP_STORAGE_KEY, JSON.stringify({ テストカード: 4 }))

    const exportedText = getUserDataJson(new Date('2026-08-04T00:00:00.000Z'), [constant.UNCAP_STORAGE_KEY])

    expect(exportedText).toContain('\n  "version": 2,')
    expect(exportedText).toContain(`\n    "${constant.UNCAP_STORAGE_KEY}": {`)
  })

  it('未保存キーと壊れたキーを除外し、救出できる配列要素だけを出力する', () => {
    // 正常な凸数、正常・不正が混在するプリセット、未知キーをlocalStorageへ用意する
    const validPreset = { name: '正常プリセット', settings: createDefaultSettings() }
    const rawPresets = JSON.stringify([validPreset, { name: '壊れたプリセット', settings: null }])
    localStorage.setItem(constant.UNCAP_STORAGE_KEY, JSON.stringify({ テストカード: enums.UncapType.Four }))
    localStorage.setItem(constant.SCORE_PRESETS_STORAGE_KEY, rawPresets)
    localStorage.setItem('gaku-navi-unknown-data', JSON.stringify({ value: true }))

    const exported = JSON.parse(getUserDataJson()) as { data: Record<string, unknown> }

    // 存在しないキーとEXPORT_KEYSにない未知キーは、JSONのdataへ含めない
    expect(Object.keys(exported.data)).toEqual([constant.UNCAP_STORAGE_KEY, constant.SCORE_PRESETS_STORAGE_KEY])
    expect(exported.data['gaku-navi-unknown-data']).toBeUndefined()
    // 正常な凸数はJSON値として出力する
    expect(exported.data[constant.UNCAP_STORAGE_KEY]).toEqual({ テストカード: enums.UncapType.Four })
    // プリセットは正常な要素だけを残し、不正な要素を出力しない
    expect(exported.data[constant.SCORE_PRESETS_STORAGE_KEY]).toEqual([validPreset])
    // エクスポート時の検証では、元のlocalStorage文字列を変更しない
    expect(localStorage.getItem(constant.SCORE_PRESETS_STORAGE_KEY)).toBe(rawPresets)
  })

  it('救出できない壊れたキーをJSONから省略する', () => {
    // 配列としてパースできないプリセットをlocalStorageへ保存する
    const brokenPresets = '[{"name":"壊れたプリセット"'
    localStorage.setItem(constant.SCORE_PRESETS_STORAGE_KEY, brokenPresets)

    const exported = JSON.parse(getUserDataJson()) as { data: Record<string, unknown> }

    // 救出できないキーは出力せず、既存の壊れた文字列もlocalStorageに残す
    expect(exported.data[constant.SCORE_PRESETS_STORAGE_KEY]).toBeUndefined()
    expect(localStorage.getItem(constant.SCORE_PRESETS_STORAGE_KEY)).toBe(brokenPresets)
  })

  it('選択したキーだけをエクスポートする', () => {
    localStorage.setItem(constant.UNCAP_STORAGE_KEY, JSON.stringify({ 選択カード: 4 }))
    localStorage.setItem(constant.SCORE_PRESETS_STORAGE_KEY, JSON.stringify([]))

    const exported = JSON.parse(
      getUserDataJson(new Date('2026-08-04T00:00:00.000Z'), [constant.UNCAP_STORAGE_KEY]),
    ) as { data: Record<string, unknown> }

    expect(Object.keys(exported.data)).toEqual([constant.UNCAP_STORAGE_KEY])
    expect(exported.data[constant.UNCAP_STORAGE_KEY]).toEqual({ 選択カード: 4 })
  })

  it('選択されていないJSONのキーは既存値を変更しない', () => {
    localStorage.setItem(constant.UNCAP_STORAGE_KEY, JSON.stringify({ 既存カード: 1 }))
    localStorage.setItem(constant.SCORE_PRESETS_STORAGE_KEY, JSON.stringify([{ name: '既存' }]))
    const text = makeImportData({
      [constant.UNCAP_STORAGE_KEY]: JSON.stringify({ 新しいカード: 4 }),
      [constant.SCORE_PRESETS_STORAGE_KEY]: JSON.stringify([]),
    })

    const preview = prepareImportText(text, [constant.UNCAP_STORAGE_KEY])
    expect(preview.canImport).toBe(true)
    expect(preview.excludedKeys).toEqual([constant.SCORE_PRESETS_STORAGE_KEY])
    expect(applyImportPreview(preview).success).toBe(true)
    expect(localStorage.getItem(constant.UNCAP_STORAGE_KEY)).toBe(JSON.stringify({ 新しいカード: 4 }))
    expect(localStorage.getItem(constant.SCORE_PRESETS_STORAGE_KEY)).toBe(JSON.stringify([{ name: '既存' }]))
  })

  it('選択状態による案内とデータ検証の警告を分けて返す', () => {
    const preview = prepareImportText(
      makeImportData({
        [constant.UNCAP_STORAGE_KEY]: JSON.stringify({ カード: 4 }),
        [constant.SCORE_PRESETS_STORAGE_KEY]: JSON.stringify([]),
      }),
      [constant.UNCAP_STORAGE_KEY, constant.USER_SUPPORTS_STORAGE_KEY],
    )

    expect(preview.canImport).toBe(true)
    expect(preview.selectionWarnings).toHaveLength(2)
    expect(preview.validationWarnings).toEqual([])
    expect(preview.warnings).toEqual(preview.selectionWarnings)
  })

  it('選択されているがJSONにないキーは既存値を変更しない', () => {
    localStorage.setItem(constant.UNCAP_STORAGE_KEY, JSON.stringify({ 既存カード: 1 }))
    localStorage.setItem(constant.SCORE_PRESETS_STORAGE_KEY, JSON.stringify([{ name: '既存' }]))

    const preview = prepareImportText(
      makeImportData({ [constant.UNCAP_STORAGE_KEY]: JSON.stringify({ 新しいカード: 4 }) }),
      [constant.UNCAP_STORAGE_KEY, constant.SCORE_PRESETS_STORAGE_KEY],
    )

    expect(preview.missingKeys).toEqual([constant.SCORE_PRESETS_STORAGE_KEY])
    expect(applyImportPreview(preview).success).toBe(true)
    expect(localStorage.getItem(constant.SCORE_PRESETS_STORAGE_KEY)).toBe(JSON.stringify([{ name: '既存' }]))
  })

  it('JSON入力欄を選択キーだけに絞り込む', () => {
    const text = makeImportData({
      [constant.UNCAP_STORAGE_KEY]: JSON.stringify({ カード: 4 }),
      [constant.SCORE_PRESETS_STORAGE_KEY]: JSON.stringify([]),
    })

    const filtered = JSON.parse(filterImportJsonText(text, [constant.UNCAP_STORAGE_KEY])) as {
      data: Record<string, unknown>
    }

    expect(Object.keys(filtered.data)).toEqual([constant.UNCAP_STORAGE_KEY])
    expect(filtered.data[constant.UNCAP_STORAGE_KEY]).toEqual({ カード: 4 })
  })

  it('外側の形式を編集中でもdata内の未選択キーを表示から除外する', () => {
    const text = makeImportData(
      {
        [constant.UNCAP_STORAGE_KEY]: JSON.stringify({ カード: 4 }),
        [constant.SCORE_PRESETS_STORAGE_KEY]: JSON.stringify([]),
      },
      999,
    )

    const filtered = JSON.parse(filterImportJsonText(text, [constant.UNCAP_STORAGE_KEY])) as {
      data: Record<string, unknown>
    }

    expect(Object.keys(filtered.data)).toEqual([constant.UNCAP_STORAGE_KEY])
  })

  it('選択状態を変更しても表示対象外の編集内容を保持する', () => {
    const source = makeImportData({
      [constant.UNCAP_STORAGE_KEY]: { カード: enums.UncapType.Three },
      [constant.SCORE_PRESETS_STORAGE_KEY]: [],
    })
    const edited = filterImportJsonText(source, [constant.UNCAP_STORAGE_KEY])
    // 選択中の凸数を編集したあと、プリセットを再選択した表示を作る
    const mergedSource = mergeImportJsonText(
      source,
      edited.replace(`"カード": ${enums.UncapType.Three}`, `"カード": ${enums.UncapType.Four}`),
      [constant.UNCAP_STORAGE_KEY],
    )
    expect(mergedSource).not.toBeNull()
    const merged = filterImportJsonText(mergedSource ?? source, [
      constant.UNCAP_STORAGE_KEY,
      constant.SCORE_PRESETS_STORAGE_KEY,
    ])

    const data = JSON.parse(merged).data
    expect(data[constant.UNCAP_STORAGE_KEY]).toEqual({ カード: enums.UncapType.Four })
    expect(data[constant.SCORE_PRESETS_STORAGE_KEY]).toEqual([])
  })
})

describe('選択したデータのインポート・エクスポート', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('選択中のキーだけをエクスポートし、他の保存データを変更しない', () => {
    const selectedKeys = [constant.UNCAP_STORAGE_KEY, constant.SETTINGS_PINNED_KEY] as const
    const untouchedPresets = JSON.stringify([{ name: '既存プリセット', settings: createDefaultSettings() }])
    localStorage.setItem(constant.UNCAP_STORAGE_KEY, JSON.stringify({ 選択カード: 4 }))
    localStorage.setItem(constant.SETTINGS_PINNED_KEY, JSON.stringify(true))
    localStorage.setItem(constant.SCORE_PRESETS_STORAGE_KEY, untouchedPresets)
    localStorage.setItem('gaku-navi-unknown-data', JSON.stringify({ value: '既存値' }))

    const exported = JSON.parse(getUserDataJson(new Date('2026-08-16T00:00:00.000Z'), selectedKeys)) as {
      data: Record<string, unknown>
    }

    expect(Object.keys(exported.data)).toEqual([...selectedKeys])
    expect(exported.data[constant.UNCAP_STORAGE_KEY]).toEqual({ 選択カード: 4 })
    expect(exported.data[constant.SETTINGS_PINNED_KEY]).toBe(true)
    expect(localStorage.getItem(constant.SCORE_PRESETS_STORAGE_KEY)).toBe(untouchedPresets)
    expect(localStorage.getItem('gaku-navi-unknown-data')).toBe(JSON.stringify({ value: '既存値' }))
  })

  it('選択中のキーだけをインポートし、未選択キーと未知キーを変更しない', () => {
    const selectedKeys = [constant.UNCAP_STORAGE_KEY, constant.SETTINGS_PINNED_KEY] as const
    const existingPresets = JSON.stringify([{ name: '既存プリセット', settings: createDefaultSettings() }])
    const existingUnknownData = JSON.stringify({ value: '既存値' })
    localStorage.setItem(constant.UNCAP_STORAGE_KEY, JSON.stringify({ 既存カード: 1 }))
    localStorage.setItem(constant.SETTINGS_PINNED_KEY, JSON.stringify(false))
    localStorage.setItem(constant.SCORE_PRESETS_STORAGE_KEY, existingPresets)
    localStorage.setItem('gaku-navi-unknown-data', existingUnknownData)

    const result = importUserDataText(
      makeImportData({
        [constant.UNCAP_STORAGE_KEY]: { 新しいカード: 4 },
        [constant.SETTINGS_PINNED_KEY]: true,
        [constant.SCORE_PRESETS_STORAGE_KEY]: [{ name: 'インポート側' }],
        'gaku-navi-unknown-data': { value: 'インポート側' },
      }),
      selectedKeys,
    )

    expect(result.success).toBe(true)
    expect(result.importedKeys).toBe(selectedKeys.length)
    expect(localStorage.getItem(constant.UNCAP_STORAGE_KEY)).toBe(JSON.stringify({ 新しいカード: 4 }))
    expect(localStorage.getItem(constant.SETTINGS_PINNED_KEY)).toBe(JSON.stringify(true))
    expect(localStorage.getItem(constant.SCORE_PRESETS_STORAGE_KEY)).toBe(existingPresets)
    expect(localStorage.getItem('gaku-navi-unknown-data')).toBe(existingUnknownData)
  })

  it('全項目を未選択にすると空のエクスポートになり、インポートでも既存値を変更しない', () => {
    const existingUncaps = JSON.stringify({ 既存カード: 2 })
    localStorage.setItem(constant.UNCAP_STORAGE_KEY, existingUncaps)

    const exported = JSON.parse(getUserDataJson(new Date('2026-08-16T00:00:00.000Z'), [])) as {
      data: Record<string, unknown>
    }
    const result = importUserDataText(makeImportData({ [constant.UNCAP_STORAGE_KEY]: { 新しいカード: 4 } }), [])

    expect(exported.data).toEqual({})
    expect(result.success).toBe(false)
    expect(localStorage.getItem(constant.UNCAP_STORAGE_KEY)).toBe(existingUncaps)
  })
})
