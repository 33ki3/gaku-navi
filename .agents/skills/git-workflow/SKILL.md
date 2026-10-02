---
name: git-workflow
description: gaku-navi でブランチ、コミット、Issue、PR、マージを行う場合に使用する。
---

# Git ワークフロー

ユーザーが依頼した Git 操作だけを行う。作業前にブランチ、upstream、未コミット差分を確認し、ユーザーの変更を混ぜたり破棄したりしない。PR 作成・更新・マージを行う場合は [references/pull-requests.md](references/pull-requests.md) も読む。

## コミット

`.gitmessage` に従い、`<type>(<scope>): <description>` 形式を使う。scope は任意。

- `feat`: ユーザー向け機能
- `fix`: ユーザー向け不具合修正
- `refactor`: 挙動を変えないコード改善
- `docs`: ドキュメントのみ
- `style`: フォーマットのみ
- `chore`: ビルド、ツール、設定
- `ci`: CI/CD
- `perf`: パフォーマンス改善
- `test`: テストのみ

変更を実装単位に分け、対応するテストは原則として実装と同じコミットへ含める。ステージ前に `git status --short` と差分を確認し、今回のファイルまたは hunk だけを追加する。

## ブランチ

`<type>/<short-description>` 形式を使う。`main` へ直接コミットせず、コミットや PR を依頼された場合は変更に合うブランチを使用する。既存の積み上げブランチでは、現在の base / head 関係を確認してから更新する。

## 安全性

- ユーザーの変更を `git checkout -- .`、`git reset --hard`、削除で消さない。
- stash を使う場合は、対象と未追跡ファイルを確認し、復元可能な手順にする。
- push、PR 作成、マージ、ブランチ削除は依頼された範囲に限る。
