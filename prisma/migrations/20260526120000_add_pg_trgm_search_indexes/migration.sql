-- ADR-2: 日本語検索 = PostgreSQL pg_trgm (bigram トライグラム + GIN index)
-- 標準 FTS は日本語分かち書き非対応のため不採用。searchAdvisors() / 将来の
-- searchPosts() が使う ILIKE / 類似度検索を index-assisted にするための GIN index。
-- pg_trgm 拡張は init migration で有効化済み（CREATE EXTENSION IF NOT EXISTS "pg_trgm"）。
-- 対象（spec §10 ADR-2）: 占い師名・自己紹介・サービス名・記事タイトル/抜粋。

-- 占い師名（User.displayName）
CREATE INDEX IF NOT EXISTS "User_displayName_trgm_idx"
  ON "User" USING gin ("displayName" gin_trgm_ops);

-- 自己紹介（FortuneTellerProfile.bio）
CREATE INDEX IF NOT EXISTS "FortuneTellerProfile_bio_trgm_idx"
  ON "FortuneTellerProfile" USING gin ("bio" gin_trgm_ops);

-- サービス名（Service.title）
CREATE INDEX IF NOT EXISTS "Service_title_trgm_idx"
  ON "Service" USING gin ("title" gin_trgm_ops);

-- 記事タイトル/抜粋（searchPosts() 用, 先行整備）
CREATE INDEX IF NOT EXISTS "BlogPost_title_trgm_idx"
  ON "BlogPost" USING gin ("title" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "BlogPost_excerpt_trgm_idx"
  ON "BlogPost" USING gin ("excerpt" gin_trgm_ops);
