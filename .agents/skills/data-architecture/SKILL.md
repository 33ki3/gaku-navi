---
name: data-architecture
description: gaku-navi の types / constant / data、i18n、マスタデータの配置や構造を変更する場合に使用する。
---

# データアーキテクチャ

変更対象の周辺実装を確認し、次の責務境界を維持する。マスタデータを追加・再編する場合は [references/master-data.md](references/master-data.md) も読む。

## 責務

| 層       | ディレクトリ    | 内容                                                            |
| -------- | --------------- | --------------------------------------------------------------- |
| types    | `src/types/`    | `as const` の enum 相当値、interface、type                      |
| constant | `src/constant/` | ストレージキー、既定値、共有 CSS クラスなどの環境・スタイル定数 |
| data     | `src/data/`     | ゲームルール、マスタデータ、そこから作る lookup / Map / Set     |

- 計算・変換ロジックは `src/utils/`、状態管理は `src/hooks/`、画面構成は `src/components/` に置く。
- UI 専用の設定・ラベルデータは `src/data/ui/`、共有スタイル定数は `src/constant/` または既存の `src/styles/` に置く。
- コンポーネントからは `data` と `constant` の barrel を namespace import する。層内部の import 規則は `coding-conventions` に従う。

## JSON と TypeScript

- JSON はツール生成データに限る。現在の対象は `src/data/json/cards.json`。
- 手動管理のゲームルール、表示設定、派生データは TypeScript に置く。
- JSON の型付け、snake_case から camelCase への正規化、検索用 lookup の生成は1つの TS ラッパーへ集約する。
- 元データにない派生値を UI ごとに重複定義しない。

## i18n

- 表示文字列は `src/i18n/locales/ja.json` で管理する。
- マスタデータは `TranslationKey` を返し、翻訳はコンポーネント側で `t()` を使う。
- コード中へ日本語の表示文字列を直書きしない。

## 命名

- 新規データファイルは内容が分かる camelCase 名にし、機械的な `Master` / `Data` / `Config` 接尾辞を避ける。既存のドメイン固有名は理由なく変更しない。
- JSON キーは snake_case、公開 TS プロパティは camelCase、i18n キーは snake_case のドット区切りにする。
- エンティティの一意識別子は `id`、フォーム値は `value`、ドメイン概念そのものはドメイン固有名を使う。

## `utils/` との境界

`src/data/` はゲームルールと設定データ、その lookup を所有する。画面をまたぐ計算フロー、永続化、フィルタリング、エクスポートは `src/utils/` に置く。スコア計算は `src/utils/calculator/`、表示用の合成処理は `src/utils/display/` を使う。
