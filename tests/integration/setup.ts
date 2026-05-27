/**
 * 結合テスト共通セットアップ（実 DB :5433）.
 *
 * - `.env` の DATABASE_URL を読み込み（Next ランタイム外の vitest プロセスへ注入）。
 * - 結合テストは実 DB に対して作成→検証→後始末（baseline 維持, leftover 0）。
 *
 * NODE_ENV は test のまま（auth の dev ゲートや db ログ設定に影響しない）。
 */
import * as fs from "node:fs";
import * as path from "node:path";

function loadDotEnv(file: string): void {
  const p = path.resolve(process.cwd(), file);
  if (!fs.existsSync(p)) return;
  const content = fs.readFileSync(p, "utf8");
  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    // strip surrounding quotes
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

// `.env.local` を優先し、無ければ `.env`。
loadDotEnv(".env.local");
loadDotEnv(".env");

// 明示フォールバック（既存稼働ポート :5433）。
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL =
    "postgresql://uranai:uranai@localhost:5433/uranai?schema=public";
}
