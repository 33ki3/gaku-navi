---
name: coding-conventions
description: gaku-navi の TypeScript / React コード、import、コメント、型安全性を変更する場合に使用する。
---

# コーディング規約

既存コードの責務と周辺の書き方を確認し、今回触る範囲へ適用する。データ配置を変える場合は `data-architecture`、UI を変える場合は `ui-components` も使用する。

## 基本方針

- ファイルは行数ではなく、責務・再利用性・テスト容易性が改善する境界で分ける。
- API 契約・共有ドメイン値・仕様値は、生の文字列リテラルを呼び出し側へ繰り返し書かず、既存の enum 相当値や `src/constant/` の定数を使う。新しい値は複数箇所で使う場合や外部契約を表す場合に名前を付けて集約する。単発で意味が明らかな DOM イベント名やレイアウト値まで機械的に定数化しない。
- `as const` で定義した enum 相当値は定数経由で参照する。
- `enum` 宣言は同じ名前を値と型の両方に使い、`as const` object とそこから作る union 型も値 object と同名にできる。TypeScript は値と型の名前空間を分けるためで、`Type` 接尾辞はいずれも必須ではない。
- 命名はドメイン上の意味を優先し、そのうえで同じ領域の既存形に合わせる。`src/types/enums.ts` には値と型を同じ `RarityType` で表す形や、`const LessonPart` / `type LessonPart` のように接尾辞なしで同名にする形がある。`src/types/application.ts` は `DomainIssueCode` / `DomainIssueCodeType` のように分けている。
- 新しい名前も概念の意味から決める。
  - `Type`: `CardType` のように概念そのものに含まれる場合、または `DomainIssueCodeType` のように既存の型 alias 命名に合わせる場合に使う。
  - `Kind`: `BreakdownRowKind` のように分類・種別が概念名や判別子として必要な場合に使う。`Type` の代わりとして機械的に付けない。`BreakdownRowKindType` では `Kind` が概念名、`Type` が enum 相当値の命名で、役割が異なる。
  - 接尾辞なし: `LessonPart`・`HifStage`・`CountCustomFilter` のように名詞だけで意味が明確なら汎用接尾辞を足さない。
- 表示文字列は i18n で管理し、動的な i18n キーをテンプレートリテラルで組み立てない。
- `as SomeType` は `src/data/` の TS ラッパーに限って使用し、コンポーネントや utils では原則使わない。

## 実装判断

- 抽象化は、実際の重複を減らすか責務・契約を明確にする場合に行う。将来の仮定だけを理由に仕組みを増やさず、テスト専用の処理は本番モジュールへ置かない。
- 同じ目的・契約の処理は、近くの実装と入口・命名・責務分担を合わせる。分ける場合は、データの寿命、利用者に見える契約、実際の責務など、コード上の差に基づいて分ける。
- 上限や既定値を追加するときは、同じ意味の既存設定値・定数を検索する。設定可能な値と処理内の固定値を二重管理しない。意味や適用範囲が異なる値は、数字が同じでも無理に統合しない。
- 入力や保存値の欠落と不正値を区別する。必須データの欠落を `??` や `||` のフォールバックで隠さず、後方互換など仕様上省略可能な値だけ既定値で補う。不正な値が存在する場合は、既定値へ黙って置き換えず検証する。

## import

コンポーネント、hooks、utils から data / constant / enum の値を使う場合は namespace import を使う。

```ts
import * as data from '../data'
import * as constant from '../constant'
import * as enums from '../types/enums'
```

型だけを参照する場合は `import type` を使う。`src/constant/` と `src/data/` 内部の相互参照、型 import、循環参照の回避では named import を使用してよい。

`src/types/` の型は定義元から直接 import し、別の型ファイル経由で便宜上の再exportを追加しない。

import 宣言の並びはエディタの TypeScript `Organize Imports` で揃える。1つの宣言内の named import は ESLint の `sort-imports` 順に並べ、変更したファイルに `npx eslint <file>` を実行して確認する。

## コメント

コメントを追加・変更する場合は [references/comments.md](references/comments.md) を読む。要点は次のとおり。

- コードだけでは分からない責務、制約、理由を日本語で説明する。コードの逐語訳や変更履歴は書かない。
- `Q:`、`TODO:`、回答文、レビュー相手へのメッセージをソースへ残さない。必要なら `todo-management` を使う。
- 同じ説明をファイル、JSDoc、インラインコメントへ重複させない。
- 処理を持つファイルには先頭に責務の概要を付け、複数段階の処理には各ブロックの目的・理由を説明するコメントを周辺ファイルと同じ粒度で付ける。

## 一時ファイル

一時ファイルやスクリプトはリポジトリの `./tmp/` に置く。システムの `/tmp` は使わない。

## 検証

変更の種類と範囲に合うチェックを選ぶ。小さな変更へ全体チェックを機械的にすべて実行せず、複数層にまたがる変更では必要な全体チェックを加える。変更が原因の失敗は修正して再実行する。ドキュメントだけの変更ではアプリのチェックは不要。

全体へ影響するコード変更で使うチェック:

```bash
npx prettier --check "src/**/*.{ts,tsx}"
npx knip --reporter compact
npm run lint
npx tsc -p tsconfig.app.json --noEmit
npm run test:run
```

フォーマット差分がある場合は、対象ファイルへ `npx prettier --write <file>` を実行する。
