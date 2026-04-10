---
name: coding-conventions
description: Coding basics, import rules, comment guidelines, and general best practices for the gaku-navi project.
---

# gaku-navi コーディング規約

プロジェクト全体で守るべきコーディングルールを定義する。
データ層のアーキテクチャ（types + config の2層構造・命名規約）は **data-architecture** スキルを参照。
todo / archive の運用ルールは **.github/copilot-instructions.md を唯一の正本** とし、この skill には重複記載しない。

1. **コーディング基本規約** — コメント・ファイル分割・リテラル禁止
2. **import 規約** — namespace import パターン
3. **コメント規約** — JSDoc の書式
4. **ベストプラクティス** — デッドコード検知

---

## 1. コーディング基本規約

- **コメント**: 小学生でもわかるレベルでわかりやすく書く。何をしているか・なぜそうするかを日本語で。
- **ファイル分割**: 1ファイル150〜200行を超えたら分割を検討する。
- **文字列・数値の比較**: リテラル文字列やマジックナンバーを直接比較しない。`src/types/enums.ts` や `src/constant/` の定数を使用する。
- **enum 値の参照**: enum で定義された値は **必ず enum 定数経由で参照** する。数値・文字列リテラルの直書きは禁止。

```ts
// ✅ OK
{ uncap: UncapType.Zero, level: 40 }

// ❌ NG
{ uncap: 0, level: 40 }
```

---

## 2. import 規約

### namespace import（コンポーネント / hooks / utils）

外部から data 層と config 層にアクセスする場合は **namespace import** を使う:

```ts
import * as data from '../data'
import * as constant from '../constant'
import * as enums from '../types/enums'
```

### type-only import

型としてのみ参照する場合は `import type` を使う:

```ts
import type { SupportCard } from '../types/card'
import type { RarityType } from '../types/enums'
```

### constant/ 内部の import

`src/constant/` と `src/data/` 内部のファイル間は **namespace import を使わず直接 import** する:

```ts
// constant/ → types/
import { RarityType, UncapType } from '../../types/enums'

// constant/ → constant/
import { BADGE_ABILITY_GRID } from './styles'
```

### 直接 named import が許可されるケース

- `src/constant/` および `src/data/` 内部のファイル間参照
- `src/types/` からの型 import
- 循環参照回避が必要な場合
- namespace import と直接 import の併用

---

## 3. コメント規約（JSDoc / GoDoc）

すべてのコメントは **JSDoc 形式** (`/** ... */`) で統一する。

### TypeScript

```typescript
// ===== ファイル先頭 =====
/**
 * ファイルの概要（何のファイルか）
 *
 * 補足説明があれば2段落目に書く。
 */

// ===== 関数 =====
/**
 * 関数の概要（何をするか）
 *
 * @param paramName - パラメータの説明
 * @returns 戻り値の説明
 */

// ===== interface =====
/** インターフェースの概要 */
export interface Foo {
  /** フィールドの説明 */
  bar: string
}

// ===== 定数 =====
/** 定数の説明 */
export const FOO = 42
```

### 共通ルール

1. **必須**: すべての公開シンボル（export）に付ける。
2. **日本語**: コメントは日本語で書く。
3. **@param / @returns**: TypeScript 関数には必ず付ける。
4. **インラインコメント**: 関数内の論理ブロック前に `//` で記載。
5. **なぜやるか**: 自明でない処理には理由も書く。

---

## 4. フォーマット（Prettier）

- **コミット前に必ず `npx prettier --write` を実行する。** フォーマット漏れは CI で検出されるが、事前に防ぐ。
- ファイル編集後は `npx prettier --check "src/**/*.{ts,tsx}"` で差分がないことを確認する。
- **対象**: CI と同じ `src/**/*.{ts,tsx}`（TypeScript ファイルのみ）。JSON・CSS 等は対象外。
- Prettier の設定はプロジェクトルートの設定ファイルに従う（デフォルト設定）。

```bash
# 変更ファイルのフォーマット
npx prettier --write <ファイルパス>

# 全体チェック（CIと同じパターン）
npx prettier --check "src/**/*.{ts,tsx}"
```

---

## 5. ベストプラクティス

### フォールバック・デフォルト値ポリシー

- **原則**: フォールバック（`?? defaultValue`, `|| fallback`）は可能な限り排除する。データが存在しない場合はバグであり、フォールバックで隠さない。
- **テストで担保**: `masterData.test.ts` で enum × マスタデータの全組み合わせの存在をテストし、実行時フォールバックの必要性を排除する。
- **残してよいフォールバック**: 型上 `| null` や `| undefined` が必然の場合（例: 部分的に定義されたデータ、オプショナルプロパティ）。この場合は理由をコメントで記載する。
- **非 null アサーション `!`**: マスタデータのテストで全キーの存在が保証されている場合、`Map.get(key)!` は許可する。

### 型安全性

- **string 型を避ける**: 関数の引数・戻り値・オブジェクトのキーに `string` を使わず、enum 型（`as const` パターン）を使用する。
- **`as` キャスト制限**: `as SomeType` は **データ層**（`src/data/` 内の TS ラッパー）のみ許可。コンポーネントや utils では原則禁止。
- **i18n キー構築**: テンプレートリテラルによる動的 i18n キー構築は禁止。マスタデータまたは `effectLabelResolver.ts` 経由で返す。

### デッドコード検知・フォーマット

| ツール | 用途 | コマンド |
|--------|------|---------|
| Prettier | フォーマット確認 | `npx prettier --check "src/**/*.{ts,tsx}"` |
| TypeScript | 未使用ローカル・パラメータ | `npx tsc --noEmit` |
| ESLint | `no-unused-vars` | `npx eslint src/` |
| knip | 未使用 export・ファイル・依存 | `npx knip` |

### 一時ファイル・スクリプト

- **作業ディレクトリ**: 一時ファイルが必要な場合は必ずプロジェクトルートの `./tmp/` を使用する（git管理外）。
- **システム `/tmp` 使用禁止**: データ消失リスクがあるため、システムの `/tmp` は絶対に使わない。`pre-tool-check.sh` hook でブロック済み。
