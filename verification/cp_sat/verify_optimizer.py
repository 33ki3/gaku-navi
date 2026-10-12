"""JSONを受け取り、CP-SATで最大スコアと編成を求める"""

import json
import sys
from typing import Any

from model import verify_optimizer


def main() -> int:
    """標準入力のJSONを検証し、判定結果を標準出力へ返す。

    Returns:
        成功時は0、入力エラー時は2、それ以外の判定時は1。
    """
    try:
        payload: Any = json.load(sys.stdin)
        result = verify_optimizer(payload)
    except (json.JSONDecodeError, OSError, TypeError, ValueError) as error:
        print(json.dumps({"status": "invalid_input", "message": str(error)}, ensure_ascii=False))
        return 2

    print(json.dumps(result, ensure_ascii=False, sort_keys=True))
    if result["status"] == "optimal":
        return 0
    return 1


if __name__ == "__main__":
    sys.exit(main())
