# Component Spec — Hero + 検索

| 項目 | 値 |
|------|-----|
| 名称 | Hero（検索付き） |
| ベース | Input + Button + (CategoryChips) |
| 配置 | トップページ ファーストビュー |
| 対応 AC | AC-A1-1, AC-B3-1, AC-A1-6 |

## 用途
サービス価値を一目で伝え、占い師探索へ即到達させる主役セクション。

## 構造
- キャッチコピー（display, Outfit 800 + Noto Sans JP）: 「あなたに合う占い師を見つけよう」
- サブコピー（body-lg, text-muted）
- 検索バー: キーワード Input + 検索 Button（brand-orange 塗り、白太字ラベル）
- 主CTA 2つ: 「占い師を探す」（brand-orange 塗り primary）/「無料で相談する」`/match`（outline secondary）
- カテゴリショートカット chips（人気占術へ）
- 右側（lg+）: 上品なビジュアル（占術モチーフの抽象イラスト／占い師写真コラージュ。グロー・紫グラデ禁止）

## Props
```
HeroProps {
  headline: string
  subcopy: string
  popularCategories: { slug, label }[]
}
```

## レスポンシブ
- base: 縦積み（コピー→検索→CTA→chips）、ビジュアル下 or 省略
- lg+: 左テキスト + 右ビジュアル横並び

## スタイル
- 背景: 白 → brand-orange-pale の控えめなセクション帯（グラデ無し）
- 角丸 3xl の大型パネル可、shadow は base まで

## アクセシビリティ
- h1 は1ページ1つ（このキャッチ）
- 検索フォーム `role="search"` + Input に `aria-label="占い師・鑑定を検索"`
- CTA は 44px、フォーカスリング navy

## モーション
- 初期表示で opacity+translateY フェードイン（≤200ms、stagger 60ms）、reduced-motion で無効

## 禁止
- 紫グラデ、グロー、過剰シャドウ、白文字 on brand-orange の小サイズ（ラベルは large/太字）
