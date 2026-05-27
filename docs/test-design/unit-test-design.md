# Unit Test Design — 占いクラウド リニューアル

| 項目 | 内容 |
|------|------|
| Phase | Phase 2: 設計（テスト設計） |
| 対象 | 純粋関数・ドメインロジック・バリデーション・ユーティリティ |
| ツール | Vitest |
| カバレッジ目標 | 80% 以上（non-functional §7） |

---

## 1. 対象範囲（Docker 不要）

| # | 対象 | 検証観点 |
|---|------|---------|
| U-1 | ドメイン定数（占術15 / 相談形式5 / 状態5 / ステータス4） | 件数・enum 整合（spec §6, schema enum と一致） |
| U-2 | 予約状態遷移バリデータ | 許可遷移のみ true（pending→accepted/declined/rescheduled/cancelled、accepted→終端 等）。不正遷移 false |
| U-3 | 記事ステータス遷移バリデータ | draft→scheduled/published、scheduled→published(cron)、*→archived。不正遷移拒否 |
| U-4 | マッチングスコアリング（ルールベース） | 悩み→占術マッピング、相談形式 AND、評価重み。0件時の代替（人気順）返却 |
| U-5 | 予約フォーム zod スキーマ | 希望日時≥1(未来) / 相談形式必須 / 概要1-2000字 / 不正入力で error |
| U-6 | 記事フォーム zod スキーマ | カテゴリ≥1 / スラッグ形式 / 予約投稿は publishedAt 未来必須 |
| U-7 | スラッグ生成・正規化 | 日本語→URL安全、重複時サフィックス、公開後不変ルール |
| U-8 | HTML サニタイズ（許可タグホワイトリスト） | script/onclick 等除去、許可タグ保持（SEC-5） |
| U-9 | SEO メタ生成 | title/description フォールバック、著者上書き優先、絶対URL生成（env ドメイン） |
| U-10 | 評価平均算出 | ratingCount=0 で null、丸め桁 |
| U-11 | 日付フォーマット | JST 表示、`<time datetime>` 値（I18N-3） |
| U-12 | フィルタ→Prisma where 変換 | category/method/price/rating/keyword の AND 条件組立（searchParams） |
| U-13 | RBAC 判定関数 | ロール×操作の許可表（spec §3）と一致、所有権判定 |

---

## 2. テストケース例

### U-2 予約状態遷移
| from | to | 期待 |
|------|----|----|
| PENDING | ACCEPTED | true |
| PENDING | DECLINED | true |
| PENDING | RESCHEDULED | true |
| PENDING | CANCELLED | true |
| ACCEPTED | PENDING | false |
| DECLINED | ACCEPTED | false |
| RESCHEDULED | ACCEPTED | true |

### U-8 サニタイズ
- 入力 `<p>占い<script>alert(1)</script></p>` → 出力 `<p>占い</p>`
- 入力 `<a href="javascript:...">` → href 除去 or リンク無効化
- 許可 `<h2><h3><strong><em><ul><ol><li><a><img><blockquote><hr>` 保持

---

## 3. 方針
- 外部依存（Prisma/CC-Auth/Storage）はモック。純粋ロジックに集中。
- ドメイン定数は schema enum と二重定義しない（生成 or 単一ソース参照）。
- Critical モックを本番に残さない（テスト専用 mock は `__tests__` 配下のみ MNT-3）。

---

*CCAGI SDK Phase 2 — Unit Test Design*
