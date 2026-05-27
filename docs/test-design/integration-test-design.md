# Integration Test Design — 占いクラウド リニューアル

| 項目 | 内容 |
|------|------|
| Phase | Phase 2: 設計（テスト設計） |
| 対象 | API / Server Action ↔ Prisma ↔ PostgreSQL、RBAC、サニタイズ |
| ツール | Vitest + テスト用 PostgreSQL（Docker） |
| 環境 | local（Docker） / dev（AWS SSM） |

---

## 1. 対象範囲（Docker 使用）

| # | 対象 | 検証観点 | 対応 AC |
|---|------|---------|--------|
| I-1 | 占い師検索クエリ | category/method/price/rating/keyword AND、件数集計、ページネーション、N+1 回避 | B-3, PERF-7 |
| I-2 | 並び替え | おすすめ/新着/評価順の order | B-1-3 |
| I-3 | 占い師プロフィール取得 | サービス・著者記事・口コミの結合取得（公開のみ） | B-4 |
| I-4 | 予約リクエスト作成 Server Action | 認証必須、対象妥当性、希望日時保存、status=PENDING、トランザクション | B-7, REL-2 |
| I-5 | 予約状態遷移 Action | 占い師=自分宛のみ応答可（RBAC）、遷移バリデーション、respondedAt 更新 | B-7-3/4/5, SEC-3 |
| I-6 | お気に入り登録/解除 | 複合PK 冪等、ログイン必須 | B-8-1 |
| I-7 | 記事作成/更新 Action | RBAC（FT/ADMIN）、占い師は自記事のみ（所有権）、サニタイズ HTML 保存 | C-2, SEC-3/5 |
| I-8 | 記事公開/予約投稿 | status 遷移、scheduled の publishedAt 未来、公開後スラッグ不変 | C-2-6/7, SEO-16 |
| I-9 | 予約投稿の自動公開ジョブ | publishedAt 到達で scheduled→published（cron 相当） | C-2-7, REL-3 |
| I-10 | カテゴリ/タグ管理（運営） | ADMIN のみ CRUD | C-3-2 |
| I-11 | マッチング Action | ルールベース候補、0件代替 | B-6 |
| I-12 | sitemap 生成 | 公開占い師/サービス/記事/カテゴリのみ、draft/scheduled 除外 | SEO-13 |
| I-13 | RBAC ガード（横断） | ロール外アクセスを 403/リダイレクト、サーバー強制 | SEC-2 |
| I-14 | レート制限 | 予約送信/マッチング/ログイン試行の制限発火 | SEC-10 |

---

## 2. データセットアップ
- テスト用 PostgreSQL を Docker で起動、`prisma migrate deploy` + 実シードデータ（占い師数件・カテゴリ15・サービス・記事）。
- 各テストはトランザクションロールバック or truncate で分離。
- モックではなく実 DB に対して検証（結合テストの本旨）。

## 3. 認証
- CC-Auth はテスト用スタブトークン発行（ロールクレーム注入）でロール別検証。`__tests__` 限定。

---

*CCAGI SDK Phase 2 — Integration Test Design*
