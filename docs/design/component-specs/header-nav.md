# Component Spec — Header / Nav

| 項目 | 値 |
|------|-----|
| 名称 | Header / Nav |
| ベース | shadcn NavigationMenu + Sheet（モバイル） |
| 配置 | 全ページ（sticky top） |
| 対応 AC | AC-A2-1 〜 AC-A2-5 |

## 用途
全ページ共通のグローバルナビゲーション。主要導線へ常時アクセス可能にする。

## 構造
- ロゴ（Outfit 700、navy / coral アクセント）→ トップへ
- 主要リンク: 「占い師を探す」`/advisors`、「鑑定を探す」`/services`、「ブログ」`/blog`
- 占い師向け導線「占い師として登録」`/register/advisor`（区別表示・brand-orange アウトライン）
- 右端: 未ログイン→「ログイン」`/login`（CC-Auth）/ ログイン時→ロール別マイページドロップダウン（Avatar + DropdownMenu）

## Props（設計）
```
HeaderProps {
  user?: { id, displayName, role: 'GENERAL'|'FORTUNE_TELLER'|'ADMIN', avatarUrl? }
}
```

## 状態
- 未ログイン: ログイン CTA
- 一般: マイページ / お気に入り / 予約リクエスト / ログアウト
- 占い師: ダッシュボード / 記事管理 / 予約管理 / ログアウト
- 運営: 管理 / ブログ管理 / ログアウト

## レスポンシブ
- base/md: ハンバーガー → Sheet で縦リンク群
- lg+: 水平メニュー

## スタイル
- 背景 surface（白）、下境界 border-decorative、sticky 時 shadow-sm
- アクティブリンク: brand-orange-strong テキスト + 下線

## アクセシビリティ
- `<header>` + `<nav aria-label="メインナビゲーション">`
- ハンバーガー `aria-expanded` / `aria-controls`、Sheet は Esc 閉・フォーカストラップ
- キーボード操作・スクリーンリーダー対応（AC-A2-5）
- タッチターゲット 44px

## モーション
- Sheet スライドイン 200ms（transform）、reduced-motion で即時表示

## 禁止
- 過剰シャドウ、グロー、Arial fallback
