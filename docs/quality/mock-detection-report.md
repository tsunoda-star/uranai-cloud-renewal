# Phase 5.5 品質ゲート — モック検出レポート

| 項目 | 内容 |
|------|------|
| プロジェクト | 占いクラウド リニューアル（uranai-cloud-renewal） |
| ゲート | Phase 5.5 — モック検出（mock-detector 相当） |
| ポリシー | **strict** 相当（Critical + High + Medium で fail 判定） |
| 走査対象 | `src/**`（118 ファイル / *.ts, *.tsx） |
| 実行日 | 2026-05-27 |
| 実行 Agent | CoordinatorAgent（統 / Subaru） |
| 判定 | **PASS** |

---

## 1. サマリー

| Severity | 件数 | 真の問題 | 誤検出 / 許容 |
|----------|------|---------|--------------|
| Critical | 0 | 0 | 0 |
| High | 0 | 0 | 0 |
| Medium | 0 | 0 | 0 |
| Low | 1 | 0 | 1（環境変数で上書き可能・OPEN-1 申し送り） |

**Critical / High = 0**。strict ポリシーで **PASS**。

---

## 2. 検出パターン別結果（src/ 全走査）

| # | 検出カテゴリ | パターン | 結果 |
|---|-------------|---------|------|
| G1.a | モックデータ変数 | `mock[A-Z]` / `dummy[A-Z]` / `fake[A-Z]` / `sample[A-Z]*Data` | **0件** |
| G1.b | プレースホルダテキスト | `lorem ipsum` | **0件** |
| G1.c | localhost / IP ハードコード | `localhost:\d+` / `127.0.0.1` | 1件（site.ts、後述・許容） |
| G1.d | 未消化マーカー | `TODO` / `FIXME` / `HACK` / `XXX` | **0件** |
| G1.e | 未実装スタブ | `Not implemented` / `throw new Error('stub')` | **0件** |
| G1.f | デバッグ出力 | `console.log/debug/warn/error` | **0件** |
| G1.g | ハードコード認証情報 | `(password\|secret\|api_key\|client_secret) = '...'` | **0件** |
| G1.h | テスト用プレースホルダ | `test@` / `admin123` / `'xxx` | **0件** |
| G1.i | Cognito ID ハードコード | `userPoolId/clientId = 'ap-northeast-1_...'` | **0件** |
| G1.j | CC-Auth URL ハードコード | `cc-auth(-dev).aidreams-factory.com` | **0件** |
| G1.k | example.com 参照 | `@example.com` / `example.com` | 2件（いずれも許容・後述） |

> 認証情報・Cognito ID・CC-Auth URL のハードコードは全カテゴリでゼロ。`SEC-7`（機密はハードコードしない）/ `MNT-4`（環境差分は環境変数で吸収）を満たす。

---

## 3. 誤検出（False Positive）と真の問題の区別

### 3.1 誤検出 / 許容（修正不要）

| 箇所 | 検出 | 区分 | 理由 |
|------|------|------|------|
| `src/components/advisor/advisor-profile-form.tsx:152` | `placeholder="https://example.com/photo.jpg"` | **正規 input placeholder 属性** | フォーム入力ヒント。値ではなく HTML `placeholder`。ブリーフの除外条件に明記 |
| `src/lib/blog/content-html.ts:52` | `// スキームなし（example.com/...）はそのまま相対扱い` | **コメント** | 相対 URL 処理の説明コメント。実行コードでない |

### 3.2 開発アダプタ（mock 扱いしない / ADR-3）

| 箇所 | 内容 | 判定 |
|------|------|------|
| `src/lib/auth/dev-auth-provider.ts` | `DevAuthProvider`（固定 dev プリンシパル 3 ロール） | **PASS（mock ではない）** |
| `src/lib/auth/dev-gate.ts` | `isDevAuthEnabled()` 二重ガード | **PASS** |
| `src/lib/actions/dev-auth.ts` | `setDevRole` / `clearDevRole`（非 dev 経路で hard-throw） | **PASS** |
| `src/app/dev/login/page.tsx` | 非 dev 経路で `notFound()` | **PASS** |

**根拠（prod 経路に dev 実装が存在しないことの確認）**:
- `src/lib/auth/index.ts` の `selectProvider()` は `AUTH_PROVIDER==="dev" && NODE_ENV!=="production"` のときのみ `DevAuthProvider` を返す。`wantsDev && isProd` は **明示 throw**。それ以外は **`CcAuthProvider`（prod 既定）**。
- `DevAuthProvider` コンストラクタは `NODE_ENV==="production"` で **hard-throw**（defense-in-depth）。
- `dev/login`・`dev/logout`・`setDevRole`/`clearDevRole` はすべて `isDevAuthEnabled()` ガード下で、非 dev 経路では存在しないかのように振る舞う（`notFound()` / throw）。
- → prod ランタイムでは dev 分岐は **構造的に到達不能**。ADR-3 の「prod 経路に存在しない開発アダプタ」に合致。**mock 扱いしない。**

### 3.3 残課題（Low / 申し送り・本ゲートでは fail させない）

| 箇所 | 内容 | Severity | 措置 |
|------|------|----------|------|
| `src/lib/site.ts:10` | `process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"` | **Low** | 環境変数優先のフォールバック。prod では `NEXT_PUBLIC_SITE_URL` を本番ドメインに設定して上書き（`MNT-4`）。ドメインは `.ccagi.yml` 未確定（**OPEN-1**）のため意図的な暫定。ファイル冒頭コメントに明記済 |

判定理由: ハードコードされた「運用 URL」ではなく、**env 変数で上書き可能な未確定ドメインのフォールバック既定値**であり、ファイルに OPEN-1 の文脈が明記されている。strict でも Critical/High に該当せず、本番ドメイン確定時（Phase 7）に env を設定すれば解消する。**ゲートは PASS とし、Phase 7 への申し送りに記載。**

---

## 4. 関連品質基準との対応

| 基準（non-functional.md §7） | 結果 |
|------------------------------|------|
| MNT-3: モック・ダミー・TODO 残置を本番コードに含めない | **PASS**（0件） |
| MNT-4: 環境差分は環境変数で吸収、URL/認証をハードコードしない | **PASS**（site.ts も env 優先。Cognito/CC-Auth ハードコード 0） |
| SEC-7: 機密情報をリポジトリにハードコードしない | **PASS**（認証情報 0件） |
| 品質基準「Critical モック（本番）0件」 | **達成** |

---

## 5. ゲート判定

**PASS（strict）** — Critical 0 / High 0 / Medium 0。Low 1 件は env 上書き可能な OPEN-1 フォールバックで申し送り。

*CCAGI SDK Phase 5.5 — モック検出レポート / 占いクラウド リニューアル*
