# Component Spec — MatchingForm (/match)

| 項目 | 値 |
|------|-----|
| 名称 | MatchingForm |
| ベース | Form (react-hook-form + zod) + RadioGroup + Select + Textarea |
| 配置 | `/match`（マッチング相談） |
| 対応 AC | AC-B6-1 〜 AC-B6-5 |

## 用途
初心者がどの占い師・占術が合うか分からない時、相談内容入力で適した占い師候補をルールベース提示。

## 構造（ステップ式 or 単一フォーム）
1. 悩みカテゴリ選択（恋愛/仕事/人間関係/金運/健康/その他 → 占術カテゴリへマッピング、Select or Chips）
2. 希望相談形式（電話/チャット/メール/Zoom/対面、RadioGroup or Checkbox 複数可）
3. 自由記述（Textarea、任意、サニタイズ・最大文字数）
4. 「占い師を提案してもらう」Button（brand-orange 塗り primary）

## マッチングロジック（MVP: ルールベース）
- 悩みカテゴリ→占術カテゴリ、希望相談形式、評価で AND/重み付けスコアリング
- 結果0件 → 人気占い師（評価/実績順）を代替提示（AC-B6-5）
- AI推薦は次フェーズ（NF-6、設計上の拡張余地として候補生成関数を抽象化）

## Props
```
MatchingFormProps {
  categories: { slug; label }[];
  onSubmit: (input: MatchingInput) => Promise<FortuneTellerCardProps[]>;
}
MatchingInput { concern: string; methods: ConsultationMethod[]; freeText?: string }
```

## 結果表示
- FortuneTellerCard グリッドで候補提示 → プロフィール / 予約リクエストへ遷移（AC-B6-4）

## レスポンシブ
- 中央1カラム、max 36rem

## アクセシビリティ
- 各入力に `label`、エラーは `aria-invalid`+`aria-describedby`、結果件数 `aria-live="polite"`
- RadioGroup/Checkbox はキーボード操作可、44px

## セキュリティ
- 自由記述はサニタイズ・文字数制限、送信にレート制限（SEC-10）

## 状態
- submitting: ボタン disabled + spinner / 結果 loading: Skeleton / 0件: 代替提案 EmptyState
