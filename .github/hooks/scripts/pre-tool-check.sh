#!/bin/bash
# preToolUse フック: セキュリティチェック
#
# - cards.json（自動生成ファイル）の直接編集をブロック
# - 破壊的コマンド（rm -rf /、--no-verify 等）をブロック
# - .env や秘密鍵ファイルの表示・編集をブロック
set -e

INPUT=$(cat)

# python3 で JSON フィールドを抽出するヘルパー
py_get() {
  echo "$1" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('$2') or '')"
}

TOOL_NAME=$(py_get "$INPUT" "toolName")
TOOL_ARGS_RAW=$(py_get "$INPUT" "toolArgs")

# toolArgs は JSON 文字列なのでさらにパースする
py_get_args() {
  echo "$TOOL_ARGS_RAW" | python3 -c "
import sys, json
raw = sys.stdin.read().strip()
try:
    d = json.loads(raw)
except Exception:
    d = {}
print(d.get('$1') or '')
"
}

# --- cards.json の直接編集を禁止（自動生成ファイルのため） ---
if [ "$TOOL_NAME" = "edit" ] || [ "$TOOL_NAME" = "create" ]; then
  TARGET_PATH=$(py_get_args "path")
  if [ -z "$TARGET_PATH" ]; then
    TARGET_PATH=$(py_get_args "filePath")
  fi
  if echo "$TARGET_PATH" | grep -qE 'src/data/json/cards\.json$'; then
    echo '{"permissionDecision":"deny","permissionDecisionReason":"cards.json は自動生成ファイルです。直接編集しないでください。"}'
    exit 0
  fi
fi

# --- システム /tmp への書き込みをブロック ---
if [ "$TOOL_NAME" = "edit" ] || [ "$TOOL_NAME" = "create" ]; then
  TARGET_PATH=$(py_get_args "path")
  if [ -z "$TARGET_PATH" ]; then
    TARGET_PATH=$(py_get_args "filePath")
  fi
  if echo "$TARGET_PATH" | grep -qE '^/tmp/'; then
    echo '{"permissionDecision":"deny","permissionDecisionReason":"システムの /tmp は使用禁止です。プロジェクトルートの ./tmp/ を使ってください。"}'
    exit 0
  fi
fi

# --- bash コマンドの危険パターンをブロック ---
if [ "$TOOL_NAME" = "bash" ]; then
  COMMAND=$(py_get_args "command")

  # システム /tmp への書き込みコマンドをブロック
  if echo "$COMMAND" | grep -qE '(>|>>|cp|mv|tee)\s+/tmp/|cat\s+>\s*/tmp/'; then
    echo '{"permissionDecision":"deny","permissionDecisionReason":"システムの /tmp は使用禁止です。プロジェクトルートの ./tmp/ を使ってください。"}'
    exit 0
  fi

  # 破壊的コマンド（絶対パスへの rm -rf、mkfs、Windowsドライブのフォーマット）
  if echo "$COMMAND" | grep -qE 'rm\s+-rf\s+/|mkfs|format\s+[A-Z]:'; then
    echo '{"permissionDecision":"deny","permissionDecisionReason":"破壊的なシステムコマンドは実行できません。"}'
    exit 0
  fi

  # --no-verify フラグの使用を禁止
  if echo "$COMMAND" | grep -qE '\-\-no-verify'; then
    echo '{"permissionDecision":"deny","permissionDecisionReason":"--no-verify の使用は禁止されています。安全チェックをスキップしないでください。"}'
    exit 0
  fi

  # 秘密情報の出力を防止
  if echo "$COMMAND" | grep -qE 'cat\s+\.env|cat\s+.*\.pem|cat\s+.*_rsa'; then
    echo '{"permissionDecision":"deny","permissionDecisionReason":"秘密情報ファイルの内容を出力しないでください。"}'
    exit 0
  fi
fi

# デフォルト: 許可
exit 0
