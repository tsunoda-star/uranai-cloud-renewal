# Component Spec — BlogDetail

| 項目 | 値 |
|------|-----|
| 名称 | BlogDetail（ブログ記事詳細） |
| ベース | Article レイアウト + 構造化データ |
| 配置 | `/blog/{slug}` |
| 対応 AC | AC-C1-3, AC-C1-4, AC-C1-7, AC-C4-2, AC-C4-3 |

## 用途
公開記事本文を SEO 最適に表示。著者占い師への送客導線を持つ。

## 構造
- パンくず（BreadcrumbList JSON-LD, SEO-12）
- カテゴリ Badge
- タイトル（h1, Outfit/Noto Sans JP, text-balance）※任意で明朝アクセント可（design-requirements §4.4）
- メタ: 著者（Avatar + 占い師名リンク）、公開日（`<time>` JST）、更新日
- アイキャッチ（next/image, og:image）
- 本文（Tiptap 生成 HTML をサニタイズ表示, max-width 42rem, body-lg lh1.7, 見出し/リスト/リンク/画像）
- タグ群（Badge）
- 著者カード（占い師プロフィール要約 + 「この占い師に相談する」CTA → 予約リクエスト, AC-C4-2 送客）
- 関連記事（BlogCard グリッド、同カテゴリ/同著者）

## SEO（non-functional §2 と対応）
- Metadata API で title/description（著者上書き可, AC-C2-8）
- OGP（og:title/description/image=アイキャッチ/type=article/url）, Twitter summary_large_image
- JSON-LD `Article`（headline/author/datePublished/image, SEO-9）
- canonical, スラッグ不変（公開後）+ 変更時 301（SEO-16）

## Props
```
BlogDetailProps {
  post: { slug; title; contentHtml; thumbnailUrl?;
          category; tags: {slug;label}[];
          author: { slug; displayName; avatarUrl?; excerpt };
          publishedAt; updatedAt;
          seo?: { metaTitle?; metaDescription?; ogImageUrl? } };
  related: BlogCardProps[];
}
```

## レスポンシブ
- base: 本文100%（左右 padding）/ md+: 中央 42rem / lg+: 任意で目次サイドバー

## アクセシビリティ
- `<article>` + 見出し階層（h1=記事タイトル1つ）、`<time datetime>`
- 本文画像 alt、リンク識別可能（下線 + brand-orange-strong）
- ランドマーク、フォーカスリング navy

## セキュリティ
- 本文 HTML は許可タグホワイトリストでサニタイズ（SEC-5, XSS 対策）
