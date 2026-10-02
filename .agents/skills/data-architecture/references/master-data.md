# マスタデータのパターン

## 選択基準

- **entries 配列**: レコードの一覧として意味があり、列挙、表示、フィルタ選択肢、派生リストを作る場合。
- **Record**: 多次元キーの lookup、enum から値への1対1対応、UI 設定の場合。
- **JSON + TS ラッパー**: ツール生成 JSON を型付け・正規化する場合。

既存の近いデータファイルを先に確認し、同じ形で表現できる場合はそのパターンを使う。

## entries + Map

```ts
interface FooEntry {
  id: FooType
  label: TranslationKey
}

const entries: FooEntry[] = [
  { id: FooType.A, label: 'ns.foo.a' },
  { id: FooType.B, label: 'ns.foo.b' },
]

const entryMap = new Map(entries.map((entry) => [entry.id, entry]))

export function getFoo(id: FooType): FooEntry {
  return entryMap.get(id)!
}
```

一覧から Set、Record、別の配列を作る場合も、元の `entries` を正本にする。マスタデータの全キー存在がテストで保証される場合は lookup の非 null assertion を許可する。

## Record

```ts
const values: Record<ScenarioType, Record<DifficultyType, SomeValue[]>> = {
  // ...
}

export function getValues(scenario: ScenarioType, difficulty: DifficultyType): SomeValue[] {
  return values[scenario][difficulty]
}
```

単純な enum と値の対応は Record を直接所有し、必要なら getter を公開する。データの欠落を実行時フォールバックで隠さず、全キーの存在をテストする。

## ファイル配置

- ツール生成 JSON: `src/data/json/<name>.json`
- カード関連: `src/data/card/<name>.ts`
- スコア関連: `src/data/score/<name>.ts`
- UI 設定: `src/data/ui/<name>.ts`
- 型: `src/types/<name>.ts`
- 環境・共有スタイル定数: `src/constant/<name>.ts`

データ定義と lookup は `data`、計算・変換は `utils`、画面状態は `hooks`、表示は `components` に置く。
