# Vercel デプロイ手順（占いクラウド リニューアル）

Next.js 15 (App Router) + Prisma 6 + PostgreSQL を Vercel(serverless) にデプロイする手順。
ステージング/デモは **DevAuthProvider のオプトイン開放**（ADR-3 拡張）で動かし、
真の本番化時に CC-Auth へ切り替える。

---

## 0. アーキテクチャ前提

| 項目 | 内容 |
|---|---|
| ランタイム | Vercel は `NODE_ENV=production` 固定（ローカル開発の `development`/`test` と異なる） |
| DB | Vercel Postgres / Neon（serverless Postgres）。**接続プール必須**（serverless の同時接続爆発回避） |
| Prisma Client | `postinstall: prisma generate` + `build: prisma generate && next build` でビルド時に生成（`package.json`） |
| 認証 | ステージング = DevAuthProvider（`ALLOW_DEV_AUTH=true`）／本番 = CcAuthProvider（`CC_AUTH_*`） |

### Prisma の 2 系統 URL（serverless の肝）

`prisma/schema.prisma` の datasource:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL") // pooled: アプリ実行時（PgBouncer 経由, pgbouncer=true）
  directUrl = env("DIRECT_URL")   // direct: migration / introspection（直結）
  extensions = [pg_trgm]
}
```

- `DATABASE_URL`（pooled）: runtime クエリ用。Neon なら `-pooler` ホスト、`?pgbouncer=true&connection_limit=1` 付き。
- `DIRECT_URL`（direct）: `prisma migrate deploy` 等の DDL 用。プールを経由しない直結。
- ローカル(:5433)はプール不要のため `DATABASE_URL` と `DIRECT_URL` を**同値**にしてよい（`.env` 参照）。

---

## 1. 必要な Vercel 環境変数

Vercel Dashboard → Project → Settings → Environment Variables（または `vercel env add`）。

### ステージング/デモ（DevAuthProvider 開放）

| 変数 | 値（例） | 必須 | 説明 |
|---|---|---|---|
| `DATABASE_URL` | `postgres://...-pooler.../db?sslmode=require&pgbouncer=true&connection_limit=1` | ✅ | pooled 接続（runtime） |
| `DIRECT_URL` | `postgres://....../db?sslmode=require` | ✅ | direct 接続（migration） |
| `NEXT_PUBLIC_SITE_URL` | `https://uranai-cloud-renewal.vercel.app` | ✅ | OGP/sitemap/canonical の絶対 URL |
| `AUTH_PROVIDER` | `dev` | ✅ | dev アダプタを要求 |
| `ALLOW_DEV_AUTH` | `true` | ✅ | **prod 上で dev を明示開放するオプトイン**。これが無いと prod では dev 拒否 |
| `DEV_AUTH_DEFAULT_ROLE` | `GENERAL` | ⚪ | role cookie/header 不在時の既定ロール（`GENERAL`/`FORTUNE_TELLER`/`ADMIN`） |

> ステージングでは全ページ上部に **「⚠ STAGING / デモ環境（開発用認証が有効）」バナー**が表示される
> （`AUTH_PROVIDER=dev && NODE_ENV=production && ALLOW_DEV_AUTH=true` の時のみ）。
> `/dev/login` でロールを切り替えてデモ可能。

### 真の本番（CC-Auth, OPEN-2 解決後）

ステージング設定から **`ALLOW_DEV_AUTH` を削除** し、以下へ切り替える:

| 変数 | 値 | 必須 | 説明 |
|---|---|---|---|
| `AUTH_PROVIDER` | （未設定 or `cc-auth`） | ✅ | dev を要求しない → CcAuthProvider |
| `CC_AUTH_USER_POOL_ID` | `ap-northeast-1_xxxxxxxxx` | ✅ | Cognito user pool |
| `CC_AUTH_CLIENT_ID` | （app client id） | ✅ | Cognito app client |
| `CC_AUTH_REGION` | `ap-northeast-1` | ✅ | リージョン |
| `CC_AUTH_ISSUER` | （省略可。pool+region から導出） | ⚪ | JWKS/issuer の明示指定時のみ |

> 重要（リグレッション防止）: 本番で `AUTH_PROVIDER=dev` のまま `ALLOW_DEV_AUTH` を付けると
> `selectProvider()` が **明示的に throw** する（unaudited な dev 開放を拒否）。
> 本番は必ず `ALLOW_DEV_AUTH` を消し、`CC_AUTH_*` を設定すること。

---

## 2. デプロイ手順

### 2.1 Vercel Postgres / Neon の作成

```bash
# Vercel CLI
npm i -g vercel
vercel login
vercel link   # 既存 .vercel があればスキップ可

# Vercel Postgres を作成（Dashboard → Storage → Create → Postgres）
# 作成すると DATABASE_URL / DATABASE_URL_UNPOOLED 等が自動で env に追加される。
```

Vercel Postgres 自動注入名を本プロジェクトの命名へマッピング:

| Vercel 自動注入 | 本プロジェクトで使う名前 |
|---|---|
| `POSTGRES_PRISMA_URL`（pooled） | `DATABASE_URL` |
| `POSTGRES_URL_NON_POOLING`（direct） | `DIRECT_URL` |

> Dashboard で `DATABASE_URL` / `DIRECT_URL` という名前で別途追加するか、
> 上記自動注入値をコピーして設定する。

### 2.2 ローカルへ env を取得

```bash
vercel env pull .env.local   # Vercel の env をローカルへ（.gitignore 済み）
```

### 2.3 マイグレーション適用（direct 接続）

```bash
# DIRECT_URL を使って本番 DB へ migration を適用
# （prisma migrate deploy は directUrl を使用する）
DIRECT_URL="<direct url>" DATABASE_URL="<pooled url>" \
  npx prisma migrate deploy
```

### 2.4 シード投入

```bash
DIRECT_URL="<direct url>" DATABASE_URL="<pooled url>" \
  npm run db:seed
```

### 2.5 デプロイ

```bash
# プレビュー
vercel

# 本番（staging エイリアス含む）
vercel --prod
```

ビルド時に `postinstall`（`prisma generate`）と `build`（`prisma generate && next build`）が走り、
Prisma Client が serverless バンドルに含まれる。`vercel.json` は Next.js 自動検出で不要（作成しない）。

### 2.6 検証

```bash
# 1) トップが 200、STAGING バナーが表示される（ALLOW_DEV_AUTH=true 時）
curl -sI https://<deployment>.vercel.app/ | head -1

# 2) /dev/login が 200（ステージングのみ。本番化後は notFound=404 になる）
curl -sI https://<deployment>.vercel.app/dev/login | head -1

# 3) ロール切替 → 各ロールのダッシュボード（/mypage, /advisor, /admin）到達確認
```

ブラウザ確認チェックリスト:
- [ ] 全ページ上部に「⚠ STAGING / デモ環境」バナー
- [ ] `/dev/login` でロール切替が機能
- [ ] 占い師カタログ・検索（pg_trgm）・予約フロー・ブログが動作
- [ ] 真の本番化時: `ALLOW_DEV_AUTH` 削除後にバナー消失 + `/dev/login` が 404

---

## 3. ステージング → 本番 切替チェックリスト

1. [ ] CC-Auth(OPEN-2) の `CC_AUTH_USER_POOL_ID` / `CC_AUTH_CLIENT_ID` / `CC_AUTH_REGION` を Vercel env に設定
2. [ ] `ALLOW_DEV_AUTH` を **削除**
3. [ ] `AUTH_PROVIDER` を未設定 or `cc-auth` に
4. [ ] `NEXT_PUBLIC_SITE_URL` を本番ドメインへ（OPEN-1 解決後）
5. [ ] 再デプロイ後、バナー非表示 / `/dev/login` 404 / CC-Auth ログイン動作を確認

---

## 4. トラブルシュート

| 症状 | 原因 | 対処 |
|---|---|---|
| `prisma generate` 未実行で型エラー | postinstall が走っていない | `package.json` の `postinstall`/`build` を確認 |
| `Too many connections` | pooled URL を使っていない | runtime は `DATABASE_URL`=pooled（`pgbouncer=true`）に |
| migration が prepared statement エラー | pooled で migrate している | `prisma migrate deploy` は `DIRECT_URL` を使う（schema の `directUrl`） |
| 本番で `/dev/login` が見える | `ALLOW_DEV_AUTH` が残っている | 本番では削除する |
| 起動時 `AUTH_PROVIDER=dev ... requires ALLOW_DEV_AUTH=true` throw | prod で dev 要求かつ flag 無し | staging は flag を付ける／本番は `AUTH_PROVIDER` を変更 |

---

*占いクラウド リニューアル — Vercel デプロイ手順（ADR-3 staging opt-in 対応）*
