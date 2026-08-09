#!/bin/bash
# PreToolUse hook: セキュリティチェック
#
# - cards.json（自動生成ファイル）の直接編集をブロック
# - 破壊的コマンド（rm -rf /、--no-verify 等）をブロック
# - .env や秘密鍵ファイルの表示・編集をブロック
set -euo pipefail

INPUT=$(cat)

# Codex の hook 入力から tool_name を取り出す。
get_tool_name() {
  printf '%s' "$INPUT" | python3 -c '
import json
import sys

try:
    payload = json.load(sys.stdin)
except (json.JSONDecodeError, TypeError):
    payload = {}

print(payload.get("tool_name") or "")
'
}

# Codex の tool_input から指定フィールドを取り出す。
get_tool_input() {
  local field="$1"

  printf '%s' "$INPUT" | python3 -c '
import json
import sys

try:
    payload = json.load(sys.stdin)
except (json.JSONDecodeError, TypeError):
    payload = {}

tool_input = payload.get("tool_input") or {}
value = tool_input.get(sys.argv[1], "") if isinstance(tool_input, dict) else ""
if isinstance(value, (dict, list)):
    print(json.dumps(value, ensure_ascii=False))
elif value is not None:
    print(value)
' "$field"
}

# Codex の hook から拒否レスポンスを返す。
deny() {
  local reason="$1"

  python3 -c '
import json
import sys

print(json.dumps({
    "hookSpecificOutput": {
        "hookEventName": "PreToolUse",
        "permissionDecision": "deny",
        "permissionDecisionReason": sys.argv[1],
    }
}, ensure_ascii=False))
' "$reason"
  exit 0
}

TOOL_NAME=$(get_tool_name)
COMMAND=$(get_tool_input command)

# apply_patch の入力が command 以外の名前で届く環境にも対応する。
if [ -z "$COMMAND" ]; then
  COMMAND=$(get_tool_input patch)
fi

# --- cards.json の直接編集を禁止（自動生成ファイルのため） ---
if [ "$TOOL_NAME" = "apply_patch" ] && printf '%s' "$COMMAND" | grep -qE 'src/data/json/cards\.json'; then
  deny "cards.json は自動生成ファイルです。直接編集しないでください。"
fi

# --- apply_patch によるシステム /tmp への書き込みをブロック ---
if [ "$TOOL_NAME" = "apply_patch" ] && printf '%s' "$COMMAND" | grep -qE '(^|[[:space:]])/tmp/'; then
  deny "システムの /tmp は使用禁止です。プロジェクトルートの ./tmp/ を使ってください。"
fi

# --- Bash コマンドの危険パターンをブロック ---
if [ "$TOOL_NAME" = "Bash" ]; then
  # システム /tmp への書き込みコマンドをブロック
  if printf '%s' "$COMMAND" | grep -qE '(>|>>|cp|mv|tee)[[:space:]]+/tmp/|cat[[:space:]]+>[[:space:]]*/tmp/'; then
    deny "システムの /tmp は使用禁止です。プロジェクトルートの ./tmp/ を使ってください。"
  fi

  # 破壊的コマンド（絶対パスへの rm -rf、mkfs、Windowsドライブのフォーマット）
  if printf '%s' "$COMMAND" | grep -qE 'rm[[:space:]]+-rf[[:space:]]+/|mkfs|format[[:space:]]+[A-Z]:'; then
    deny "破壊的なシステムコマンドは実行できません。"
  fi

  # --no-verify フラグの使用を禁止
  if printf '%s' "$COMMAND" | grep -qE '\-\-no-verify'; then
    deny "--no-verify の使用は禁止されています。安全チェックをスキップしないでください。"
  fi

  # 秘密情報の出力を防止
  if printf '%s' "$COMMAND" | grep -qE 'cat[[:space:]]+\.env|cat[[:space:]].*\.pem|cat[[:space:]].*_rsa'; then
    deny "秘密情報ファイルの内容を出力しないでください。"
  fi
fi

# デフォルト: 許可
exit 0
