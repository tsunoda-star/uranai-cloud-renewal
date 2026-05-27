# Component Spec — BookingRequestForm

| 項目 | 値 |
|------|-----|
| 名称 | BookingRequestForm（予約リクエストフォーム） |
| ベース | Form (react-hook-form + zod) + Calendar/DatePicker + RadioGroup + Textarea |
| 配置 | 占い師プロフィール / サービス詳細の CTA から（モーダル or `/booking/new`） |
| 対応 AC | AC-B7-1 〜 AC-B7-2, AC-B5-3 |

## 用途
ログインユーザーが占い師/サービスへ予約リクエスト（意思表示）を送信。

## 構造
- 対象表示（占い師名 / サービス名・価格・所要時間。読み取り専用サマリー）
- 希望日時候補（Calendar + 時刻、複数候補可。最大3候補）
- 相談形式選択（対象がサポートする形式のみ RadioGroup）
- 相談概要（Textarea、必須、サニタイズ、最大文字数）
- 同意/注意文言（「決済・実鑑定は次フェーズ。本リクエストは相談の意思表示です」AC-B5-4/AC-B7-7）
- 送信 Button（brand-orange 塗り primary）

## Props
```
BookingRequestFormProps {
  target: { type: 'ADVISOR'|'SERVICE'; id; title; methods: ConsultationMethod[] };
  onSubmit: (input: BookingInput) => Promise<{ requestId: string }>;
}
BookingInput { preferredSlots: DateTime[]; method: ConsultationMethod; summary: string }
```

## 送信後
- 確認トースト + マイページの予約リクエスト一覧（状態 pending）へ誘導（AC-B7-2）

## バリデーション（zod）
- 希望日時 ≥1（未来日時）、相談形式 必須、相談概要 必須（1〜2000字）

## レスポンシブ
- base: 1カラム縦 / md+: 中央 max 40rem

## アクセシビリティ
- 全入力に label、Calendar はキーボード操作可、エラー `aria-invalid`/`aria-describedby`
- 注意文言は装飾でなくテキストで明示、送信後通知 `aria-live`
- 44px、フォーカスリング navy

## セキュリティ
- ログイン必須（CC-Auth）、所有/対象妥当性をサーバーで検証、レート制限（SEC-10）、概要サニタイズ（SEC-4）

## 状態
- 未ログイン: ログイン誘導 / submitting: disabled+spinner / error: danger テキスト + 再試行
