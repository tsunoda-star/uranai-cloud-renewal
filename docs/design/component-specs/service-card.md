# Component Spec — ServiceCard

| 項目 | 値 |
|------|-----|
| 名称 | ServiceCard（鑑定サービスカード） |
| ベース | Card + Badge |
| 配置 | 鑑定サービス一覧、占い師プロフィール内 |
| 対応 AC | AC-B2-1, AC-B2-3, AC-B5-* |

## 用途
鑑定サービスを比較検討可能なカードで提示。

## 構造
- タイトル（h3, Noto Sans JP 600）
- 提供占い師（Avatar 小 + 名前リンク → `/advisors/{slug}`）
- 占術カテゴリ Badge（pale + navy）
- 相談形式 Badge（電話/チャット/メール/Zoom/対面）
- 価格（Outfit 700 tabular-nums + 「円」）
- 所要時間（sm text-muted, tabular-nums + 「分」）
- 遷移: `/services/{id}`

## Props
```
ServiceCardProps {
  id; title; advisor: { slug; displayName; avatarUrl? };
  category: { slug; label };
  methods: ConsultationMethod[];
  priceJpy: number; durationMin: number;
}
```

## スタイル
- カード 白, 角丸 2xl, shadow base→md(hover)
- 価格を視覚的に強調（navy 太字、tabular-nums）

## レスポンシブ
- 1 → 2(sm/md) → 3(lg)

## アクセシビリティ
- 価格・所要時間に単位をテキストで明示
- 「予約リクエスト」CTA がカード or 詳細にあり 44px

## 注記
- 決済・実鑑定は次フェーズ。価格は保持・表示のみ（AC-B5-4 明示文言を詳細ページに）
