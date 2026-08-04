/**
 * アプリ表示設定と最適編成設定の永続化テスト
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as constant from '../../constant'
import { loadAppPreferences, saveAppPreferences } from '../../utils/appPreferences'
import { loadUnitSimulatorSettings, saveUnitSimulatorSettings } from '../../utils/unitSimulatorSettings'

// 保存・読み込み・欠損補完・ストレージ例外時の既定値復帰を、表示設定と最適編成設定に分けて確認する
describe('アプリ表示設定の永続化', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    // spyを解除し、localStorageの読み取り失敗を次のテストへ持ち越さない
    vi.restoreAllMocks()
  })

  it('正しい設定を保存して読み戻せる', () => {
    const preferences = {
      showMobileBottomNav: false,
      keepMobileBottomNavFixed: true,
    }

    // 表示設定を保存し、同じストレージ形式から読み戻す
    saveAppPreferences(preferences)

    // 保存した2つの値が欠落・変換されず、そのまま復元される
    expect(loadAppPreferences()).toEqual(preferences)
  })

  it('一部の項目が欠けた設定は既定値を補完する', () => {
    // 一部項目が欠けた保存データを作り、showMobileBottomNavだけを保存する
    localStorage.setItem(constant.APP_PREFERENCES_STORAGE_KEY, JSON.stringify({ showMobileBottomNav: false }))

    // 保存されていないkeepMobileBottomNavFixedはフロント側の既定値falseで補完される
    expect(loadAppPreferences()).toEqual({ showMobileBottomNav: false, keepMobileBottomNavFixed: false })
  })

  it('localStorage の読み取りに失敗しても既定値を返す', () => {
    // ストレージ例外を発生させ、読み込み処理の安全なフォールバックを確認する
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage unavailable')
    })

    // 例外を画面へ投げず、アプリ表示設定の既定値を返す
    expect(loadAppPreferences()).toEqual(constant.DEFAULT_APP_PREFERENCES)
  })
})

describe('最適編成設定の永続化', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('正しい設定を保存して読み戻せる', () => {
    const settings = {
      ...constant.DEFAULT_UNIT_SIMULATOR_SETTINGS,
      manualRental: true,
      rentalCardName: 'テストサポート',
    }

    // レンタル指定を含む最適編成設定を保存する
    saveUnitSimulatorSettings(settings)

    // 入れ子の設定も含め、保存した設定と完全一致して復元される
    expect(loadUnitSimulatorSettings()).toEqual(settings)
  })

  it('入れ子が壊れた設定は既定値へ戻す', () => {
    // typeCountMinのdanceだけをnullにして、設定全体の形を壊す
    localStorage.setItem(
      constant.UNIT_SIMULATOR_STORAGE_KEY,
      JSON.stringify({
        ...constant.DEFAULT_UNIT_SIMULATOR_SETTINGS,
        typeCountMin: { vocal: 0, dance: null, visual: 0 },
      }),
    )

    // 部分的な補完ではなく、壊れた設定全体を安全な既定値へ戻す
    expect(loadUnitSimulatorSettings()).toEqual(constant.DEFAULT_UNIT_SIMULATOR_SETTINGS)
  })

  it('localStorage の読み取りに失敗しても既定値を返す', () => {
    // 最適編成設定の読み込みでもストレージ例外が既定値へ変換される
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage unavailable')
    })

    // 例外を握りつぶし、計算可能な既定設定を返す
    expect(loadUnitSimulatorSettings()).toEqual(constant.DEFAULT_UNIT_SIMULATOR_SETTINGS)
  })
})
