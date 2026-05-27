# Responsive Guidelines — 占いクラウド リニューアル

| 項目 | 内容 |
|------|------|
| Phase | Phase 2: 設計 |
| 基準 | モバイルファースト |
| 入力 | `design-requirements.md` §7, `non-functional.md` §5 |
| バージョン | 1.0.0 |

---

## 1. ブレークポイント（brighty 実測）

| 名称 | 幅 | 主対象 | グリッド列（カード） |
|------|-----|--------|-------------------|
| base | < 640px | スマートフォン（375px 基準で崩れなし） | 1 |
| sm | 640px | 大型スマートフォン | 2 |
| md | 768px | タブレット縦 | 2 |
| lg | 1024px | タブレット横・小型ノート | 3 |
| xl | 1280px | デスクトップ | 4 |
| 2xl | 1536px | 大型デスクトップ | 4（コンテナ 96rem） |

> コンテナ最大幅: 通常 80rem(1280px) / ワイドセクション 96rem(1536px) / ブログ本文 42rem。

---

## 2. コンポーネント別レスポンシブ挙動

| コンポーネント | base（モバイル） | md | lg / xl |
|--------------|----------------|-----|---------|
| Header / Nav | ハンバーガー（Sheet 展開） | ハンバーガー or 簡易 | 水平メニュー |
| Hero + 検索 | 縦積み（テキスト→検索→CTA） | 縦積み | 横並び（テキスト＋ビジュアル/検索） |
| StatBand | 2×2 グリッド | 横並び4 | 横並び4 |
| CategoryGrid | 1列（または 2列の小カード） | 2列 | 3列 → 4列（xl） |
| FortuneTellerCard グリッド | 1列 | 2列 | 3列 → 4列（xl） |
| ServiceCard グリッド | 1列 | 2列 | 3列 |
| FilterPanel | 折りたたみ（Sheet/Accordion） | サイドバー or 上部バー | 左サイドバー固定 |
| MatchingForm | 1カラム縦フロー | 1カラム（中央 max 36rem） | 1カラム（中央） |
| BookingRequestForm | 1カラム縦 | 1カラム（中央 max 40rem） | 1カラム（中央） |
| BlogCard グリッド | 1列 | 2列 | 3列 |
| BlogDetail | 本文 100%（左右 padding） | 本文中央 max 42rem | 本文中央 42rem + 目次サイドバー（任意） |
| Footer | 縦積みリンク群 | 2列 | 多列（4〜5列） |

---

## 3. レスポンシブルール

- [ ] RWDD-1: モバイルファーストで実装（Tailwind の base→`sm:`→`lg:` 上書き）。
- [ ] RWDD-2: カードグリッドは 1 → 2（sm/md）→ 3（lg）→ 4（xl）列で段階変化。
- [ ] RWDD-3: ヒーローはモバイル縦積み、デスクトップ横並びに再構成。
- [ ] RWDD-4: ナビはモバイルでハンバーガー（Sheet）、デスクトップで水平メニュー。
- [ ] RWDD-5: タッチターゲット 44px 以上（A11Y-8）。モバイルのボタンは min-h-11（44px）。
- [ ] RWDD-6: 375px で横スクロール・崩れなし（AC-A1-6）。`overflow-x` 抑止、画像 `max-w-full`。
- [ ] RWDD-7: 画像は `next/image` の `sizes` をブレークポイントに合わせて配信（PERF-3 / RWD-6）。
  - 例: 占い師カード写真 `sizes="(max-width:640px) 100vw, (max-width:1024px) 50vw, 25vw"`
- [ ] RWDD-8: セクション余白はモバイル 48px / デスクトップ 96px（`py-12 md:py-24` 目安）。
- [ ] RWDD-9: タッチ・マウス双方で操作性担保（ホバー依存の情報をモバイルで露出する）。

---

## 4. フォント・タイポのレスポンシブ

| 要素 | base | md | lg |
|------|------|-----|-----|
| Hero Title (display) | 2rem | 2.5rem | 3rem |
| H1 | 1.75rem | 2rem | 2.25rem |
| H2 | 1.375rem | 1.5rem | 1.75rem |
| 本文 | 1rem | 1rem | 1rem |
| ブログ本文 | 1rem | 1.125rem | 1.125rem |

`clamp()` 併用可（例: `clamp(2rem, 5vw, 3rem)`）。レイアウトシフト防止のため行間は固定スケール。

---

## 5. 検証

- 375 / 640 / 768 / 1024 / 1280 / 1536px で目視・Playwright スナップショット（Phase 5 E2E）。
- Lighthouse モバイル・デスクトップ両方で Performance 90+ / Accessibility 100。

---

*CCAGI SDK Phase 2 — Responsive Guidelines / 占いクラウド リニューアル*
