import { defineConfig } from "vitest/config";
import * as path from "node:path";

/**
 * Vitest 設定（Phase 5 テスト）.
 *
 * 方針:
 * - `@/` を src へエイリアス（tsconfig paths と一致）。
 * - 単体テスト（tests/unit）: node 環境・並列・DB 不要の純関数。
 * - 結合テスト（tests/integration）: 実 DB(:5433) を使用するため、テストファイル間の
 *   並列実行を無効化（fileParallelism=false）してデータ競合を避ける。各テストは
 *   作成→検証→後始末で baseline を維持する。
 * - Playwright の spec（*.pw.ts / tests/e2e）は Vitest の対象から除外（別ランナー）。
 * - lib ドメインロジックのカバレッジを計測（coverage:v8）。
 *
 * テストは tsconfig.json の `exclude: ["tests", ...]` 配下に置くため、
 * `npm run typecheck`(tsc --noEmit, src のみ) には一切影響しない。
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    environment: "node",
    globals: false,
    // 結合テストは実 DB(:5433) を使うため DATABASE_URL を .env から注入する。
    // 単体テストには無害（env を読むだけで DB へは接続しない）。
    setupFiles: ["tests/integration/setup.ts"],
    include: ["tests/unit/**/*.test.ts", "tests/integration/**/*.test.ts"],
    exclude: [
      "node_modules/**",
      "tests/e2e/**",
      "**/*.pw.ts",
      ".next/**",
    ],
    // 結合テストの DB 競合回避: ファイル間並列を無効化（単体も含め直列化）。
    // 単体は十分高速なため全体直列でも実行時間は短い。
    fileParallelism: false,
    // 結合テストの DB 往復に余裕を持たせる。
    testTimeout: 30_000,
    hookTimeout: 30_000,
    coverage: {
      provider: "v8",
      reportsDirectory: ".test-logs/coverage",
      reporter: ["text", "text-summary", "json-summary"],
      // lib ドメインロジック（純関数群）に焦点（80%+ 目標）。
      // queries.ts はページ用データ取得の集合体（100+ 関数）で純関数ではないため
      // フォーカス対象から除外（検索 4 関数は結合テストで別途カバー。参考値）。
      include: [
        "src/lib/matching.ts",
        "src/lib/sanitize.ts",
        "src/lib/concern-mapping.ts",
        "src/lib/search-params.ts",
        "src/lib/blog-search-params.ts",
        "src/lib/consultation-status.ts",
        "src/lib/blog/slug.ts",
        "src/lib/blog/post-status.ts",
        "src/lib/blog/content-html.ts",
      ],
      all: false,
    },
  },
});
