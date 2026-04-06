/**
 * AllCards データ整合性テスト
 *
 * cards.json から読み込んだ全サポートデータが正しく構造化されているかを検証する。
 * アビリティ値のパース、trigger_key のマッピング、イベント構造などのテスト。
 * データ不整合があるとスコア計算やフィルタリングが壊れるため、
 * サポートデータ更新時に必ず実行する。
 */
import { describe, expect, it } from 'vitest'
import { AllCards } from '../../data'
import { TriggerKeyType } from '../../types/enums'
import { PERCENT_SIGN, PLUS_SIGN } from '../../constant'
const validTriggerKeys = new Set(Object.values(TriggerKeyType))

describe('AllCards', () => {
  it('アビリティ値をマスタから復元できる', () => {
    // 既知のサポート「いめーじとれーにんぐ」を検索し、凸数別のアビリティ値が正しいか確認する
    const card = AllCards.find((entry) => entry.name === 'いめーじとれーにんぐ')
    expect(card).toBeDefined()

    // 凸0の値と凸4の値がマスタデータと一致すること（データ加工で値が欠落・変化していないことの確認）
    expect(card?.abilities[0].values['0']).toBe('2.8%')
    expect(card?.abilities[2].values['4']).toBe('100%')
  })

  it('source_detail を持つサポートで詳細名を保持する', () => {
    // イベント配布サポートの入手先詳細が正しく保持されているか確認する
    const card = AllCards.find((entry) => entry.source_detail?.startsWith('イベント「'))
    expect(card).toBeDefined()

    // source が 'event' で、source_detail にイベント名が含まれること
    expect(card?.source).toBe('event')
    expect(card?.source_detail).toContain('イベント「')
  })

  it('全アビリティが有効な trigger_key を持つ', () => {
    // 全サポートの全アビリティを走査し、未定義の trigger_key がないか検証する
    // 無効な trigger_key があるとスコア計算でアビリティが無視される
    for (const card of AllCards) {
      for (const ability of card.abilities) {
        expect(
          validTriggerKeys.has(ability.trigger_key),
          `${card.name} の ${ability.name_key} に無効な trigger_key: ${ability.trigger_key}`,
        ).toBe(true)
      }
    }
  })

  it('全アビリティの値文字列が数値にパースできる', () => {
    // アビリティの values（例: "2.8%", "+8.5%", "100"）が数値に変換可能か検証する
    // パース不能な値があるとスコア計算で NaN が発生する
    for (const card of AllCards) {
      for (const ability of card.abilities) {
        for (const [uncap, valueStr] of Object.entries(ability.values)) {
          // 空文字列はアビリティ未解放（stageIndex=0）を示す正当な値なのでスキップ
          if (valueStr === '') continue

          // %, + 記号を除去して数値パースを試みる
          const cleaned = valueStr.replace(PERCENT_SIGN, '').replace(PLUS_SIGN, '').trim()
          const parsed = parseFloat(cleaned)

          // 有限な数値にパースできること
          expect(
            Number.isFinite(parsed),
            `${card.name} の ${ability.name_key} 凸${uncap} の値 "${valueStr}" が数値にパースできない`,
          ).toBe(true)
        }
      }
    }
  })

  it('全サポートが events 配列を持つ', () => {
    // 全サポートにサポートイベントが存在することを確認する
    // events が空だとサポート詳細モーダルに何も表示されない
    for (const card of AllCards) {
      expect(Array.isArray(card.events), `${card.name} の events が配列でない`).toBe(true)
      expect(card.events.length, `${card.name} の events が空`).toBeGreaterThan(0)
    }
  })

  it('Pアイテムのブーストがあるサポートは必ず effectData を持つ', () => {
    // Pアイテムに boost（パラメータ上昇効果）がある場合、effect（効果テキスト）も必須
    // effect がないと詳細モーダルで効果説明を表示できない
    for (const card of AllCards) {
      if (card.p_item?.boost) {
        expect(card.p_item.effect, `${card.name} の Pアイテムに boost はあるが effect がない`).toBeDefined()
      }
    }
  })

  it('全アビリティが最大凸で値を持つ（欠落防止）', () => {
    // summaryテーブル fallback 不備によるアビリティ値欠落バグの再発防止
    // 最大凸（4凸）で全アビリティに値が存在することを検証する
    for (const card of AllCards) {
      for (const ability of card.abilities) {
        const maxUncapValue = ability.values['4']
        expect(
          maxUncapValue !== undefined && maxUncapValue !== '',
          `${card.name} の ${ability.name_key} が4凸で値を持たない（アビリティ欠落の疑い）`,
        ).toBe(true)
      }
    }
  })
})
