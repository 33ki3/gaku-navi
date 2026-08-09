#!/bin/bash
# SessionStart hook: 作業開始時のリマインド
#
# AGENTS.md の作業フローに基づき、
# todo が今回の依頼に関係する場合だけ確認するようリマインドする。
set -e

cat <<'EOF'
=== gaku-navi Codex 作業開始チェック ===
AGENTS.md を読み、今回の依頼に関連する場合だけ .github/todo/todo.md を確認する。
EOF
