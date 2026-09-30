---
name: ui-components
description: gaku-navi の UI/UX、React コンポーネント、Tailwind スタイルを追加・変更する場合に使用する。
---

# UI コンポーネント

変更する画面と近い既存コンポーネントを先に確認し、現在の見た目・操作・レスポンシブ挙動を保ちながら実装する。カード一覧、詳細、フィルター、スコア設定などの仕様を扱う場合は [references/product-ui.md](references/product-ui.md) も読む。

## 実装方針

- Tailwind CSS と既存の Grid / Flexbox パターンを使う。
- 表示文字列は `src/i18n/locales/ja.json` で管理し、コンポーネントでは `useTranslation()` と `t()` を使う。
- マスタデータと共有定数は `src/data/` と `src/constant/` から取得し、複数画面へ重複定義しない。
- 型は `src/types/`、UI 専用設定は `src/data/ui/` または `src/constant/` に置く。
- 検索・フィルターの責務は既存の `src/hooks/useFilteredCards.ts` と周辺 hooks に集約する。
- 仮想スクロールを変更する場合は、既存の `@tanstack/react-virtual`、`useWindowVirtualizer`、`measureElement` の組み合わせと動的行高を維持する。

## 既存パターンの再利用

新しい UI を作る前に、同種のモーダル、バッジ、トグル、折りたたみ、入力がないか検索する。特に `src/components/ui/` の `Badge`、`ToggleButton`、`CheckboxField`、`UncapSelector`、`CloseButton`、`CollapsibleSection`、`ModalOverlay`、`SpinnerInput`、`HelpTooltip`、共有 icons を優先する。

- 同じ UI ブロックが3箇所以上に現れる場合は共通化を検討する。
- 10個以上の props を中継する場合は、責務がまとまった hook の戻り値型をオブジェクトで渡すことを検討する。
- 共通化で既存画面の見た目や再レンダリング特性が変わる場合は、依頼範囲を超えて変更しない。
- 共有クラスを追加する前に `src/constant/` と既存コンポーネントを検索する。

## 操作状態と経路

- 相互排他の操作モードは単一の状態値で表し、併用できる独立した編集状態とは分ける。
- 同じユーザー操作は共有の入口からモード別に処理し、同じ状態遷移を複数箇所から始める場合は遷移処理も共有する。
- 既存の操作範囲や状態遷移を依頼なしに変えない。UIやアクセシビリティを改善するときも、各モードの対象範囲と振る舞いを確認する。

## 見た目を守る不変条件

- トグルやフィルターボタンは active / inactive で border 幅を揃え、状態変更時のレイアウトシフトを防ぐ。
- カード種別やパラメータの色、モーダル構造、凸数操作、フィルター条件は既存仕様とテストを確認して変更する。
- UI を変更したら、対象画面の操作とモバイル・デスクトップの両方を影響に応じて確認する。
