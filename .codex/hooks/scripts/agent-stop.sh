#!/bin/bash
# Stop hook: ローカル基本チェック
#
# AGENTS.md の完了チェックにあるうち、短時間で実行できる
# リンター・フォーマット・型チェックを実行する。Knip と Vitest は CI でも実行する。
set -e

echo "=== ローカル基本チェック実行中 ==="

# --- 1. リンター ---
echo "[1/3] リンター (eslint) ..."
if ! npm run lint 2>&1; then
  echo ""
  echo "⚠ lint エラーがあります。修正してください。"
fi

# --- 2. フォーマット ---
echo "[2/3] フォーマット (prettier --check) ..."
if ! npx prettier --check "src/**/*.{ts,tsx}" 2>&1; then
  echo ""
  echo "⚠ フォーマットの差分があります。npm run format を実行してください。"
fi

# --- 3. 型チェック ---
echo "[3/3] 型チェック (tsc --noEmit) ..."
if ! npx tsc -p tsconfig.app.json --noEmit 2>&1; then
  echo ""
  echo "⚠ コンパイルエラーがあります。修正してください。"
fi

echo ""
echo "=== 作業終了前リマインド ==="
cat <<'EOF'
1. todo を使った作業では、関連する項目の未完了が残っていないか確認する。
2. 一時ファイル・デバッグ用ファイルが残っていないか確認する。
3. CI相当の確認が必要な場合は `npx knip --reporter compact` と `npm run test:run` も実行する。
4. todo を使った作業では、完了済みタスク・解決済みQ&Aを .github/todo/archive/ に移動する。
EOF
