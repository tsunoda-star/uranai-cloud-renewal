#!/usr/bin/env python3
"""
.numbers (Apple iWork) → JSON 変換ツール。
占い師・ユーザー Numbers ファイルを TypeScript の migrate-advisors.ts が読める JSON に変換。

実行: python3 scripts/numbers-to-json.py
出力: /tmp/uranai-advisors.json, /tmp/uranai-users.json
"""

import json
import sys
from numbers_parser import Document

SOURCES = [
    ("/Users/seeds-create/Downloads/占い師_20260527.numbers", "/tmp/uranai-advisors.json"),
    ("/Users/seeds-create/Downloads/ユーザー_20260527.numbers", "/tmp/uranai-users.json"),
]


def export_table(numbers_path: str, json_path: str) -> int:
    doc = Document(numbers_path)
    table = doc.sheets[0].tables[0]
    header = [str(table.cell(0, c).value or "") for c in range(table.num_cols)]
    rows = []
    for r in range(1, table.num_rows):
        row = {}
        for c, h in enumerate(header):
            v = table.cell(r, c).value
            if v is None:
                row[h] = ""
            elif hasattr(v, "isoformat"):
                # datetime / date オブジェクトは ISO 文字列に
                row[h] = v.isoformat()
            else:
                row[h] = str(v)
        rows.append(row)
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(rows, f, ensure_ascii=False, indent=2)
    return len(rows)


def main() -> None:
    for src, dst in SOURCES:
        n = export_table(src, dst)
        print(f"  {src} → {dst} ({n} rows)")


if __name__ == "__main__":
    main()
