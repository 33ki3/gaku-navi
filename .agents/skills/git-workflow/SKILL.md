---
name: git-workflow
description: Gitブランチ・PR作成・マージ・テンプレート運用
---

# Git ワークフローガイド

ブランチ運用、コミットメッセージ、PR作成、マージ手順、テンプレート利用のルールを定義する。

---

## 0. コミットメッセージ規約

`.gitmessage` テンプレートを参照。

```
<type>(<scope>): <description>
```

### type 一覧

| type | 用途 | 例 |
|------|------|-----|
| `feat` | ユーザーに見える新機能 | フィルター追加、エクスポート機能 |
| `fix` | ユーザーに見えるバグ修正 | スコア計算の不具合修正 |
| `refactor` | 機能変更なしのコード改善 | 変数名リネーム、型定義追加 |
| `docs` | ドキュメントのみ | README更新、SPEC.md更新 |
| `style` | コードフォーマットのみ | prettier適用 |
| `chore` | ビルド・ツール・設定系 | .vscode/settings.json追加 |
| `ci` | CI/CD設定 | deploy.yml作成 |
| `perf` | パフォーマンス改善 | バンドルサイズ削減 |
| `test` | テスト追加・修正 | テストケース追加 |

### scope（任意）

変更対象を示す: `score`, `export`, `filter`, `i18n`, `ui` など。

### 判断基準

- ユーザーに影響する → `feat`（新機能）or `fix`（バグ修正）
- ユーザーに影響しない → `refactor` / `chore` / `docs` 等

---

## 1. ブランチ運用

### 命名規則

```
<type>/<short-description>
```

| type | 用途 | 例 |
|------|------|-----|
| `feat` | 新機能 | `feat/filter-export` |
| `fix` | バグ修正 | `fix/card-detail-bugs` |
| `refactor` | リファクタリング | `refactor/rarity-types` |
| `chore` | 設定・ツール | `chore/ci-setup` |
| `docs` | ドキュメント | `docs/spec-update` |

### ルール

- `main` ブランチに直接コミットしない。必ず feature ブランチから PR 経由でマージする。
- ブランチは squash merge 後に削除する（`--delete-branch`）。

---

## 2. PR 作成手順

### テンプレート

`.github/PULL_REQUEST_TEMPLATE.md` に従って本文を作成する。テンプレート構成:

```markdown
## 概要
<!-- 変更の目的・背景を簡潔に記載 -->

## 変更内容
<!-- 主な変更点をリストで記載 -->

## 確認事項
- [ ] 動作確認済み
```

### 作成コマンド

```bash
# 本文ファイル経由で作成（日本語を含む場合はファイル経由が安全）
gh pr create --base main --head <branch> -t '<タイトル>' -F ./tmp/pr-body.md
```

**注意**: `gh pr create` の `-b` オプション（本文直書き）は日本語のクォート問題が起きやすい。本文は `./tmp/pr-body.md` にファイル出力し `-F` で読み込む。

### コミット分割

**コミットは実装単位ごとに分割する。** 1つのコミットに複数の無関係な変更を混ぜない。

#### 分割の基準

- **機能単位**: 1つの機能追加 = 1コミット（例: 回数設定のUI追加、カード一覧インジケーター、未所持カードのデフォルト変更）
- **修正単位**: 1つのバグ修正 = 1コミット
- **リファクタリング単位**: 関連するリファクタリングをまとめて1コミット
- **テスト単位**: 対応する実装と同じコミットに含める（テストのみの追加は別コミット可）

#### 手順（対応種別ごとにコミットを分ける場合）

1. **変更を確認**: `git status --short`、`git diff`、`git diff --cached` で既存の変更を確認する。
2. **テーマごとにステージ**: 明示したファイルパスまたは `git add -p` で、関連する変更だけをステージする。
3. **既存変更を保護**: ユーザーの変更を含むワークツリーを `git checkout -- .` や削除でリセットしない。分割が難しい場合は、対象を限定したパッチやレビュー済みのstashなど、復元可能な方法を使う。
4. **コミット**: テーマに合ったコミットメッセージで `git commit` する。
5. **繰り返し**: 残りの変更に対して 2-4 を繰り返す。

### タイトル規約

PR タイトルは squash merge 時のコミットメッセージになる。コミットメッセージ規約に従う:

```
<type>(<scope>): <description>
```

---

## 3. マージ手順

```bash
# CI 通過確認
gh pr checks <PR番号>

# squash merge + ブランチ削除
gh pr merge <PR番号> --squash --delete-branch

# main ブランチを最新化（ワークツリーが clean な場合）
git status --short
git pull --ff-only origin main

# 未コミット変更がある場合は、上記の pull の前に以下へ置き換える
# git stash push -u -m "before updating main"
# git pull --ff-only origin main
# git stash pop
```

### CI チェック

`.github/workflows/ci.yml` の `check` ジョブでは、`typecheck`、`lint`、`format`、`unused`、`test` の完了を確認する。GitHub側のBranch Protectionや追加のセキュリティチェックはリポジトリ設定を確認してから判断し、このファイルでは設定済みと断定しない。

- squash merge のみ使用する。

---

## 4. Issue テンプレート

`.github/ISSUE_TEMPLATE/` に以下のテンプレートを配置:

| ファイル | 用途 |
|----------|------|
| `bug_report.yml` | バグ報告 |
| `feature_request.yml` | 機能要望 |

Issue 作成時はこれらのテンプレートを使用する。
