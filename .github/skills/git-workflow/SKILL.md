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
- [ ] `npx tsc -p tsconfig.app.json --noEmit` エラーなし
- [ ] `npm run lint` エラーなし
- [ ] `npx knip --reporter compact` 不要コードなし
- [ ] `npm test -- --run` 全テスト通過
- [ ] 動作確認済み
```

### 作成コマンド

```bash
# 本文ファイル経由で作成（日本語を含む場合はファイル経由が安全）
gh pr create --base main --head <branch> -t '<タイトル>' -F ./tmp/pr-body.md
```

**注意**: `gh pr create` の `-b` オプション（本文直書き）は日本語のクォート問題が起きやすい。本文は `./tmp/pr-body.md` にファイル出力し `-F` で読み込む。

### コミット分割

対応種別ごとにコミットを分ける場合:

1. **全変更をバックアップ**: `git diff > ./tmp/full.patch`（新規ファイルは別途 `cp`）
2. **ワークツリーをリセット**: `git checkout -- .` + 新規ファイル削除
3. **全変更を復元**: `git apply ./tmp/full.patch` + 新規ファイル `cp` バック
4. **テーマごとに `git add -p`**: hunk 単位で `y/n` を選択してステージ
5. **コミット**: テーマに合ったコミットメッセージで `git commit`
6. **繰り返し**: 残りの変更に対して 4-5 を繰り返す

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

# main ブランチを最新化（未コミット変更がある場合）
git stash && git pull origin main && git stash pop
```

### Branch Protection

- `main` ブランチには Branch Protection が設定されている。
- `required_status_checks.contexts: ["check"]` — CI の `check` ジョブが通過必須。
- squash merge のみ使用する。

---

## 4. Issue テンプレート

`.github/ISSUE_TEMPLATE/` に以下のテンプレートを配置:

| ファイル | 用途 |
|----------|------|
| `bug_report.yml` | バグ報告 |
| `feature_request.yml` | 機能要望 |

Issue 作成時はこれらのテンプレートを使用する。
