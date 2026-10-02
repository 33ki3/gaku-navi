# PR とマージ

## PR 作成

`.github/PULL_REQUEST_TEMPLATE.md` を使い、目的、変更内容、検証結果を現在の差分に合わせて記載する。PR タイトルは squash merge 後のコミットになるため、`<type>(<scope>): <description>` 形式にする。

日本語本文はリポジトリの `./tmp/pr-body.md` へ作成し、次の形で渡す。

```bash
gh pr create --base <base> --head <branch> -t '<title>' -F ./tmp/pr-body.md
```

積み上げ PR の場合は `main` を決め打ちせず、依頼と既存 PR の base / head を確認する。

## CI

`gh pr checks <PR番号>` に加え、必要なら Actions run、job、check-run を確認する。run が存在しても job が起動していなければ成功扱いにしない。

`.github/workflows/ci.yml` の `check` ジョブでは typecheck、lint、format、unused、test を確認する。Branch Protection や追加チェックは GitHub の現在の設定を確認し、設定済みと推測しない。

## マージ

このリポジトリでは squash merge を使う。ユーザーがマージまで依頼した場合は、必要なチェックが実際に完了してから実行し、GitHub 上の `state` と `merged_at` を確認する。

```bash
gh pr merge <PR番号> --squash --delete-branch
```

ローカル `main` の更新も依頼に含まれる場合は、未コミット差分を確認してから `git pull --ff-only origin main` を使う。変更がある場合に自動で stash せず、対象と復元手順を確認する。

## Issue

Issue 作成時は `.github/ISSUE_TEMPLATE/` の該当テンプレートを使う。

- `bug_report.yml`: バグ報告
- `feature_request.yml`: 機能要望
