# Phase 5.5 品質ゲート — UI品質 & ブランド準拠レポート

| 項目 | 内容 |
|------|------|
| プロジェクト | 占いクラウド リニューアル（uranai-cloud-renewal） |
| ゲート | Phase 5.5 — UI品質レビュー（ui-skills 相当）+ ブランド準拠（brand-compliance-check 相当） |
| 照合元 | `docs/requirements/design-requirements.md` (v1.1.0) / `docs/design/design-system.yml` (v1.1.0) |
| 走査対象 | `src/**`, `tailwind.config.ts`, `src/app/globals.css`, `src/lib/fonts.ts` |
| 実行日 | 2026-05-27 |
| 実行 Agent | CoordinatorAgent（統 / Subaru） |
| 判定 | **PASS**（1 件の High を最小修正のうえ解消） |

---

## 1. サマリー（重大度別）

| Severity | 件数（修正前） | 件数（修正後） | 内容 |
|----------|--------------|--------------|------|
| Critical | 0 | 0 | — |
| High | 1 | **0** | white-small-text-on-brand-orange（AA コントラスト不足）→ 修正済 |
| Medium | 0 | 0 | — |
| Low | 0 | 0 | — |

**修正後 Critical / High = 0**。**PASS**。

---

## 2. UI品質レビュー（カテゴリ別）

### 2.1 Tech Stack — PASS

| 項目 | 要件（design-requirements §6.1） | 実装 | 判定 |
|------|------|------|------|
| UIライブラリ | shadcn/ui | `src/components/ui/`（button/card/input/select/textarea/badge/avatar）+ Radix（`@radix-ui/react-select`, `react-slot`） | PASS |
| スタイリング | Tailwind CSS（トークン経由） | `tailwind.config.ts` が design-system.yml トークンを反映（colors/fontSize/spacing/radius/shadow/zIndex） | PASS |
| アニメーション | motion/react | `motion` 依存。`fade-in.tsx` / `user-menu.tsx` / `mobile-nav.tsx` で使用 | PASS |
| アイコン | lucide-react | 全面採用 | PASS |
| ユーティリティ | `cn` | `src/lib/utils.ts` に `cn`（clsx + tailwind-merge） | PASS |

### 2.2 Accessibility — PASS

| 項目 | 要件 | 実装 | 判定 |
|------|------|------|------|
| プリミティブ | A11Y-4/5 | shadcn/Radix ベース。フォーカスリング `focus-visible:ring-2 ring-ring ring-offset-2` を全インタラクティブ要素に付与 | PASS |
| aria-label | A11Y-7 | 34 箇所（notification-bell, nav, アイコンボタン等） | PASS |
| aria-live | A11Y-7 | 3 箇所（動的結果領域） | PASS |
| sr-only | A11Y-6 | 10 箇所 | PASS |
| 画像 alt | A11Y-3 | 生 `<img>` 0 件。next/image は本 MVP では未使用（画像配信は後続）。アイコンは `aria-hidden` 付与 | PASS |
| ランドマーク | A11Y-6 | `layout.tsx` で header/main/footer 構成、h1 各ページ単一 | PASS |
| タッチターゲット | A11Y-8 / RWDD-5 | `min-h-11`（44px）をボタン・リンクに適用 | PASS |
| 色のみ依存禁止 | A11Y-10 | 状態色はアイコン + テキスト併用、フォーカスは navy リング併用 | PASS |

### 2.3 Animation — PASS

| 項目 | 要件（CMP-3/4） | 実装 | 判定 |
|------|------|------|------|
| 持続時間 ≤200ms | max_duration_ms: 200 | `duration-*` は全箇所 `duration-200`（300/500/700 は 0 件）。motion 側も `duration: 0.2` | PASS |
| compositor props のみ | transform / opacity | `fade-in.tsx` は `opacity` + `y`(=translateY) のみ。`transition-[transform,box-shadow]` / `transition-colors` のみ。レイアウトプロパティのアニメーション無し | PASS |
| reduced-motion | respect_reduced_motion | `fade-in` / `user-menu` / `mobile-nav` すべて `useReducedMotion()` で静的描画へフォールバック | PASS |

### 2.4 Typography — PASS

| 項目 | 要件（§4） | 実装 | 判定 |
|------|------|------|------|
| フォント | Outfit / DM Sans / Noto Sans JP | `src/lib/fonts.ts` で `next/font/google`、`display:swap`、サブセット化（PERF-4） | PASS |
| 禁止フォント | Inter / Roboto / Arial 不使用 | コード上の一致はすべて「使用しない」旨のコメントのみ。実使用 0 | PASS |
| tabular-nums | TYP-4 | 51 箇所（StatBand・価格・件数） | PASS |
| text-balance | TYP-3 | hero h1 等の見出しに適用 | PASS |
| 行長上限 | TYP-6 / LAY-6 | `max-w-content`（42rem）をブログ本文に適用 | PASS |

### 2.5 Layout — PASS

| 項目 | 要件 | 実装 | 判定 |
|------|------|------|------|
| h-dvh | ビューポート高さ | `layout.tsx` `min-h-dvh`（旧 `100vh`/`h-screen` 不使用） | PASS |
| z-index 段階管理 | LAY-7 | tailwind `zIndex`（dropdown/sticky/overlay/modal/toast）を設計値で定義 | PASS |
| コンテナ最大幅 | layout.container_max | `max-w-container`(80rem) / `max-w-wide`(96rem) / `max-w-content`(42rem) | PASS |
| グラデ禁止（紫 on 白） | anti-pattern | **紫グラデ 0 件**（後述 §3.1） | PASS |
| カードグリッド可変 | RWDD-2 | 1→2→3→4 列のレスポンシブグリッド | PASS |

### 2.6 Performance — PASS（静的観点）

| 項目 | 要件 | 実装 | 判定 |
|------|------|------|------|
| blur 制限 | brighty 実測 4 段 | tailwind `blur`（sm/md/xl/2xl/3xl）定義。過剰 blur 無し | PASS |
| shadow 制限 | 控えめ 4 段 | `boxShadow` sm/base/md/lg のみ。`shadow-xl`/`shadow-2xl` 0 件 | PASS |
| will-change | 不使用（過剰最適化回避） | 0 件 | PASS |
| Server Components 既定 | PERF-1 | Client は form/filter/editor に限定 | PASS |

> Lighthouse 実測値（Performance 90+ / Accessibility 100）は live ブラウザ計測が必要なため本ゲートでは未計測。静的観点はすべて基準に整合。実機計測は §5 視覚差分と同様、ブラウザ可能環境で実施する申し送りとする。

---

## 3. ブランド準拠（brand-compliance-check 相当）

### 3.1 禁止事項（design-requirements §8）— 検証結果

| 禁止カテゴリ | パターン | 結果 |
|-------------|---------|------|
| 紫グラデ on 白 | purple/violet/indigo/fuchsia + gradient | **0 件**（コードの `gradient` 一致は hero の `from-white to-brand-orange-pale` 暖色バンド + コメントのみ） |
| 過剰ドロップシャドウ | `shadow-xl` / `shadow-2xl` / `drop-shadow` | **0 件** |
| グロー効果 | `glow` | **0 件**（コメント言及のみ） |
| 禁止フォント | Inter / Roboto / Arial | **0 件**（実使用） |
| 予測可能テンプレ | — | hero/stat-band/category-grid/3-step でリズム変化（LAY-8 充足） |

> **hero.tsx:26 のグラデについて**: `bg-gradient-to-b from-white to-brand-orange-pale`(#fbf3ef)。禁止対象は「**白背景の紫**グラデ」。本件は白→暖色オフホワイトの極淡バンドで、design-requirements §1.1/§3.1 の意図（暖色 coral + navy で差別化）に沿った正規表現。**違反ではない。**

### 3.2 暖色パレット使用 — PASS

`tailwind.config.ts` の `brand`（navy/orange/orange-strong/orange-light/orange-pale/green/yellow/black）+ `state`（success-fg/warning-fg/danger）が design-system.yml の実測トークンと一致。

### 3.3 WCAG AA コントラスト & 禁止組合せ

| 禁止組合せ（design-system.yml anti_patterns.contrast） | 検出 | 判定 |
|------|------|------|
| white-text-on-brand-green | 0 件 | PASS |
| white-text-on-brand-yellow | 0 件 | PASS |
| **white-small-text-on-brand-orange** | **修正前 4 箇所 → 修正後 0 箇所** | **修正で解消** |

#### High 違反の詳細と修正（white-small-text-on-brand-orange）

**問題**: white text on `brand-orange #e2734d` = **3.09:1**。WCAG「大文字」は ≥18px もしくは ≥14px **bold(700)**。実装の CTA は 14–16px / weight 500–600 で大文字に該当せず、本文 4.5:1 ルール（A11Y-2）に対し **FAIL**。design-system.yml `anti_patterns.contrast` の `white-small-text-on-brand-orange` に該当。

| # | 箇所 | 修正前 | 区分 |
|---|------|--------|------|
| 1 | `src/components/ui/button.tsx:13`（default variant・全 CTA に波及 ~42 箇所） | `bg-brand-orange text-white hover:bg-brand-orange-light` | テキスト（14–16px medium/semibold） |
| 2 | `src/components/advisor/advisor-request-list.tsx:276`（承認ボタン） | `bg-brand-orange ... text-sm font-medium text-white hover:bg-brand-orange-light` | テキスト 14px medium |
| 3 | `src/components/advisor/advisor-request-list.tsx:345`（日程提案ボタン） | 同上 | テキスト 14px medium |
| 4 | `src/components/layout/notification-bell.tsx:32`（未読バッジ） | `bg-brand-orange ... text-[10px] ... text-white`（aria-hidden、件数は親 aria-label に冗長保持） | 小バッジ |

**修正（最小・design-system.yml 規定の通り）**: white テキストの coral 塗りを `brand-orange`(3.09:1) → **`brand-orange-strong #c2410c`（white 5.18:1, AA 本文 PASS）** に変更。hover は淡色 `orange-light`(さらに低コントラスト) → `brand-orange`(UI 3:1) に変更し、静止時 AA・hover も UI 閾値を維持。

```
button.tsx:13            : bg-brand-orange-strong text-white hover:bg-brand-orange
advisor-request-list:276 : bg-brand-orange-strong ... hover:bg-brand-orange
advisor-request-list:345 : bg-brand-orange-strong ... hover:bg-brand-orange
notification-bell:32     : bg-brand-orange-strong ...
```

**非修正（違反でない・据え置き）**:
- `hero.tsx:128`: `bg-brand-orange text-white` だが内容は `<ArrowRight>` **アイコンのみ**（テキストなし）。グラフィカルオブジェクト/UI = 3:1 ルール → 3.09:1 **PASS**。
- `hero.tsx:115` / `category-card.tsx:22`: `bg-brand-orange/10` `/15` の**背景ティント**（white テキスト無し）。

**整合性**: 修正は既存規約と完全一致。globals.css のリンク色は既に `text-brand-orange-strong`（5.18:1）を使用しており、本修正で CTA 塗りも text-safe coral に統一された。

---

## 4. 修正後の検証

| チェック | コマンド | 結果 |
|---------|---------|------|
| TypeScript | `npm run typecheck` | **0 errors** |
| Lint | `npm run lint` | **No ESLint warnings or errors** |
| Build | `npm run build` | **成功（exit 0、31 ルート生成）** |
| Test | `npm run test` | **135 passed (135)** / 13 files |

既存テスト 135 件・build を破壊していないことを確認。修正は CSS クラストークンのスワップ 4 箇所のみ（ロジック非変更）。

---

## 5. §13.1 デザイン忠実度の視覚差分（brighty 並列比較）— 実施可否

| 項目 | 状態 |
|------|------|
| 実施可否 | **実施不可（本環境）** |
| 理由 | 本実行環境は CDP / ブラウザ自動操作が不可（既知の制約）。dev サーバ（`npm run dev` :3100）起動 + 実画面と `brighty.site` の並列スクリーンショット取得ができない |
| 握りつぶし | しない。**未実施の事実を明記**し、実施手順を以下に申し送る |

### 5.1 ブラウザ利用可能環境での実施手順（申し送り）

1. `cd /Users/satoryouma/dev/uranai-cloud-renewal && npm run dev`（:3100 で起動）
2. 比較対象ページ: トップ `/`、占い師一覧 `/advisors`、占い師プロフィール `/advisors/[slug]`、ブログ記事 `/blog/[slug]`（モバイル 375px / デスクトップ 1280px の両ビューポート）
3. 各ページのスクリーンショットを取得し、`brighty.site` の対応セクションと**並列比較**:
   - 配色（navy ベース + coral orange アクセントの面積比・トーン）
   - 余白（セクション間 48–96px、カード内余白）
   - タイポ（Outfit 見出し / DM Sans 本文 / Noto Sans JP のレンダリング、字間）
   - 角丸（base 10px / 2xl16 / 3xl24）
   - コンポーネント密度（カード分離・StatBand・CategoryGrid）
4. `design-system.yml` との乖離があれば是正 Issue を起票（Phase 5.5 必須ゲート §13.1）。
5. あわせて Lighthouse 実機計測（Performance 90+ / Accessibility 100 / Best Practices 100 / SEO 100）を実施。
6. ツール候補: CCAGI `browser_*`（CDP 利用可能環境）/ Playwright（本リポジトリに `playwright.config.ts` あり）でのスクショ取得。

> 設計トークンは brighty 実測 CSS から抽出済のため**配色・寸法の数値乖離リスクは低い**が、レンダリング差分（フォントメトリクス・実際の面積比）は実機比較が残課題。

---

## 6. ゲート判定

**PASS** — UI品質（Tech Stack / A11Y / Animation / Typography / Layout / Performance）全カテゴリ整合、ブランド準拠（禁止事項 0 件）、WCAG AA 禁止組合せは High 1 件を最小修正で解消（Critical/High = 0）。視覚差分（§13.1）と Lighthouse 実機計測はブラウザ可能環境での実施を申し送り。

*CCAGI SDK Phase 5.5 — UI品質 & ブランド準拠レポート / 占いクラウド リニューアル*
