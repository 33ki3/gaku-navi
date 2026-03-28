---
name: data-architecture
description: Data layer architecture for the gaku-navi project (types + constant 2-layer pattern).
---

# gaku-navi データアーキテクチャ

データ層を **types / constant / data** の3層に分離し、
各層の責務を明確にするためのルールを定義する。

---

## 1. 2層パターン

| 層 | ディレクトリ | 責務 | 例 |
|----|-------------|------|-----|
| **types** | `src/types/` | 型定義（`as const` enum + interface / type） | `CardType`, `RarityType`, `SupportCard` |
| **constant** | `src/constant/` | 環境定数・スタイル定数（ストレージキー・CSSクラス・デフォルト値等） | `DEFAULT_UNCAP`, `FILTER_SECTION_LABEL`, `BTN_HEADER_ACTION` |

### 各層のルール

- **types/**: `as const` パターンの enum 定義と interface / type 定義。値は文字列 or 数値リテラル。型エクスポートには `Type` サフィックスを付ける。
- **constant/**: 環境定数・スタイル定数（ストレージキー・CSSクラス・デフォルト値等）。計算・変換ロジックは `utils/` に配置する。

---

## 2. ディレクトリ構造

```
src/
  data/                    # マスタデータ（表示ラベル・ルックアップ・リスト）
    json/                  # ツール自動生成JSONデータ
      cards.json
    card/                  # カード画面専用マスタデータ
    score/                 # スコア計算データ + 設定定数
    ui/                    # UIコンポーネントスタイル・ラベルデータ
  types/                   # 型定義（as const enum + interface / type）
  constant/                # 環境定数・スタイル定数（変更頻度の低い固定値）
```

- コンポーネントは `import * as data from '../data'` と `import * as constant from '../constant'` の namespace import で参照する（各 index.ts が再エクスポート）。

---

## 3. JSON と TS の使い分け

### 判断基準

| 形式 | 使い分け | 例 |
|------|----------|-----|
| **JSON** | ツール自動生成データのみ | `cards.json` |
| **Pure TS** | それ以外すべて（手動管理データ・ゲームルール・UI設定） | `schedule.ts`, `badge.ts`, `parameterStyle.ts`, `event.ts` |

### JSON を使うケース

- **ツール生成データのみ**: `json/cards.json`

### Pure TS を使うケース

- **ゲームルール数値テーブル**: スコア計算用のデータ（TS ファイル内にインライン定義）
  - `abilityValue.ts`（スケジュール・ステージ値）, `abilityException.ts`, `schedule.ts`, `lesson.ts`, `maxLevel.ts`, `triggerActionMap.ts`, `actionCategory.ts`
- **表示ラベル + enum参照**: i18nキー・enum computed keys を含む定義
- **派生データ**: Map・Set・フィルタ済みリスト等をエクスポートするもの
- **UIスタイル定数**: コンポーネントスタイルの Record 定義
- **少量データ**: エントリ数が少なく、JSON分離のメリットがないもの

### JSON 構造の設計原則

1. **TS側の加工を最小化する**: グループ分けや逆引きマップ等の構造は JSON 側に持たせ、TS 側のランタイム変換（`reduce`, `flatMap` 等）を避ける。
2. **配列には数値フィールドを持たせる**: 週番号等のインデックスは文字列キーではなく配列の数値フィールドに格納する（TS 側の `Number()` 変換不要）。
3. **派生データも JSON に含める**: 逆引きマップ (`action_map`) やセット化対象リスト (`controlled_action_ids`) を JSON に直接記述し、TS 側の即時関数構築を不要にする。

### データ定義パターン

マスタデータの定義は以下の2パターンを用途に応じて使い分ける:

| パターン | 構造 | 用途 | 例 |
|----------|------|------|-----|
| **entries[]** | 配列 `{ id, label, ... }[]` + `Map` | 正規化マスタ。リスト表示・フィルタ選択肢・getter ルックアップ | `badge.ts`, `effectLabelResolver.ts`, `event.ts`, `abilityKeyword.ts`, `activity.ts`, `typeDisplay.ts` |
| **Record** | `Record<K, V>` | 多次元ルックアップテーブル・ネスト構造・UI config | `abilityValue.ts`, `lesson.ts`, `schedule.ts`, `parameterStyle.ts`, `badgeStyle.ts` |

**判断基準**:
- **entries[] を使う場合**: データが「レコードの一覧」として意味を持つ場合（一覧表示・イテレーション・派生リスト生成する場合）。i18n ラベル付きのマスタデータはこちら。
- **Record を使う場合**: 多次元キーで引く構造（scenario×difficulty×week 等）、UI config（enum→style の単純マッピング）、1:1 のフラットマッピング（triggerActionMap 等）。

**entries[] の標準パターン**:
```ts
interface FooEntry { id: FooType; label: TranslationKey }
const entries: FooEntry[] = [
  { id: FooType.A, label: 'ns.foo.a' },
  { id: FooType.B, label: 'ns.foo.b' },
]
const entryMap = new Map(entries.map((e) => [e.id, e]))
export function getFoo(id: FooType): FooEntry { return entryMap.get(id)! }
```

### TS データファイルのパターン

| パターン | 用途 | 例 |
|---------|------|-----|
| **A: entries[] + Map + getter** | 正規化マスタの標準パターン | `badge.ts`, `effectLabelResolver.ts`, `rarityDisplay.ts`, `event.ts` |
| **B: entries[] + 派生データ** | 配列からリスト・Set・Record等を派生 | `activity.ts`, `abilityKeyword.ts`, `actionCategory.ts` |
| **C: Record + getter** | 多次元テーブルのルックアップ | `abilityValue.ts`, `lesson.ts`, `schedule.ts`, `maxLevel.ts` |
| **D: Record直接export** | enum→値の単純マッピング（UI config） | `parameterStyle.ts`, `badgeStyle.ts`, `triggerActionMap.ts` |
| **E: JSON import + 変換** | ツール生成JSONの型付け・変換 | `cards.ts`（`inflateCards` 呼び出し） |

```ts
// --- パターン A: entries[] + Map + getter ---
interface FooEntry { id: FooType; label: TranslationKey; color: string }
const entries: FooEntry[] = [
  { id: FooType.A, label: 'ns.foo.a', color: 'bg-red-100' },
  { id: FooType.B, label: 'ns.foo.b', color: 'bg-blue-100' },
]
const entryMap = new Map(entries.map((e) => [e.id, e]))
export function getFoo(id: FooType): FooEntry { return entryMap.get(id)! }

// --- パターン B: entries[] + 派生データ ---
const entries: ActivityEntry[] = [...]
export function getActivityLabel(id: ActivityIdType) { return entries.find((e) => e.id === id)!.label }
export const ActivityActionMap = Object.fromEntries(entries.map((e) => [e.id, e.actions]))
export const ControlledIds = new Set(entries.flatMap((e) => e.actions))

// --- パターン C: Record + getter（多次元テーブル） ---
const data: Record<ScenarioType, Record<DifficultyType, SomeValue[]>> = { ... }
export function getXxx(scenario: ScenarioType, difficulty: DifficultyType): SomeValue[] {
  return data[scenario][difficulty]
}

// --- パターン D: Record 直接 export（UI config） ---
const style: Record<SizeType, string> = {
  [SizeType.Sm]: 'px-1 text-xs',
  [SizeType.Md]: 'px-2 text-sm',
}
export function getStyle(size: SizeType): string { return style[size] }

// --- パターン E: JSON import + 変換 ---
import rawCards from '../json/cards.json'
export const AllCards = inflateCards(rawCards as RawCard[])
```

---

## 4. i18n パターン

- 表示文字列は `src/i18n/locales/ja.json` で一元管理する。
- マスタデータは **i18n キー文字列**（`TranslationKey` 型）を返す。翻訳は消費側（コンポーネント）で `t()` を使う。
- コード中に日本語文字列を直書きしない。

---

## 5. マスタ命名ルール

`data/` 配下のファイルはすべてマスタデータであるため、ファイル名に `Master` 接尾辞を付けない。

- **JSON**: `data/json/<name>.json`（例: `cards.json`）
- **TS**: `data/<category>/<name>.ts`（例: `data/card/badge.ts`, `data/score/activity.ts`）
- 名前はデータの内容を端的に表す camelCase。`Master` / `Data` / `Config` 等の冗長な接尾辞は不要。

### キー・プロパティ命名

| 対象 | ルール | 例 |
|------|--------|-----|
| **JSON キー** | snake_case | `can_rest`, `action_map`, `trigger_key` |
| **TS プロパティ（公開）** | camelCase | `canRest`, `isParamCategory`, `activeColor` |
| **i18n キー** | snake_case（ドット区切り） | `card.ability.initial_param` |

- JSON → TS の変換時は TS ラッパー内で snake_case → camelCase にマッピングする。
- ゲーム用語・ラベルのコメントは **i18n の日本語ラベル** と一致させる。

### 識別子カラム名

エントリの識別子（discriminator）プロパティは用途に応じて使い分ける:

| カラム名 | 用途 | 例 |
|----------|------|-----|
| `id` | エンティティの一意識別子（ルックアップ・Map キー） | `effectKeyword.id`, `abilityKeyword.id`, `skillCardViewMode.id` |
| `value` | フォーム入力の値（select/radio の value 属性） | `eventFilter.value`, `scoreOption.value`, `filterSortLabel.value` |
| ドメイン固有名 | そのフィールド自体がドメイン概念を表す場合 | `typeDisplay.cardType`, `rarityDisplay.rarity` |

---

## 6. utils/ の責務

`src/utils/` には計算・変換ロジックを配置する（フラット構成 + 機能特化サブディレクトリ）:

- フラット: フィルタリング・ストレージ・エクスポート・カード検索・スコア設定・プリセット
- `utils/calculator/` — スコア計算コア
- `utils/display/` — 効果テキスト合成・表示ヘルパー

data/ に計算ロジックを置かない。utils/ に設定データ定義を置かない。
