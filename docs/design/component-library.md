# Component Library — 占いクラウド リニューアル

| 項目 | 内容 |
|------|------|
| Phase | Phase 2: 設計 |
| ライブラリ | shadcn/ui + Tailwind CSS |
| アニメーション | motion/react |
| アイコン | lucide-react |
| バージョン | 1.0.0 |

---

## 1. 技術構成

| レイヤー | 採用 | 備考 |
|---------|------|------|
| プリミティブ | shadcn/ui（Radix ベース） | Button, Input, Select, Dialog, DropdownMenu, Tabs, Badge, Card, Avatar, Form, Toast, Pagination, Skeleton, Sheet（モバイルナビ）, RadioGroup, Checkbox, Textarea, Calendar/DatePicker |
| スタイリング | Tailwind CSS | デザイントークン経由（`tailwind.config.ts` に design-system.yml をマッピング） |
| クラス結合 | `cn`（clsx + tailwind-merge） | — |
| アニメーション | motion/react | 200ms 以下、transform/opacity のみ |
| アイコン | lucide-react | 占術モチーフ（星・月・手相等）は必要に応じカスタム SVG |
| リッチテキスト | Tiptap（@tiptap/react） | RichTextEditor（C-2）。WYSIWYG |
| フォーム | react-hook-form + zod | バリデーション・型安全 |

---

## 2. Tailwind トークンマッピング方針

`tailwind.config.ts` の `theme.extend` に design-system.yml の値を反映する（Phase 4 で生成）。

```
colors:
  brand: { navy, orange, 'orange-strong', 'orange-light', 'orange-pale', green, yellow, black }
  // shadcn の CSS 変数 (--background, --primary, --accent ...) は globals.css に :root / .dark で定義
fontFamily:
  heading: ['Outfit', 'Noto Sans JP', 'system-ui', 'sans-serif']
  body:    ['DM Sans', 'Noto Sans JP', 'system-ui', 'sans-serif']
borderRadius:
  base: '0.625rem'  // 10px
screens: { sm:640, md:768, lg:1024, xl:1280, '2xl':1536 }
```

> ブランド暖色は Tailwind の `brand.*` ネームスペースで直接、shadcn のセマンティックトークン（primary/secondary/muted/accent）は CSS 変数経由で適用。両者の二重管理を避けるため、CTA は `bg-brand-orange`、汎用 UI は shadcn の `Button variant` を使う。

---

## 3. コンポーネント分類

### 3.1 レイアウト / ナビゲーション

| コンポーネント | shadcn ベース | 仕様 |
|--------------|--------------|------|
| Header / Nav | NavigationMenu + Sheet | `component-specs/header-nav.md` |
| Footer | — | `component-specs/footer.md` |

### 3.2 ランディング

| コンポーネント | ベース | 仕様 |
|--------------|--------|------|
| Hero（+検索） | Input + Button | `component-specs/hero-search.md` |
| StatBand | Card | `component-specs/stat-band.md` |
| CategoryGrid / CategoryCard | Card | `component-specs/category-grid.md` |
| StepFlow（3ステップ） | — | ui-guidelines のリズム原則に従う |
| FortuneTellerCard（ピックアップ） | Card + Avatar + Badge | `component-specs/fortune-teller-card.md` |

### 3.3 カタログ

| コンポーネント | ベース | 仕様 |
|--------------|--------|------|
| FortuneTellerCard | Card + Avatar + Badge | `component-specs/fortune-teller-card.md` |
| ServiceCard | Card + Badge | `component-specs/service-card.md` |
| FilterPanel | Select + Checkbox + RadioGroup | spec.md §検索 と連動（URLクエリ同期） |
| MatchingForm（/match） | Form + RadioGroup + Textarea | `component-specs/matching-form.md` |
| BookingRequestForm | Form + Calendar + Textarea | `component-specs/booking-request-form.md` |
| EmptyState | — | 全リスト系で空/ロード/エラー状態 |

### 3.4 ブログ

| コンポーネント | ベース | 仕様 |
|--------------|--------|------|
| BlogCard | Card + Badge | `component-specs/blog-card.md` |
| BlogDetail | — | `component-specs/blog-detail.md` |
| RichTextEditor（Tiptap） | Tiptap | `component-specs/rich-text-editor.md` |

### 3.5 汎用

| コンポーネント | ベース | 用途 |
|--------------|--------|------|
| Badge / Tag | Badge | 占術タグ・相談形式・状態（pending/accepted...） |
| StatusBadge | Badge | 予約状態（色+アイコン+テキスト、A11Y-10） |
| Rating | カスタム + lucide Star | 評価表示（brand-yellow 星） |
| Pagination | Pagination | 一覧ページ送り |
| Toast | Toast (sonner) | 通知（予約状態変化等） |

---

## 4. 状態定義（全リスト系共通）

| 状態 | 表示 |
|------|------|
| loading | Skeleton カード（実カードと同寸） |
| empty | EmptyState（アイコン + 「該当する占い師がいません」+ 代替導線） |
| error | エラーメッセージ + 再試行ボタン（danger テキスト + 警告アイコン） |
| populated | カードグリッド |

---

## 5. 占術カテゴリ・相談形式の一元管理（MNT-2）

ドメイン値は `src/lib/constants.ts` に型・定数として一元管理（Phase 4）。

- 占術カテゴリ（15種）: タロット / 手相 / 四柱推命 / 九星気学 / 数秘 / 霊感 / 風水 / 人相 / 西洋占星術 / スピリチュアル / 算命 / 易 / 姓名判断 / 六星 / その他
- 相談形式（5種）: 電話 / チャット / メール / Zoom / 対面
- 予約状態（5種）: pending / accepted / rescheduled / declined / cancelled
- ブログステータス（4種）: draft / scheduled / published / archived

各値に表示ラベル・アイコン・カラートークンを紐付ける（StatusBadge 等で共通利用）。

---

*CCAGI SDK Phase 2 — Component Library / 占いクラウド リニューアル*
