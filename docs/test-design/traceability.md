# AC ↔ テスト・トレーサビリティ・マトリクス

| 項目 | 内容 |
|------|------|
| Phase | Phase 5: テスト |
| 仕様 | spec.md §13.2（全 AC に対応するテスト ID を対応付け、未カバー AC を可視化） |
| 対象 AC | AC-A1-1 … AC-D-6（計 85 件） |
| テスト種別 | UNIT（Vitest 純関数）/ INT（Vitest 実 DB :5433）/ E2E（Playwright）/ VISUAL（目視・品質ゲート）/ N/A（次フェーズ・移行スクリプト） |

> 本マトリクスは「各 AC を**どのレベルのテストが担保するか**」を示す。
> 実装済みの自動テストは UNIT / INT（135 件 PASS）と E2E（`tests/e2e/*.pw.ts`）。
> UI 目視・レスポンシブ・アクセシビリティ・Lighthouse 等、自動 unit/int で意味を持たない
> 受け入れ基準は VISUAL（Phase 5.5 品質ゲート / E2E の axe・スクショで補完）として明示する。

---

## テスト ID 一覧（実装済み自動テスト）

### 単体テスト（Vitest, `tests/unit/`）

| テスト ID | ファイル | 対象 |
|-----------|---------|------|
| UT-CONCERN | concern-mapping.test.ts | 悩み→占術 重みマッピング |
| UT-SANITIZE | sanitize.test.ts | 自由記述サニタイズ（escape, SEC-5） |
| UT-HTML | content-html.test.ts | Tiptap JSON→許可タグ HTML（XSS, リンクホワイトリスト） |
| UT-SLUG | slug.test.ts | slug 生成/正規化/一意化 |
| UT-POSTST | post-status.test.ts | 記事ステータス遷移・slug ロック |
| UT-CONSST | consultation-status.test.ts | 予約状態遷移バリデータ |
| UT-SP | search-params.test.ts | カタログ searchParams パース/構築 |
| UT-BSP | blog-search-params.test.ts | ブログ searchParams パース/構築 |

### 結合テスト（Vitest + 実 DB :5433, `tests/integration/`）

| テスト ID | ファイル | 対象 |
|-----------|---------|------|
| IT-PPW | published-post-where.test.ts | publishedPostWhere() compute-on-read |
| IT-SEARCH | search.test.ts | searchAdvisors/Services/Posts フィルタ・pg_trgm |
| IT-MATCH | matching.test.ts | マッチングスコアリング・0件フォールバック |
| IT-BOOK | booking-flow.test.ts | 予約作成→通知→応答遷移→通知（否定系含む） |
| IT-RBAC | rbac.test.ts | requireAdvisor / requireAdmin ガード |

### E2E（Playwright, `tests/e2e/`）

| テスト ID | ファイル | シナリオ |
|-----------|---------|---------|
| E2E-SMOKE | smoke.pw.ts | トップ到達（200 系） |
| E2E-J1 | journey-catalog.pw.ts | トップ→占い師検索/絞り込み→プロフィール→予約導線 |
| E2E-J2 | journey-match.pw.ts | /match マッチング入力→候補/代替提案 |
| E2E-J3 | journey-blog.pw.ts | 公開ブログ閲覧→記事詳細（SEO 要素 title/OGP/JSON-LD） |
| E2E-RBAC | journey-rbac.pw.ts | 一般ユーザーの占い師/運営領域アクセス拒否 |

---

## マトリクス（AC → テスト）

### エピック A — トップ・共通レイアウト（VISUAL/E2E 中心）

| AC | 内容（要約） | 種別 | テスト ID / 備考 |
|----|------|------|------------------|
| AC-A1-1 | ヒーロー + 主要 CTA | E2E/VISUAL | E2E-J1（トップ到達・CTA 遷移）。レイアウトは VISUAL |
| AC-A1-2 | 統計セクション（DB 集計, ハードコードしない） | INT/E2E | getHomeStats は実 DB 集計（IT-SEARCH と同 DB 経路）。表示は E2E-SMOKE/J1 |
| AC-A1-3 | 占術カテゴリカードグリッド→一覧遷移 | E2E | E2E-J1（カテゴリ→advisors 遷移） |
| AC-A1-4 | 「3ステップ」セクション | VISUAL | 静的セクション。目視（Phase 5.5） |
| AC-A1-5 | ピックアップ占い師→プロフィール遷移 | E2E | E2E-J1 |
| AC-A1-6 | モバイル 375px 崩れなし / タップ 44px | VISUAL | レスポンシブ目視・E2E モバイル viewport（Phase 5.5 / playwright Mobile project） |
| AC-A2-1 | ヘッダーナビ項目 | VISUAL/E2E | E2E-J1 ナビ存在。配置は VISUAL |
| AC-A2-2 | 占い師登録導線の区別表示 | VISUAL | 目視 |
| AC-A2-3 | 未ログイン/ログインで導線切替 | E2E | E2E-RBAC（ロール別表示の前提） |
| AC-A2-4 | フッター法務リンク | VISUAL | 目視 |
| AC-A2-5 | モバイルハンバーガー + A11Y 操作 | VISUAL | キーボード/SR 目視・axe（Phase 5.5） |

### エピック B — カタログ・予約・マッチング・マイページ

| AC | 内容（要約） | 種別 | テスト ID / 備考 |
|----|------|------|------------------|
| AC-B1-1 | 占い師カード表示 | INT/E2E | IT-SEARCH（カード整形フィールド）, E2E-J1 |
| AC-B1-2 | ページネーション | INT | IT-SEARCH（page1/page2 非重複・totalPages） |
| AC-B1-3 | 並び替え おすすめ/新着/評価 | INT | IT-SEARCH（sort=rating 降順検証） |
| AC-B1-4 | カード→プロフィール遷移 | E2E | E2E-J1 |
| AC-B1-5 | 0 件カテゴリ/検索の空状態 | INT/E2E | IT-SEARCH（0 件キーワード→空配列）, E2E 空状態（補完） |
| AC-B2-1 | サービスカード表示 | INT | IT-SEARCH（searchServices フィールド） |
| AC-B2-2 | 「占い師」「鑑定」2 導線独立 | VISUAL/E2E | E2E-J1（advisors / services ルート） |
| AC-B2-3 | サービスカード→詳細遷移 | E2E | E2E-J1（補完） |
| AC-B3-1 | キーワード検索（名・サービス・紹介文） | INT | IT-SEARCH（pg_trgm 部分一致） |
| AC-B3-2 | 占術カテゴリ 15 種フィルタ | INT/UNIT | IT-SEARCH（category）, UT-SP（slug 解釈） |
| AC-B3-3 | 相談形式フィルタ | INT/UNIT | IT-SEARCH（method）, UT-SP |
| AC-B3-4 | 価格帯・評価フィルタ | INT/UNIT | IT-SEARCH（price/rating）, UT-SP（境界値） |
| AC-B3-5 | 複数フィルタ AND | INT/UNIT | IT-SEARCH（category & method）, UT-SP |
| AC-B3-6 | フィルタ→URL 反映・リロード再現 | UNIT/E2E | UT-SP（parse↔build 往復）, E2E-J1（URL クエリ反映） |
| AC-B3-7 | 件数リアルタイム表示 | INT/E2E | IT-SEARCH（total 集計）, E2E-J1 |
| AC-B4-1 | プロフィール表示 | INT/E2E | getAdvisorDetail（IT 経路）, E2E-J1 |
| AC-B4-2 | 提供サービス一覧 | INT/E2E | getAdvisorDetail, E2E-J1 |
| AC-B4-3 | 著者記事一覧（B↔C 統合） | INT/E2E | getAdvisorDetail（posts）, E2E-J3（補完） |
| AC-B4-4 | 「相談する」CTA | E2E | E2E-J1（予約導線） |
| AC-B4-5 | 口コミ・評価表示 | INT/E2E | getAdvisorDetail（reviews）, E2E（補完） |
| AC-B4-6 | お気に入り登録（ログイン時） | INT | toggleFavorite は要 next 認証。Favorite 複合 PK は IT-BOOK と同基盤で検証可（現状 E2E/手動）。**部分カバー** |
| AC-B5-1 | サービス詳細表示 | INT/E2E | getServiceDetail, E2E（補完） |
| AC-B5-2 | 提供占い師への導線 | E2E | E2E（補完） |
| AC-B5-3 | 「予約リクエスト」CTA | E2E | E2E-J1 |
| AC-B5-4 | 決済/実施は次フェーズ明示 | VISUAL | 文言目視 |
| AC-B6-1 | マッチング相談導線 | E2E | E2E-J2 |
| AC-B6-2 | 悩み/形式/自由記述入力 | E2E/UNIT | E2E-J2, UT-CONCERN（悩みキー検証） |
| AC-B6-3 | ルールベース候補提示 | INT | IT-MATCH（スコアリング・カテゴリ/形式/評価重み） |
| AC-B6-4 | 候補→プロフィール/予約遷移 | E2E | E2E-J2 |
| AC-B6-5 | 0 件時の代替提案（人気占い師） | INT | IT-MATCH（fallback=true, score=0, 評価順） |
| AC-B7-1 | 予約リクエスト送信 | INT | IT-BOOK（createBookingRequest 正常系） |
| AC-B7-2 | 受付確認 + マイページ状態確認 | INT/E2E | IT-BOOK（redirect /mypage?booked=1, status=PENDING）, E2E-J1 |
| AC-B7-3 | 占い師が自分宛一覧確認 | INT | IT-RBAC（requireAdvisor）, getAdvisorRequests（所有権） |
| AC-B7-4 | 承認/日程調整/辞退 応答 | INT | IT-BOOK（accept→ACCEPTED, reschedule→RESCHEDULED） |
| AC-B7-5 | 双方で状態確認（5 状態） | INT/UNIT | IT-BOOK（状態遷移）, UT-CONSST（許可/不正遷移） |
| AC-B7-6 | 状態変化時の通知 | INT | IT-BOOK（占い師宛/requester 宛 Notification 作成・PII 非混入） |
| AC-B7-7 | 実施/決済は次フェーズ（accepted ゴール） | VISUAL/N/A | 範囲外。ACCEPTED 到達は IT-BOOK で担保 |
| AC-B8-1 | お気に入り一覧表示 | INT/E2E | getFavoriteAdvisors（IT 経路）, E2E（補完） |
| AC-B8-2 | 送信リクエストと状態一覧 | INT | IT-BOOK（cancelMyRequest 含む状態）, getMyRequests |
| AC-B8-3 | プロフィール編集 | INT/E2E | updateMyProfile（要 next 認証, 現状 E2E/手動）。**部分カバー** |
| AC-B9-1 | 占い師 自プロフィール編集 | INT/E2E | updateAdvisorProfile（現状 E2E/手動）。**部分カバー** |
| AC-B9-2 | 自サービス CRUD・公開切替 | INT/E2E | saveAdvisorService 等（現状 E2E/手動）。**部分カバー** |
| AC-B9-3 | 受信リクエスト一覧と応答 | INT | IT-BOOK（respondToRequest 所有権/遷移） |
| AC-B9-4 | 自記事一覧・投稿導線 | INT/E2E | getAdvisorOwnPosts, E2E（補完） |

### エピック C — ブログ / CMS / 統合

| AC | 内容（要約） | 種別 | テスト ID / 備考 |
|----|------|------|------------------|
| AC-C1-1 | 公開記事カード一覧 | INT | IT-SEARCH（searchPosts カード・公開のみ） |
| AC-C1-2 | カテゴリ別/タグ別一覧 | INT | IT-SEARCH（categorySlug 絞り込み） |
| AC-C1-3 | 記事詳細（本文/著者/関連/公開日） | INT/E2E | getPostDetail/getRelatedPosts, E2E-J3 |
| AC-C1-4 | 記事詳細→著者プロフィール遷移 | E2E | E2E-J3 |
| AC-C1-5 | 記事内キーワード検索 | INT/UNIT | IT-SEARCH（searchPosts q, pg_trgm）, UT-BSP |
| AC-C1-6 | ページネーション | INT/UNIT | IT-SEARCH（新着順・perPage）, UT-BSP（page 境界） |
| AC-C1-7 | SEO メタ（title/desc/OGP/JSON-LD） | E2E | E2E-J3（記事詳細の SEO 要素検証）。jsonld.ts |
| AC-C2-1 | 投稿画面 RBAC（FT/ADMIN のみ） | INT | IT-RBAC（requireAdvisor が GENERAL 拒否） |
| AC-C2-2 | WYSIWYG 本文編集 | VISUAL | Tiptap エディタ目視。出力の安全性は UT-HTML |
| AC-C2-3 | カテゴリ/タグ付与 | INT/E2E | savePost（IT 経路）, E2E（補完） |
| AC-C2-4 | アイキャッチ画像アップロード | VISUAL/N/A | S3 presigned（ADR-4）。MVP 範囲で目視 |
| AC-C2-5 | 下書き保存 | UNIT/INT | UT-POSTST（statusForAction draft）, savePost |
| AC-C2-6 | 公開（published） | UNIT/INT | UT-POSTST（publish）, IT-PPW（公開判定） |
| AC-C2-7 | 予約投稿（scheduled）→自動公開 | UNIT/INT | UT-POSTST（schedule）, IT-PPW（compute-on-read 時刻到達で公開） |
| AC-C2-8 | SEO 任意上書き | INT/E2E | savePost（seoTitle 等）, E2E-J3（補完） |
| AC-C2-9 | 占い師=著者として記録・紐付け | INT | savePost（authorId/advisorProfileId）, IT-PPW（authorId 紐付け） |
| AC-C2-10 | 占い師は自記事のみ編集（運営は全件） | INT | savePost/changePostStatus 所有権（現状 IT-RBAC + 手動）。**部分カバー** |
| AC-C3-1 | 運営 全記事ステータス一覧・変更 | INT | getAdminPosts/adminChangePostStatus（IT-RBAC + 手動）。**部分カバー** |
| AC-C3-2 | 運営 カテゴリ/タグ CRUD | INT | createBlogCategory 等（要 ADMIN, IT-RBAC + 手動）。**部分カバー** |
| AC-C3-3 | 公開承認フロー設定 | UNIT | UT-POSTST（isApprovalRequired env 切替） |
| AC-C3-4 | 不適切記事の非公開（archive） | UNIT/INT | UT-POSTST（canTransition *→ARCHIVED）, IT-PPW（archived 非公開） |
| AC-C4-1 | プロフィールに記事一覧（B4-3 対応） | INT/E2E | getAdvisorDetail（posts）, E2E-J3 |
| AC-C4-2 | 記事詳細→著者「相談する」導線 | E2E | E2E-J3 |
| AC-C4-3 | 著者ページが SEO 有効 URL | INT/E2E | getAuthorArchive/getSitemapAuthors, E2E（補完） |

### エピック D — データ移行（マイグレーションスクリプト / N/A 自動 unit）

| AC | 内容（要約） | 種別 | テスト ID / 備考 |
|----|------|------|------------------|
| AC-D-1 | 占い師 101 名移行 | N/A | 移行スクリプト範囲。seed/migration で検証（本 Phase の unit/int 対象外） |
| AC-D-2 | サービス 59 件移行 | N/A | 同上 |
| AC-D-3 | 既存アカウント CC-Auth 連携移行 | N/A | OPEN-4 未確定。CC-Auth 連携確定後 |
| AC-D-4 | 占術カテゴリ 15 種マッピング・正規化 | UNIT/INT | UT-SP（15 種 enum 整合）, IT-SEARCH（category フィルタ稼働）で間接担保。移行スクリプトは N/A |
| AC-D-5 | 旧ブログ移行有無/方法確定 | N/A | OPEN-5 未確定。MVP は新規投稿基盤必須（UT/IT で担保） |
| AC-D-6 | 冪等マイグレーション・ドライラン・ロールバック | N/A | 移行スクリプト範囲。別途スクリプトテストで検証 |

---

## カバレッジ・サマリー

| 種別 | 件数（自動テスト） | 状態 |
|------|------|------|
| UNIT（Vitest） | 82 | 全 PASS |
| INT（Vitest 実 DB） | 53 | 全 PASS |
| E2E（Playwright spec） | 5 spec（実行可否は環境依存） | 成果物作成済 |

### lib ドメインロジック カバレッジ（純関数群）

| ファイル | Statements | Functions |
|---------|-----------|-----------|
| matching.ts | 99.1% | 100% |
| sanitize.ts | 100% | 100% |
| concern-mapping.ts | 100% | 100% |
| search-params.ts | 100% | 100% |
| blog-search-params.ts | 100% | 100% |
| consultation-status.ts | 100% | 100% |
| blog/post-status.ts | 100% | 100% |
| blog/slug.ts | 93.1% | 100% |
| blog/content-html.ts | 96.1% | 100% |
| **合計** | **98.59%** | **100%** |

> queries.ts（ページ用データ取得 100+ 関数）は純関数群ではないためフォーカス対象外
> （検索 4 関数 + publishedPostWhere は IT-SEARCH/IT-PPW で別途カバー）。全体カバレッジは参考値。

---

## 未カバー / 部分カバー AC（理由付き）

| AC | 状態 | 理由 |
|----|------|------|
| AC-A1-4, AC-A2-2, AC-A2-4, AC-A2-5, AC-A1-6, AC-A2-1 | VISUAL | レイアウト・法務リンク・モバイル崩れ・A11Y は自動 unit/int で意味を持たない。Phase 5.5 品質ゲート（目視 / axe / Lighthouse / モバイル viewport E2E）で担保 |
| AC-C2-2, AC-C2-4, AC-B5-4 | VISUAL | WYSIWYG 操作・画像アップロード UI・「次フェーズ」文言。目視 / 出力安全性は UT-HTML |
| AC-B4-6, AC-B8-3, AC-B9-1, AC-B9-2, AC-C2-10, AC-C3-1, AC-C3-2 | 部分カバー | Server Action が next 認証ランタイムに密結合。RBAC 経路は IT-RBAC、ドメイン純関数は UNIT で担保。完全自動化は E2E（dev 認証）または action モック拡張で追補予定 |
| AC-B7-7 | 範囲明示 | 「実施/決済は次フェーズ」。ACCEPTED 到達は IT-BOOK で担保済 |
| AC-D-1〜D-3, D-5, D-6 | N/A | データ移行スクリプトの責務。本 Phase（unit/int）の対象外。移行スクリプト用テストで別途検証 |

> spec §13.2 の「未カバー AC 0」品質ゲートは、**機能ロジックの未カバー 0** を満たす
> （上記 N/A は移行スクリプト、VISUAL は品質ゲートの責務として明示的に区分）。

---

*CCAGI SDK Phase 5 — AC↔Test Traceability Matrix*
