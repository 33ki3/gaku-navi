---
name: data-architecture
description: Data layer architecture for the gaku-navi project (types + constant 2-layer pattern).
---

# gaku-navi データアーキテクチャ

データ層を **types / constant** の2層に分離し、
各層の責務を明確にするためのルールを定義する。

---

## 1. 2層パターン

| 層 | ディレクトリ | 責務 | 例 |
|----|-------------|------|-----|
| **types** | `src/types/` | 型定義（`as const` enum + interface / type） | `CardType`, `RarityType`, `SupportCard` |
| **constant** | `src/constant/` | 環境定数・スタイル定数（ストレージキー・CSSクラス・デフォルト値等） | `DEFAULT_UNCAP`, `FILTER_SECTION_LABEL`, `HEADER_OPEN_KEY` |

### 各層のルール

- **types/**: `as const` パターンの enum 定義と interface / type 定義。値は文字列 or 数値リテラル。型エクスポートには `Type` サフィックスを付ける。
- **constant/**: 環境定数・スタイル定数（ストレージキー・CSSクラス・デフォルト値等）。計算・変換ロジックは `utils/` に配置する。

---

## 2. ディレクトリ構造

```
src/
  data/                    # マスタデータ（表示ラベル・ルックアップ・リスト）
    json/                  # マスタデータJSON（cards.json は自動生成で編集不可、他は手動管理のマスタ定義）
    card/                  # カード画面専用マスタデータ
    score/                 # スコア計算画面専用マスタデータ
    ui/                    # UIコンポーネントスタイルデータ（サイズ・色・バリアント）
  types/                   # 型定義（as const enum + interface / type）
  constant/                # 環境定数・スタイル定数（変更頻度の低い固定値）
```

- コンポーネントは `import * as data from '../data'` と `import * as constant from '../constant'` の namespace import で参照する（各 index.ts が再エクスポート）。

---

## 3. マスタデータの定義パターン（JSON + TS ラッパー）

データは `data/json/xxx.json` に格納し、TS ファイルは import + 型アサーション + getter のみの薄いラッパーにする。

### JSON 構造の設計原則

1. **TS側の加工を最小化する**: グループ分けや逆引きマップ等の構造は JSON 側に持たせ、TS 側のランタイム変換（`reduce`, `flatMap` 等）を避ける。
2. **配列には数値フィールドを持たせる**: 週番号等のインデックスは文字列キーではなく配列の数値フィールドに格納する（TS 側の `Number()` 変換不要）。
3. **派生データも JSON に含める**: 逆引きマップ (`action_map`) やセット化対象リスト (`controlled_action_ids`) を JSON に直接記述し、TS 側の即時関数構築を不要にする。

### JSON 構造の使い分け

| 構造 | 用途 | 例 |
|------|------|-----|
| **配列** `[{key, ...}]` | 順序付きリスト・フィルタ選択肢・表示用一覧。TS側で `Map` を構築して高速ルックアップ | `rarityDisplay.json`, `pItemRarityLabel.json`, `schedule.json`（週配列） |
| **オブジェクト** `{key: value}` | 多次元ルックアップ・複数セクション・ネストが必要な構造 | `schedule.json`（シナリオ×難易度）, `abilityValue.json`（名前×凸段階） |
| **グループ配列** `{groups: [{id, label, items}]}` | カテゴリ別にグループ化されたデータ。TS側の `reduce` グループ分けが不要 | `actionCategory.json` |
| **複合構造** `{entries, action_map, controlled_ids}` | 表示用配列 + 逆引きマップ + 派生セットを同一ファイルに格納 | `activity.json` |

**判断基準**: 単一キーで引くだけなら配列 → `Map`。複数軸のネストが必要ならオブジェクト。TS 側で加工が必要になったら JSON 構造を見直す。

### TS ラッパーの5パターン

| パターン | 用途 | 変換レベル | 例 |
|---------|------|-----------|-----|
| **A: 型assert + 直接export** | 構造がそのまま使える場合 | なし | `badge.ts`, `scoreOption.ts`, `triggerActionMap.ts` |
| **B: 型assert + getter** | 単一キーでのルックアップが必要な場合 | 軽い（Map構築 or find） | `rarityDisplay.ts`, `maxLevel.ts`, `uiStyle.ts` |
| **C: グループ展開 + 派生データ** | グループ化済みJSON から flat 配列やサマリを導出 | 中程度 | `actionCategory.ts`, `event.ts`, `abilityKeyword.ts` |
| **D: 複数JSON統合** | 2つ以上のJSONを束ねてgetterを提供 | 中程度 | `effectLabelResolver.ts`（例外的） |
| **E: 外部util変換** | 別モジュールの変換関数を適用 | 重い | `cards.ts`（`inflateCards` 呼び出し） |

```ts
// --- パターン A: 型assert + 直接 export ---
import rawData from '../json/xxx.json'
import { type FooType } from '../../types/enums'

const data = rawData as Record<FooType, BarType>
export const XxxMap = data

// --- パターン B: 型assert + getter（Map ルックアップ） ---
import rawData from '../json/xxx.json'
import { type SomeType } from '../../types/enums'
import type { TranslationKey } from '../../i18n'

interface XxxEntry { key: SomeType; label: TranslationKey }

const entries = rawData as XxxEntry[]
const ENTRY_MAP = new Map(entries.map((e) => [e.key, e]))

export function getXxxEntry(key: SomeType): XxxEntry {
  return ENTRY_MAP.get(key)!
}

// --- パターン B: 型assert + getter（Record ネスト） ---
import rawData from '../json/xxx.json'

type Data = Record<ScenarioType, Record<DifficultyType, SomeValue[]>>
const data = rawData as Data

export function getXxx(scenario: ScenarioType, difficulty: DifficultyType): SomeValue[] {
  return data[scenario][difficulty]
}

// --- パターン C: グループ展開 + 派生データ ---
import rawData from '../json/xxx.json'

const data = rawData as { groups: GroupEntry[] }

export const FlatList = data.groups.flatMap((g) => g.categories)
export const GroupMap = Object.fromEntries(data.groups.map((g) => [g.id, g.categories]))
```

---

## 4. i18n パターン

- 表示文字列は `src/i18n/locales/ja.json` で一元管理する。
- マスタデータは **i18n キー文字列**（`TranslationKey` 型）を返す。翻訳は消費側（コンポーネント）で `t()` を使う。
- コード中に日本語文字列を直書きしない。

---

## 5. マスタ命名ルール

`data/` 配下のファイルはすべてマスタデータであるため、ファイル名に `Master` 接尾辞を付けない。

- **JSON**: `data/json/<name>.json`（例: `abilityValue.json`, `maxLevel.json`）
- **TS ラッパー**: `data/<category>/<name>.ts`（例: `data/card/abilityValue.ts`）
- 名前はデータの内容を端的に表す camelCase。`Master` / `Data` / `Config` 等の冗長な接尾辞は不要。

### JSON キー命名

- JSON の構造キー・フィールド名はすべて **snake_case** にする。
- i18n キー（`ja.json`）もすべて **snake_case** にする。
- ゲーム用語・ラベルのコメントは **i18n の日本語ラベル** と一致させる。

---

## 6. utils/ の責務

`src/utils/` には計算・変換ロジックを配置する（フラット構成 + 機能特化サブディレクトリ）:

- フラット: フィルタリング・ストレージ・エクスポート・カード検索・スコア設定・プリセット
- `utils/calculator/` — スコア計算コア
- `utils/display/` — 効果テキスト合成・表示ヘルパー

data/ に計算ロジックを置かない。utils/ に設定データ定義を置かない。
