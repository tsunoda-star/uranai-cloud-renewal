# 旧URL → 新URL 301 マッピング（SEO-16 / SEO-17, spec §13.3）

リプレースに伴い、旧サイトの検索流入資産を新ルートへ 301 で継承する。
本書は **正本（SSOT）** であり、`next.config.ts` の `redirects()` 実装はここから派生する。

> ⚠️ **id ↔ slug の実マッピングは OPEN-3（移行元URL一覧 / 旧DBの id→新 slug 対応）確定後に最終化する。**
> 現時点で実装に落とせるのは「パス 1:1（id 非依存）の恒久リダイレクト」のみ。
> id 依存・外部ホスト依存のものは、確定前にプレースホルダ rewrite を置くと
> 誤送客・無限ループ・404 量産のリスクがあるため **実装しない**（雛形のみ記述）。

## 1. 旧サイト構成（移行元）

| 旧ホスト | 役割 |
|---------|------|
| `www.uranai.cloud` | 本体（占い師=profiles / 商品=items / ユーザー=users） |
| `contents.uranai.cloud` | コラム/記事（別サブドメイン） |

移行元の URL 体系・id 採番・公開記事スラッグの一覧は OPEN-3 / OPEN-5 で確定予定。

## 2. マッピング表

| # | 旧URL | 新URL | 種別 | 確定状況 | 備考 |
|---|-------|-------|------|---------|------|
| 1 | `/items` | `/services` | パス 1:1 | ✅ 確定（実装済） | 鑑定メニュー一覧 |
| 2 | `/profiles` | `/advisors` | パス 1:1 | ✅ 確定（実装済） | 占い師一覧 |
| 3 | `/items/categories/[id]` | `/services?category=[slug]` | id→slug 変換 | ⏳ 保留（OPEN-3） | 旧カテゴリ id → 占術カテゴリ slug の対応表が必要 |
| 4 | `/profiles/categories/[id]` | `/advisors/categories/[slug]` | id→slug 変換 | ⏳ 保留（OPEN-3） | 同上（占術カテゴリ slug は lowercase） |
| 5 | `/users/[id]` | `/advisors/[slug]` | id→slug 変換 | ⏳ 保留（OPEN-3） | 旧ユーザー id → 占い師 slug の対応表が必要 |
| 6 | `contents.uranai.cloud/[...]` | `/blog/[slug]` | 別ホスト + id/slug 変換 | ⏳ 保留（OPEN-3/OPEN-5） | DNS/サブドメイン移管 + 旧記事 URL → 新 slug の対応表が必要。ホスト切替は CDN/インフラ層（`/blog/*` への 301）で扱う |

### 確定分（#1, #2）の方針

- **恒久（308 / permanent: true）** リダイレクト。クエリ・付加パスは保持。
- `/items` 配下の **詳細**（例 `/items/[id]`）は #3/#5 と同じく id 依存なので保留。
  確定しているのは **一覧ルートの 1:1** のみ。

### 保留分（#3〜#6）の最終化手順（OPEN-3 確定後）

1. 旧DBダンプから `旧id → 新エンティティ` の対応表を生成（占術カテゴリ / 占い師 / 記事）。
2. 対応表を build-time に取り込み、`next.config.ts` の `redirects()` を
   静的配列として **完全列挙**（動的 source パラメータの `:id` を新 slug に解決した
   恒久リダイレクトを 1 件ずつ生成）。**ワイルドカードでの曖昧な転送は使わない**。
3. `contents.uranai.cloud`（#6）は DNS をリプレース先へ向け、ホスト書き換え 301 を
   CDN / リバースプロキシ層で設定（アプリ層では `/blog/[slug]` 正規 URL を canonical 出力）。
4. 旧URLが新エンティティに対応しない（削除済み等）場合は 410 Gone または
   最も近い一覧（`/advisors` 等）への 301 を個別判断で割り当てる。

## 3. 実装場所

- パス 1:1 確定分: `next.config.ts` の `redirects()`（`permanent: true`）。
- id 依存分: 同 `redirects()` に、OPEN-3 確定後、対応表から生成した静的エントリを追記。
- 外部ホスト分: インフラ（CDN/プロキシ）層 + アプリの canonical 出力。

## 4. トレーサビリティ

- SEO-16: 公開記事URLは公開後不変（`BlogPost.slug @unique`）。変更時は本表 #6 系に 301 を追加。
- SEO-17: 旧サイト主要URLの 301 を可能な範囲で用意（本表が一覧）。
- spec §13.3 / §11 OPEN-3 / OPEN-5 と連動。
