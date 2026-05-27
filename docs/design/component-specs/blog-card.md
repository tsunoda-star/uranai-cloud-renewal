# Component Spec — BlogCard

| 項目 | 値 |
|------|-----|
| 名称 | BlogCard（ブログ記事カード） |
| ベース | Card + Badge |
| 配置 | ブログ一覧、カテゴリ/タグ別一覧、占い師プロフィール内記事一覧、関連記事 |
| 対応 AC | AC-C1-1, AC-C4-1 |

## 用途
公開ブログ記事を一覧カードで提示。

## 構造
- サムネイル（アイキャッチ, next/image, 16:9）
- カテゴリ Badge（pale + navy）
- タイトル（h3, Noto Sans JP 600, 2行 line-clamp）
- 抜粋（body sm, 2〜3行 line-clamp）
- 著者（Avatar 小 + 占い師名リンク → `/advisors/{slug}`、AC-C1-4 統合点）
- 公開日（sm text-muted, JST, tabular-nums）
- 遷移: `/blog/{slug}`

## Props
```
BlogCardProps {
  slug; title; excerpt; thumbnailUrl?;
  category: { slug; label };
  author: { slug; displayName; avatarUrl? };
  publishedAt: string; // JST
}
```

## スタイル
- カード 白, 角丸 2xl, shadow base→md(hover), サムネイル角丸上部 2xl

## レスポンシブ
- 1 → 2(sm/md) → 3(lg)

## アクセシビリティ
- サムネイル alt（装飾なら空）、タイトルリンク `aria-label`
- 日付は `<time datetime>`、44px、フォーカスリング navy

## 状態
- loading: Skeleton / サムネイルなし: プレースホルダ（pale 背景 + 占術アイコン）
