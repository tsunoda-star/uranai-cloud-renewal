# Component Spec — RichTextEditor (Tiptap)

| 項目 | 値 |
|------|-----|
| 名称 | RichTextEditor |
| ベース | Tiptap (@tiptap/react) — Client Component |
| 配置 | 記事投稿/編集（占い師ダッシュボード / 運営）、`/dashboard/posts/new`・`/edit` |
| 対応 AC | AC-C2-2, AC-C2-4, AC-C2-8 |

## 用途
占い師・運営が記事本文を WYSIWYG で執筆。

## 機能（ツールバー）
- 見出し（H2/H3）、太字/斜体/下線、リスト（順序付き/なし）、リンク挿入、引用、区切り線
- 画像挿入（アップロード → 安全ストレージ、ファイル種別/サイズ検証 SEC-9）
- 文字数カウント、下書き自動保存（任意）

## 連携フィールド（フォーム側）
- タイトル、スラッグ（自動生成 + 手動上書き）
- カテゴリ（1つ以上, Select）、タグ（複数, 入力 + 候補）
- アイキャッチアップロード
- ステータス（draft/published/scheduled）+ 予約公開日時（DatePicker, AC-C2-7）
- SEO 設定（メタタイトル/メタディスクリプション/OGP画像 任意上書き, AC-C2-8）

## Props
```
RichTextEditorProps {
  initialContent?: JSONContent;
  onChange: (content: JSONContent) => void;
  onImageUpload: (file: File) => Promise<{ url: string }>;
}
```

## 出力・保存
- 本文は Tiptap JSON + サニタイズ済み HTML を保存（表示時 SEC-5 サニタイズ）

## レスポンシブ
- ツールバーはモバイルで折りたたみ（オーバーフローメニュー）

## アクセシビリティ
- ツールバーボタンに `aria-label`、`aria-pressed`（トグル状態）
- キーボードショートカット + フォーカス管理、エディタ領域 `role="textbox" aria-multiline`
- 44px

## セキュリティ / 権限
- アクセスは FORTUNE_TELLER / ADMIN のみ（RBAC, AC-C2-1）
- 占い師は自記事のみ編集（AC-C2-10、サーバーで所有権検証 SEC-3）
- 画像アップロード検証（SEC-9）、本文サニタイズ（SEC-5）
