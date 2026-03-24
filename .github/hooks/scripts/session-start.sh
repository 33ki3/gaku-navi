#!/bin/bash
# sessionStart フック: 作業開始時のリマインド
#
# copilot-instructions.md の作業フローに基づき、
# セッション開始時に .github/todo/todo.md を確認するようリマインドする。
set -e

cat <<'EOF'
=== gaku-navi 作業開始チェック ===
1. .github/todo/todo.md を読み込んでください。
2. 「追加の指示」を「対応中タスク」に移動してください。
3. 不明な点は ask_questions ツールでユーザーに確認してください。推測で進めないこと。
4. 対応中タスクと追加の指示をすべて実装完了するまで作業を終了しないでください。
EOF
