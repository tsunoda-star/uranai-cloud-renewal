# Component Spec — FortuneTellerCard

| 項目 | 値 |
|------|-----|
| 名称 | FortuneTellerCard（占い師カード） |
| ベース | Card + Avatar + Badge |
| 配置 | 占い師一覧、トップのピックアップ、マッチング結果 |
| 対応 AC | AC-B1-1, AC-B1-4, AC-A1-5 |

## 用途
占い師を一覧カードで提示。

## 構造
- Avatar（写真 / アイコン、next/image）
- 名前（h3, Noto Sans JP 600）
- 得意占術タグ（Badge, brand-orange-pale 背景 + navy 文字、最大3 + 「+N」）
- 対応相談形式アイコン群（電話/チャット/メール/Zoom/対面、lucide + テキスト併記）
- 評価（Rating: brand-yellow 星 + 数値 tabular-nums、評価データ有時のみ）
- 簡潔な紹介（body sm, 2行 line-clamp）
- 遷移: `/advisors/{slug}`

## Props
```
FortuneTellerCardProps {
  slug; displayName; avatarUrl?;
  categories: { slug; label }[];
  consultationMethods: ('PHONE'|'CHAT'|'EMAIL'|'ZOOM'|'IN_PERSON')[];
  rating?: { average: number; count: number };
  excerpt: string;
}
```

## スタイル
- カード: 白, 角丸 2xl, border-decorative, shadow base→md(hover)
- 名前 navy、タグは pale 背景

## レスポンシブ
- 1 → 2(sm/md) → 3(lg) → 4(xl)

## アクセシビリティ
- Avatar に `alt="{名前}のプロフィール写真"`（装飾アイコンは空 alt）
- 評価は色のみに依存せず数値併記（A11Y-10）
- 相談形式はアイコン + テキスト
- カードリンク `aria-label`、44px、フォーカスリング navy

## 状態
- loading: Skeleton（同寸）/ 評価なし: 星非表示
