import { beforeEach, describe, expect, it } from 'vitest'
import * as constant from '../../constant'
import * as enums from '../../types/enums'
import { createDefaultSettings } from '../../utils/scoreSettings'
import {
  discardStoredData,
  discardStoredDataBatch,
  inspectStoredData,
  repairStoredData,
} from '../../utils/storageHealth'

// 保存データの検出結果を確認し、配列要素単位の修復と
// 対象キーだけの破棄ができることを検証する
describe('storageHealth', () => {
  beforeEach(() => {
    // 保存データの検査・修復結果をケース間で共有しない
    localStorage.clear()
  })

  it('壊れた保存データの項目名と理由を返す', () => {
    // 凸数は値の型を壊し、追加サポートは配列要素をnullにし、結果はJSON自体を壊す
    localStorage.setItem(constant.UNCAP_STORAGE_KEY, JSON.stringify({ テストカード: '4' }))
    localStorage.setItem(constant.USER_SUPPORTS_STORAGE_KEY, JSON.stringify([null]))
    localStorage.setItem(constant.UNIT_RESULT_STORAGE_KEY, '{')

    // 3種類の破損を一括検査し、キーごとの表示名・理由・要素位置を取得する
    const issues = inspectStoredData()

    // 画面に列挙する内容として、各キーのエラーと追加サポートの1-based位置を確認する
    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: constant.UNCAP_STORAGE_KEY,
          item: '凸数設定',
          reason: 'キーと値の組み合わせが正しくありません',
        }),
        expect.objectContaining({
          key: constant.USER_SUPPORTS_STORAGE_KEY,
          item: '追加サポート',
          reason: '配列内に不正な要素があります',
          details: [
            {
              index: 1,
              reason: 'データの構造または値が正しくありません',
            },
          ],
        }),
        expect.objectContaining({
          key: constant.UNIT_RESULT_STORAGE_KEY,
          item: '最適編成の計算結果',
          reason: 'JSONの構文が正しくありません',
        }),
      ]),
    )
  })

  it('旧保存データの不足項目は既定値補完して正常と判定する', () => {
    localStorage.setItem(
      constant.SCORE_SETTINGS_STORAGE_KEY,
      JSON.stringify({ ...createDefaultSettings(), useFixedUncap: undefined }),
    )
    localStorage.setItem(
      constant.FILTER_STORAGE_KEY,
      JSON.stringify({
        ...constant.DEFAULT_FILTER_STATE,
        cardExclusionFilters: undefined,
      }),
    )
    localStorage.setItem(
      constant.UNIT_SIMULATOR_STORAGE_KEY,
      JSON.stringify({
        ...constant.DEFAULT_UNIT_SIMULATOR_SETTINGS,
        excludedCardNames: undefined,
        ignoreCardExclusions: undefined,
      }),
    )
    localStorage.setItem(constant.APP_PREFERENCES_STORAGE_KEY, JSON.stringify({ showMobileBottomNav: false }))

    expect(inspectStoredData()).toEqual([])
  })

  it('正常な保存データへ修復処理を呼んでも削除しない', () => {
    const raw = JSON.stringify({ テストカード: enums.UncapType.Four })
    localStorage.setItem(constant.UNCAP_STORAGE_KEY, raw)

    expect(repairStoredData(constant.UNCAP_STORAGE_KEY)).toBe(true)
    expect(localStorage.getItem(constant.UNCAP_STORAGE_KEY)).toBe(raw)
  })

  it('壊れた配列要素だけを除外し、正常な要素を残して修復する', () => {
    // 正常な追加サポートとnull要素を同じ配列へ入れ、要素単位の修復を再現する
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
    localStorage.setItem(constant.USER_SUPPORTS_STORAGE_KEY, JSON.stringify([validSupport, null]))

    // 修復処理は対象キーを更新できたことをtrueで返す
    expect(repairStoredData(constant.USER_SUPPORTS_STORAGE_KEY)).toBe(true)
    // 正常なサポートは残り、壊れたnull要素だけが除外される
    expect(JSON.parse(localStorage.getItem(constant.USER_SUPPORTS_STORAGE_KEY) ?? 'null')).toEqual([validSupport])
  })

  it('設定内の配列要素も検出して、正常な値を残して修復する', () => {
    // 点数設定・プリセット・フィルターの各配列へ、正常要素と不正要素を混在させる
    const scoreSettings = {
      ...createDefaultSettings(),
      useFixedUncap: undefined,
      customParamBonusRows: [{ vocal: 1, dance: 2, visual: 3 }, null],
    }
    localStorage.setItem(constant.SCORE_SETTINGS_STORAGE_KEY, JSON.stringify(scoreSettings))
    localStorage.setItem(
      constant.SCORE_PRESETS_STORAGE_KEY,
      JSON.stringify([
        { name: '正常プリセット', settings: createDefaultSettings() },
        { name: '壊れたプリセット', settings: null },
      ]),
    )
    localStorage.setItem(
      constant.FILTER_STORAGE_KEY,
      JSON.stringify({
        searchTerm: '',
        rarities: [enums.RarityType.SSR, 'invalid'],
        types: [],
        plans: [],
        spOnly: false,
        abilityKeywords: [],
        eventFilters: [],
        sources: [],
        uncaps: [],
        countCustom: [],
        sortMode: enums.SortModeType.Rarity,
        sortReverse: false,
      }),
    )

    // それぞれのキーで、不正要素の表示位置と項目名を検出する
    const issues = inspectStoredData()
    // 検出結果には3キー分の詳細が含まれる
    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: constant.SCORE_SETTINGS_STORAGE_KEY,
          details: [expect.objectContaining({ index: 2, item: 'カスタムパラメータ行' })],
        }),
        expect.objectContaining({
          key: constant.FILTER_STORAGE_KEY,
          details: [expect.objectContaining({ index: 2, item: 'レアリティ' })],
        }),
        expect.objectContaining({
          key: constant.SCORE_PRESETS_STORAGE_KEY,
          details: [expect.objectContaining({ index: 2, item: '壊れたプリセット' })],
        }),
      ]),
    )

    // 検出した3キーを個別に修復し、各処理が成功することを確認する
    expect(repairStoredData(constant.SCORE_SETTINGS_STORAGE_KEY)).toBe(true)
    expect(repairStoredData(constant.FILTER_STORAGE_KEY)).toBe(true)
    expect(repairStoredData(constant.SCORE_PRESETS_STORAGE_KEY)).toBe(true)
    // 点数設定ではnullのカスタム行だけが除外される
    expect(JSON.parse(localStorage.getItem(constant.SCORE_SETTINGS_STORAGE_KEY) ?? 'null')).toEqual({
      ...scoreSettings,
      useFixedUncap: false,
      customParamBonusRows: [{ vocal: 1, dance: 2, visual: 3 }],
    })
    // フィルターでは不正なレアリティだけが除外され、SSRは残る
    expect(JSON.parse(localStorage.getItem(constant.FILTER_STORAGE_KEY) ?? 'null').rarities).toEqual([
      enums.RarityType.SSR,
    ])
    // プリセットでも正常な1件だけが保存される
    expect(JSON.parse(localStorage.getItem(constant.SCORE_PRESETS_STORAGE_KEY) ?? 'null')).toHaveLength(1)
  })

  it('最適編成結果のメンバー配列も正常な要素を残して修復する', () => {
    // 計算結果のmembersへ正常なメンバーとnullを入れ、配列内破損を再現する
    const validMember = {
      cardName: '正常サポート',
      uncap: enums.UncapType.Four,
      isRental: false,
      result: {
        cardName: '正常サポート',
        parameterType: enums.ParameterType.Vocal,
        eventBoost: 0,
        abilityBoosts: [],
        allAbilityDetails: [],
        parameterBonus: 0,
        paramBonusPercent: 0,
        paramBonusBase: 0,
        eventBoostBase: 0,
        eventBoostPercent: 0,
        totalIncrease: 0,
        autoCounts: {},
      },
      supportSynergy: 0,
    }
    const unitResult = {
      members: [validMember, null],
      totalScore: 0,
      totalParamBonusPercent: { vocal: 0, dance: 0, visual: 0 },
      parameterBonus: { vocal: 0, dance: 0, visual: 0 },
    }
    localStorage.setItem(constant.UNIT_RESULT_STORAGE_KEY, JSON.stringify(unitResult))

    // membersの2番目が壊れていることを検出する
    const issues = inspectStoredData()
    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: constant.UNIT_RESULT_STORAGE_KEY,
          item: '最適編成の計算結果',
          // 配列フィールド名も画面表示用の翻訳で返ることを確認する
          details: [expect.objectContaining({ index: 2, item: '最適編成の編成メンバー' })],
        }),
      ]),
    )

    // 修復成功後はnullメンバーだけを除外し、正常なメンバーを残す
    expect(repairStoredData(constant.UNIT_RESULT_STORAGE_KEY)).toBe(true)
    expect(JSON.parse(localStorage.getItem(constant.UNIT_RESULT_STORAGE_KEY) ?? 'null')).toEqual({
      ...unitResult,
      members: [validMember],
    })
  })

  it('検証対象外のキーを削除せず、対象キーだけを破棄する', () => {
    // 管理対象キーと未知キーを同時に保存し、破棄対象の境界を確認する
    localStorage.setItem(constant.UNCAP_STORAGE_KEY, JSON.stringify({ テストカード: '4' }))
    localStorage.setItem('gaku-navi-unknown-data', 'keep')

    // 管理対象の凸数キーは破棄できる
    expect(discardStoredData(constant.UNCAP_STORAGE_KEY)).toBe(true)
    // 未知キーは保護し、discardStoredDataがfalseを返す
    expect(discardStoredData('gaku-navi-unknown-data')).toBe(false)
    // 対象キーだけが削除され、未知キーの値は残る
    expect(localStorage.getItem(constant.UNCAP_STORAGE_KEY)).toBeNull()
    expect(localStorage.getItem('gaku-navi-unknown-data')).toBe('keep')
  })

  it('検出済みのキーをまとめて破棄する', () => {
    // 構文エラーのある2キーを用意し、画面の「すべて破棄」操作を再現する
    localStorage.setItem(constant.UNCAP_STORAGE_KEY, '{')
    localStorage.setItem(constant.FILTER_STORAGE_KEY, '{')

    // バッチ破棄が成功し、指定した2キーだけが削除される
    expect(discardStoredDataBatch([constant.UNCAP_STORAGE_KEY, constant.FILTER_STORAGE_KEY])).toBe(true)
    expect(localStorage.getItem(constant.UNCAP_STORAGE_KEY)).toBeNull()
    expect(localStorage.getItem(constant.FILTER_STORAGE_KEY)).toBeNull()
  })
})
