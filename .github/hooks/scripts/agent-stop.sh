#!/bin/bash
# agentStop フック: 作業完了チェックリスト
#
# copilot-instructions.md の「作業完了チェックリスト」に基づき、
# リンター・型チェックを実行し、todo.md の確認をリマインドする。
set -e

echo "=== 作業完了チェック実行中 ==="

# --- 1. リンター ---
echo "[1/2] リンター (eslint) ..."
if ! npm run lint 2>&1; then
  echo ""
  echo "⚠ lint エラーがあります。修正してください。"
fi

# --- 2. 型チェック ---
echo "[2/2] 型チェック (tsc --noEmit) ..."
if ! npx tsc -p tsconfig.app.json --noEmit 2>&1; then
  echo ""
  echo "⚠ コンパイルエラーがあります。修正してください。"
fi

echo ""
echo "=== 作業終了前リマインド ==="
cat <<'EOF'
1. .github/todo/todo.md の「追加の指示」に新しい指示が追加されていないか確認してください。
2. 一時ファイル・デバッグ用ファイルが残っていないか確認してください。
3. ask_questions ツールで完了確認をユーザーに取ってください。
4. 完了済みタスク・解決済みQ&Aを .github/todo/archive/ に移動してください。
EOF
