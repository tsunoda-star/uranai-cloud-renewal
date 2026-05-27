# 機能仕様書（Functional Spec）— 占いクラウド リニューアル

| 項目 | 内容 |
|------|------|
| プロジェクト | 占いクラウド（www.uranai.cloud）全面リニューアル |
| Phase | Phase 2: 設計 |
| 入力 | `docs/requirements/requirements.md`, `non-functional.md`, `design-requirements.md` (v1.1.0) |
| 技術 | Next.js 15 (App Router) / TypeScript / Tailwind / shadcn/ui / Prisma / PostgreSQL / CC-Auth |
| MVP スコープ | 占い師カタログ + マッチング + 予約リクエスト + ブログ |
| バージョン | 1.0.0 |

---

## 1. アーキテクチャ概要

```
[Browser]
   │  HTTPS
   ▼
[Next.js 15 App Router]
   ├─ Server Components（既定: 一覧・詳細・SEO）
   ├─ Client Components（フォーム・フィルタUI・Tiptap）
   ├─ Server Actions / Route Handlers（予約・記事・マッチング）
   ├─ Middleware（CC-Auth トークン検証 / RBAC ガード）
   ▼
[Prisma] ──▶ [PostgreSQL]
   ▲
[CC-Auth]（認証・ロールクレーム発行。userPoolId/clientId 未設定= OPEN-2）
[Object Storage]（プロフィール写真・アイキャッチ。SEC-9 検証）
[Scheduler / cron]（予約投稿 scheduled の自動公開 REL-3）
```

実装方針: PERF-1（Server Components 既定）, PERF-2（ISR/revalidate）, PERF-5（検索はサーバーサイド + URLクエリキャッシュ）, PERF-7（Prisma N+1 回避）。

---

## 2. ルーティング（App Router）

| パス | 役割 | レンダリング | 対応 AC |
|------|------|------------|---------|
| `/` | トップ（ヒーロー/統計/カテゴリ/3ステップ/ピックアップ） | SSR + ISR | A-1 |
| `/advisors` | 占い師一覧（検索・フィルタ・並び替え・ページネーション） | SSR（searchParams） | B-1, B-3 |
| `/advisors/[slug]` | 占い師プロフィール（サービス・記事・口コミ・予約CTA） | SSR + ISR | B-4 |
| `/services` | 鑑定サービス一覧 | SSR | B-2, B-3 |
| `/services/[id]` | サービス詳細（予約CTA） | SSR + ISR | B-5 |
| `/match` | マッチング相談フォーム + 結果 | Client フォーム + Server Action | B-6 |
| `/booking/new` | 予約リクエスト作成（対象 query） | Client フォーム + Server Action | B-7 |
| `/blog` | ブログ記事一覧（公開のみ） | SSR + ISR | C-1 |
| `/blog/[slug]` | 記事詳細（SEO/JSON-LD） | SSG/ISR | C-1, C-4 |
| `/blog/category/[category]` | カテゴリ別一覧 | SSR + ISR | C-1 |
| `/blog/tag/[tag]` | タグ別一覧 | SSR + ISR | C-1 |
| `/authors/[slug]` | 著者（占い師）記事アーカイブ | SSR + ISR | C-4-3 |
| `/mypage` | 一般ユーザーマイページ（お気に入り・予約・プロフィール） | SSR（要認証 GENERAL） | B-8 |
| `/dashboard` | 占い師ダッシュボード（プロフィール・サービス・予約・記事） | SSR（要認証 FORTUNE_TELLER） | B-9 |
| `/dashboard/posts/new`・`/[id]/edit` | 記事投稿/編集（Tiptap） | Client（要認証 FT/ADMIN） | C-2 |
| `/admin` | 運営管理（占い師/ユーザー/サービス/ブログ/カテゴリ/タグ） | SSR（要認証 ADMIN） | B/C 管理, C-3 |
| `/login` | CC-Auth ログイン入口 | — | 認証 |
| `/register/advisor` | 占い師登録導線 | — | A-2-2 |
| `sitemap.xml` / `robots.txt` | SEO | 動的生成 | SEO-13/14 |

URL は人間可読スラッグ（SEO-15）。公開記事スラッグ不変、変更時 301（SEO-16）。

---

## 3. ロール・権限（RBAC, 3ロール）

認証・ロール管理は CC-Auth に委譲（SEC-1）。CC-Auth のロールクレームを受領し、Middleware + Server Action / Route Handler でサーバーサイド強制（SEC-2）。クライアント制御のみに依存しない。

| 機能 | GENERAL | FORTUNE_TELLER | ADMIN |
|------|:------:|:--------------:|:-----:|
| 占い師/サービス/ブログ閲覧・検索・マッチング | ✓ | ✓ | ✓ |
| お気に入り登録 | ✓ | ✓ | ✓ |
| 予約リクエスト送信 | ✓ | ✓ | ✓ |
| 予約リクエスト受信・応答 | — | ✓（自分宛） | ✓ |
| 自プロフィール/サービス編集 | 最小プロフィール | ✓（占い師プロフィール/サービス） | ✓（全件） |
| ブログ記事投稿/編集 | — | ✓（自記事のみ AC-C2-10） | ✓（全記事） |
| カテゴリ/タグ管理・公開承認・archive | — | — | ✓ |
| ユーザー/占い師/通報管理 | — | — | ✓ |

権限境界の所有権検証: 記事編集・サービス編集は所有者または ADMIN のみ（SEC-3）。

> CC-Auth 設定（domain / cc_auth）は `.ccagi.yml` 未設定（OPEN-1/OPEN-2）。連携有効化は設定確定後。MVP 設計はロールクレーム前提のガード層を抽象化して実装する。

---

## 4. データフロー（主要シナリオ）

### 4.1 検索 → プロフィール → 予約リクエスト
```
ユーザー → /advisors?category=tarot&method=CHAT&sort=rating
  → Server: Prisma で公開占い師を AND フィルタ + 件数集計（AC-B3-5/7）
  → FortuneTellerCard グリッド + ページネーション
  → カード → /advisors/[slug]（プロフィール + サービス + 著者記事 + 口コミ + 予約CTA）
  → 予約CTA → /booking/new?advisor=[slug]（要ログイン）
  → BookingRequestForm 送信 → Server Action: zod 検証 + 所有/対象妥当性 + レート制限
  → ConsultationRequest 作成（status=pending, トランザクション REL-2）
  → 確認トースト + /mypage（リクエスト状態 pending）
  → 占い師: /dashboard でリクエスト受信 → 承認/日程調整/辞退（状態遷移 §5）
  → 状態変化 → アプリ内通知（+メール任意 OPEN-7）
```

### 4.2 記事作成 → 予約投稿 → 公開 → SEO 検証
```
占い師 → /dashboard/posts/new（RBAC: FT/ADMIN）
  → RichTextEditor(Tiptap) で本文 + カテゴリ/タグ/アイキャッチ/SEO設定
  → 「下書き保存」→ BlogPost(status=draft)
  → 「予約投稿」→ status=scheduled + publishedAt=未来（AC-C2-7）
  → cron/scheduler が publishedAt 到達で status=published に遷移（REL-3）
  → 公開記事 → /blog/[slug]（本文サニタイズ表示 SEC-5）
  → Metadata API: title/description（著者上書き可）+ OGP + JSON-LD Article（SEO-1/5/9）
  → sitemap.xml に追加（公開のみ。draft/scheduled 除外 SEO-13）
  → 占い師プロフィール/著者ページに記事反映（C-4 統合）
```

### 4.3 マッチング相談
```
ユーザー → /match → MatchingForm（悩みカテゴリ/相談形式/自由記述）
  → Server Action: 悩み→占術カテゴリマッピング + 相談形式 + 評価でルールベース スコアリング
  → 候補 FortuneTellerCard 提示（0件→人気占い師 代替 AC-B6-5）
  → プロフィール/予約へ遷移
  （AI推薦は次フェーズ NF-6: 候補生成関数を抽象化し差し替え可能に）
```

---

## 5. 状態遷移

### 5.1 ConsultationRequest（予約リクエスト）
```
            ┌──────────► declined（占い師辞退）
            │
[pending] ──┼──────────► accepted（占い師承認）─► [MVPゴール]
            │
            ├──────────► rescheduled（日程調整提案）──► accepted / declined / cancelled
            │
            └──────────► cancelled（ユーザー取消）
```
- 遷移はトランザクション整合（REL-2）。各遷移で通知（AC-B7-6）。
- 実鑑定・決済は次フェーズ。accepted まで（AC-B7-7）。

### 5.2 BlogPost（記事）
```
[draft] ──► [scheduled]（公開日時指定）──(publishedAt 到達/cron)──► [published]
   │                                                                    │
   └──────────────────────────► [published]（即時公開）                 │
                                                                        ▼
                          [archived]（運営 archive / 占い師 取下げ）◄────┘
```
- 公開承認フロー（任意 AC-C3-3）: 設定 ON 時 draft→（運営承認）→published。OPEN-8 で要否確定。

---

## 6. ドメイン定数（MNT-2 一元管理）

- 占術カテゴリ（15）: requirements §6 の15種
- 相談形式（5）: PHONE / CHAT / EMAIL / ZOOM / IN_PERSON
- 予約状態（5）: pending / accepted / rescheduled / declined / cancelled
- 記事ステータス（4）: draft / scheduled / published / archived
- ロール（3）: GENERAL / FORTUNE_TELLER / ADMIN

---

## 7. 非機能との対応

| 領域 | 対応 |
|------|------|
| パフォーマンス | Server Components / ISR / next/image / next/font / サーバーサイド検索（PERF-1〜7） |
| SEO | Metadata API / OGP / JSON-LD / sitemap / canonical / 301（SEO-1〜17） |
| A11y | WCAG AA / ランドマーク / aria / フォーカス / 44px（A11Y-1〜10） |
| セキュリティ | CC-Auth + RBAC / 所有権検証 / サニタイズ / レート制限 / セキュリティヘッダ（SEC-1〜12） |
| 信頼性 | 冪等マイグレーション / トランザクション / cron 公開（REL-1〜5） |

---

## 8. データ移行（要件 §4）

- 占い師 101名・サービス 59件・占術15カテゴリ正規化・ユーザー（CC-Auth 突合）を冪等マイグレーションで移行（AC-D-*）。移行元フォーマット未確定（OPEN-3/4/5）。
- 過去ブログ記事移行は移行元（WXR 等）確定後判断。MVP は新規投稿基盤必須。

---

## 9. 未確定事項（要件 §7 を継承）

OPEN-1〜8（domain/cc_auth 未設定、移行元フォーマット、CC-Auth 突合、過去記事移行、評価データ、予約後連絡手段、公開承認フロー）。Phase 3 SSOT Issue で追跡。

---

## 10. アーキテクチャ決定（ADR — 実装前に確定。抽象語を排し実装を一意化）

### ADR-1: 予約投稿の公開方式 = compute-on-read（主）＋ cron sweep（従）
- 公開判定はクエリ述語で行う: 「公開」= `status=PUBLISHED OR (status=SCHEDULED AND publishedAt <= now())`。これにより scheduler 故障時も**公開漏れが構造的に起きない**。
- 加えて EventBridge（15分間隔）→ Lambda が SCHEDULED→PUBLISHED を確定遷移し、通知（`POST_PUBLISHED`）・ISR revalidate・sitemap 反映を実行（検索/OGP/sitemap の確定反映用）。
- index `@@index([status, publishedAt])` がこの述語を支える。

### ADR-2: 日本語検索 = PostgreSQL `pg_trgm`（bigram トライグラム + GIN index）
- 標準 FTS は日本語分かち書き非対応のため不採用。MVP は `pg_trgm` 拡張 + GIN index による ILIKE / 類似度検索（対象: 占い師名・自己紹介・サービス名・記事タイトル/抜粋）。
- クエリ層を `searchAdvisors()` / `searchPosts()` に抽象化し、規模拡大時に pgroonga / OpenSearch へ差し替え可能とする（PERF-5）。

### ADR-3: 認証アダプタ = CC-Auth 実装 ＋ dev アダプタ（env 二重ゲート, prod 起動不可）
- `AuthProvider` インターフェースを定義。本番 = `CcAuthProvider`（OPEN-2 設定後に有効化）。
- ローカル開発用 `DevAuthProvider` は `AUTH_PROVIDER=dev` **かつ** `NODE_ENV !== production` の**二重ガード**でのみ起動。prod ビルド経路には存在させない（起動時 assert で遮断）。
- これは「モック」ではなく**差し替え可能な開発アダプタ**。mock-detector 観点では「prod 経路に dev 実装が存在しないこと」を検証対象とする（SEC-1/2 と整合）。

### ADR-4: 画像アップロード = S3 + presigned PUT + サーバ検証
- プロフィール写真・アイキャッチは S3（CloudFront 配信）。クライアントは presigned URL で直 PUT。
- サーバ側で MIME/拡張子/サイズ上限/画像再エンコード/EXIF除去を強制（SEC-9）。キー設計: `{env}/avatars/`・`{env}/blog/`。

### ADR-5: 要配慮情報の取扱い → §12 privacy 参照。

---

## 11. 外部依存アンブロック・トラック（停止しないための並行設計）

OPEN-1/2/3 と `confidential_information/aws.md` は外部入力待ち。**待機中も以下で実装を前進**させ、入力到達時に差し替えるだけにする（GUARDRAILS rule4「待機＝怠慢」回避）。

| ブロッカー | 待機中に作るもの | 解消後の差し替え |
|---|---|---|
| OPEN-3 移行元フォーマット | 仕様準拠の**代表シードデータ**（占い師/サービス/15カテゴリ/レビュー）で全画面・検索・E2Eを構築 | `scripts/migrate-legacy.ts` で実データ投入（シードと同一スキーマ＝差し替えのみ） |
| OPEN-2 cc_auth 未設定 | `DevAuthProvider`（ADR-3）で3ロールを再現し RBAC/全フロー/E2E を実装 | `CcAuthProvider` 有効化＋env 設定 |
| OPEN-1 domain 未設定 | `NEXT_PUBLIC_SITE_URL` 経由で OGP/sitemap の絶対URLを生成（相対URL運用） | dev/prod サブドメイン確定で env 設定 |
| aws.md 未配置 | ローカル＋（可能なら）dev で全シナリオ検証完了まで進行 | 提供後に Phase 7 本番デプロイ着手（rule2: 都度 Read） |

---

## 12. プライバシー・要配慮情報の取扱い

占い相談は深い悩み（要配慮個人情報）を含む。MVP から以下を必須とする。

- **対象**: `ConsultationRequest.summary`（相談概要）、記事下書き、お気に入り、レビュー本文。
- **アクセス制限**: 相談概要は **本人・宛先占い師・ADMIN のみ**閲覧可（RBAC＋所有権、SEC-3）。**一覧/検索APIに summary を含めない**（詳細取得のみ）。
- **保持・削除**: `cancelled`/`declined` のリクエストは運営設定日数後に summary を匿名化。**退会時はユーザー紐付けデータを削除/匿名化**（`onDelete` 設計と整合）。
- **ログ**: 相談内容・メール・電話を**ログ出力しない**（PII マスキング）。
- **表示**: プライバシーポリシー・特定商取引法表記をフッターに常設（AC-A2-4）。

---

## 13. 検証・トレーサビリティ

### 13.1 デザイン忠実度の視覚検証（品質ゲート必須）
設計トークンは brighty.site のコンパイル済 CSS から実測抽出済だが、**レンダリング差分は未検証**（設計時に live browser 不可だった）。Phase 5.5 で、実装画面と brighty.site を**並列スクリーンショット比較**（配色・余白・タイポ・角丸・コンポーネント密度）し、`design-system.yml` との乖離を是正する**視覚差分チェックを必須ゲート**とする。

### 13.2 AC↔テスト・トレーサビリティ
全 AC（AC-A1-1 … AC-D-6）に対応するテストID（unit/integration/e2e/flow）を `docs/test-design/traceability.md` のマトリクスへ対応付け、**未カバー AC を 0** にすることを品質ゲート条件とする。

### 13.3 旧URL → 新URL 301 マッピング（SEO-16）
リプレースのため検索流入資産の継承が必須。旧 `/items`・`/items/categories/[id]`・`/profiles`・`/profiles/categories/[id]`・`/users/[id]`・`contents.uranai.cloud/*` を新ルート（`/services`・`/advisors`・`/advisors/[slug]`・`/blog/*`）へ 301 マップとして `docs/design/url-migration-map.md` に定義する（旧URL一覧の確定後に最終化、OPEN-3 と連動）。

---

*CCAGI SDK Phase 2 — 機能仕様書 / 占いクラウド リニューアル*
