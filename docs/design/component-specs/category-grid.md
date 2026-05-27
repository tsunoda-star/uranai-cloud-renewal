# Component Spec — CategoryGrid / CategoryCard

| 項目 | 値 |
|------|-----|
| 名称 | CategoryGrid / CategoryCard |
| ベース | Card |
| 配置 | トップ、検索/一覧の絞り込み入口 |
| 対応 AC | AC-A1-3, AC-B3-2 |

## 用途
15占術カテゴリをカードグリッドで提示。各カードから該当カテゴリの占い師一覧へ遷移。

## CategoryCard 構造
- 占術アイコン（lucide または占術モチーフ カスタムSVG）
- カテゴリ名（h4, Noto Sans JP 600）
- 件数（任意, sm text-muted, tabular-nums）
- 遷移先: `/advisors?category={slug}`

## Props
```
CategoryCardProps { slug; label; icon; advisorCount? }
CategoryGridProps { categories: CategoryCardProps[] }  // 15件
```

## スタイル
- カード: 白 surface, 角丸 2xl, border-decorative, shadow base→md(hover)
- アイコン背景: brand-orange-pale の円、アイコンは brand-orange-strong
- ホバー: translateY(-2px) 200ms

## レスポンシブ
- 1 → 2(sm) → 3(lg) → 4(xl/2xl)... 15件は最終列で折返し

## アクセシビリティ
- カード全体を `<a>` リンク化、`aria-label="{カテゴリ名}の占い師を探す"`
- アイコンは装飾 `aria-hidden`、件数はテキストで明示
- フォーカスリング navy、44px

## 禁止
- 紫グラデ背景、グロー、白文字 on 暖色塗りの小ラベル
